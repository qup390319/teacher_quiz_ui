"""Word docx 匯入端點 (W7b).

把 108 課綱「知識節點關聯圖」docx（或 zip 含多個 docx）解析為
unit + parent_nodes + knowledge_nodes 三層階層並寫入 DB。

兩個端點：
- POST /api/admin/units/import-docx/preview  dry-run，回傳解析結果
- POST /api/admin/units/import-docx           實際寫入
"""
import io
import re
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import KnowledgeNode, ParentNode, Unit, User
from app.db.session import get_db
from app.services.docx_import import DocxParseError, parse_docx, parse_docx_zip

router = APIRouter()

MAX_DOCX_SIZE = 4 * 1024 * 1024   # 單檔上限 4 MiB
MAX_ZIP_SIZE = 20 * 1024 * 1024   # zip 批次上限 20 MiB


# ─────────── Schemas ───────────
class ParsedChild(BaseModel):
    code: str
    name: str


class ParsedParent(BaseModel):
    code: str
    name: str
    children: list[ParsedChild]


class ParsedUnit(BaseModel):
    file_name: str | None = Field(
        default=None,
        validation_alias="fileName", serialization_alias="fileName",
    )
    unit_code: str | None = Field(
        default=None,
        validation_alias="unitCode", serialization_alias="unitCode",
    )
    unit_name: str | None = Field(
        default=None,
        validation_alias="unitName", serialization_alias="unitName",
    )
    parents: list[ParsedParent] = []
    error: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class DocxPreviewResponse(BaseModel):
    units: list[ParsedUnit]


class ImportResult(BaseModel):
    file_name: str | None = Field(default=None, serialization_alias="fileName")
    unit_code: str | None = Field(default=None, serialization_alias="unitCode")
    status: Literal["created", "skipped", "merged", "error"]
    units_added: int = Field(default=0, serialization_alias="unitsAdded")
    parents_added: int = Field(default=0, serialization_alias="parentsAdded")
    children_added: int = Field(default=0, serialization_alias="childrenAdded")
    message: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class DocxImportResponse(BaseModel):
    results: list[ImportResult]


# ─────────── helpers ───────────
def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "x"


async def _consume(file: UploadFile, limit: int) -> bytes:
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "FILE_TOO_LARGE",
        )
    return data


def _parse_one_or_many(content_type: str | None, data: bytes) -> list[dict]:
    """根據 content type 解析為一個 docx 或一批 zip 內 docx。"""
    ct = (content_type or "").lower()
    is_zip = "zip" in ct or data[:2] == b"PK" and not _looks_like_docx(data)
    is_docx = (
        "officedocument" in ct
        or ct.endswith(".docx")
        or _looks_like_docx(data)
    )
    # 優先看內容：docx 也是 zip 起頭，但內含 word/document.xml
    if _looks_like_docx(data):
        try:
            return [parse_docx(io.BytesIO(data))]
        except DocxParseError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if is_zip:
        try:
            return parse_docx_zip(io.BytesIO(data))
        except DocxParseError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if is_docx:
        try:
            return [parse_docx(io.BytesIO(data))]
        except DocxParseError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "INVALID_FILE_TYPE")


def _looks_like_docx(data: bytes) -> bool:
    """簡單探測：docx 是 zip，且內含 word/document.xml。"""
    if data[:2] != b"PK":
        return False
    try:
        import zipfile
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            return "word/document.xml" in z.namelist()
    except Exception:
        return False


# ─────────── endpoints ───────────
@router.post("/import-docx/preview", response_model=DocxPreviewResponse)
async def import_docx_preview(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
) -> DocxPreviewResponse:
    """Dry-run：解析 docx 或 zip，回傳結構不寫入 DB。"""
    data = await _consume(file, MAX_ZIP_SIZE)
    raw_units = _parse_one_or_many(file.content_type, data)
    units = [ParsedUnit(**u) for u in raw_units]
    return DocxPreviewResponse(units=units)


@router.post("/import-docx", response_model=DocxImportResponse)
async def import_docx(
    file: UploadFile = File(...),
    mode: Literal["create", "merge", "skip"] = Form(default="merge"),
    grade_band: Literal["lower", "middle", "upper"] = Form(default="upper", alias="gradeBand"),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> DocxImportResponse:
    """寫入 DB。

    mode:
      - create：unit code 已存在時回 error
      - skip：unit code 已存在時整份檔案跳過
      - merge（預設）：unit code 已存在時，新增缺漏的 parent_nodes 與 knowledge_nodes
                       既有節點不覆寫
    grade_band：所有新建 unit / knowledge_node 套用此年段（第三學習階段=upper）
    """
    data = await _consume(file, MAX_ZIP_SIZE)
    raw_units = _parse_one_or_many(file.content_type, data)

    results: list[ImportResult] = []
    for raw in raw_units:
        if raw.get("error"):
            results.append(ImportResult(
                file_name=raw.get("fileName"),
                unit_code=None,
                status="error",
                message=raw["error"],
            ))
            continue

        result = await _persist_one(db, raw, mode=mode, grade_band=grade_band)
        results.append(result)

    return DocxImportResponse(results=results)


async def _persist_one(
    db: AsyncSession, raw: dict, *, mode: str, grade_band: str,
) -> ImportResult:
    unit_code = (raw.get("unitCode") or "").strip()
    unit_name = (raw.get("unitName") or "").strip()
    parents = raw.get("parents", [])
    file_name = raw.get("fileName")

    if not unit_code or not unit_name:
        return ImportResult(
            file_name=file_name, unit_code=unit_code or None,
            status="error", message="UNIT_CODE_OR_NAME_MISSING",
        )

    # 找既有 unit
    existing = await db.execute(
        select(Unit).where(Unit.code == unit_code.lower()),
    )
    unit = existing.scalar_one_or_none()
    if unit is None:
        # 嘗試用原樣（保留大小寫）找一次
        existing = await db.execute(select(Unit).where(Unit.code == unit_code))
        unit = existing.scalar_one_or_none()

    units_added = 0
    parents_added = 0
    children_added = 0

    if unit is not None:
        if mode == "skip":
            return ImportResult(
                file_name=file_name, unit_code=unit_code, status="skipped",
                message=f"已存在 unit code={unit_code}，依設定 skip",
            )
        if mode == "create":
            return ImportResult(
                file_name=file_name, unit_code=unit_code, status="error",
                message=f"UNIT_CODE_EXISTS:{unit_code}",
            )
        # merge — 繼續往下處理
    else:
        # 建新 unit
        new_unit_id = f"unit-{_slug(unit_code)}"
        if await db.get(Unit, new_unit_id):
            return ImportResult(
                file_name=file_name, unit_code=unit_code, status="error",
                message=f"UNIT_ID_TAKEN:{new_unit_id}",
            )
        # display_order 取同 grade_band 最大 +1
        from sqlalchemy import func
        max_order = (await db.execute(
            select(func.coalesce(func.max(Unit.display_order), 0))
            .where(Unit.grade_band == grade_band),
        )).scalar() or 0
        unit = Unit(
            id=new_unit_id, code=_slug(unit_code), name=unit_name,
            grade_band=grade_band, display_order=int(max_order) + 1,
            status="active", is_system_current=False,
        )
        db.add(unit)
        await db.flush()
        units_added = 1

    # 處理 parent_nodes
    for p_order, p in enumerate(parents, start=1):
        p_code = p["code"].strip()
        p_name = p["name"].strip()
        if not p_code:
            continue
        # 找既有
        existing_p = (await db.execute(
            select(ParentNode).where(
                ParentNode.unit_id == unit.id,
                ParentNode.code == p_code,
            ),
        )).scalar_one_or_none()
        if existing_p is None:
            pn_id = f"pnode-{_slug(unit.code)}-{_slug(p_code)}"[:64]
            if await db.get(ParentNode, pn_id):
                # 撞 id，加 hash 避免
                from uuid import uuid4
                pn_id = f"{pn_id[:55]}-{uuid4().hex[:6]}"
            existing_p = ParentNode(
                id=pn_id, unit_id=unit.id, code=p_code, name=p_name,
                display_order=p_order,
            )
            db.add(existing_p)
            await db.flush()
            parents_added += 1

        # 處理 children
        for c_order, c in enumerate(p.get("children", []), start=1):
            c_code = c["code"].strip()
            c_name = c["name"].strip()
            if not c_code:
                continue
            existing_kn = await db.get(KnowledgeNode, c_code)
            if existing_kn is not None:
                # merge 模式：
                #   - 若節點已分配到別的 unit：完全不動（避免破壞既有結構）
                #   - 若節點未分配（unit_id NULL）：attach 到此 unit + parent_node
                if existing_kn.unit_id is None:
                    existing_kn.unit_id = unit.id
                    existing_kn.parent_node_id = existing_p.id
                    existing_kn.parent_code = p_code
                    existing_kn.parent_name = p_name
                    existing_kn.grade_band = grade_band
                    if not existing_kn.learning_order:
                        existing_kn.learning_order = c_order
                    children_added += 1
                continue
            kn = KnowledgeNode(
                id=c_code, unit_id=unit.id, grade_band=grade_band,
                parent_node_id=existing_p.id,
                parent_code=p_code, parent_name=p_name,
                name=c_name, learning_order=c_order, prerequisites=[],
                is_system_seed=False, on_canvas=False,
            )
            db.add(kn)
            children_added += 1

    await db.commit()

    return ImportResult(
        file_name=file_name, unit_code=unit_code,
        status="created" if units_added else "merged",
        units_added=units_added, parents_added=parents_added,
        children_added=children_added,
    )
