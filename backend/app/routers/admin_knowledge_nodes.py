"""Admin-only knowledge-node + misconception endpoints (W5a)."""
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import require_admin
from app.db.models import KnowledgeNode, Misconception, Unit, User
from app.db.session import get_db
from app.schemas.knowledge_node import (
    BulkAssignUnitRequest,
    BulkPositionsRequest,
    BulkSetCanvasRequest,
    CreateMisconceptionRequest,
    CreateNodeRequest,
    KnowledgeNodeBrief,
    KnowledgeNodeDetail,
    MisconceptionBrief,
    UpdateNodeRequest,
)
from app.services.knowledge_node_import import (
    NodeExcelParseError,
    parse_nodes_xlsx,
)

router = APIRouter()

MAX_NODE_EXCEL_SIZE = 2 * 1024 * 1024  # 2 MiB


def _node_to_brief(n: KnowledgeNode) -> KnowledgeNodeBrief:
    return KnowledgeNodeBrief(
        id=n.id, unit_id=n.unit_id, grade_band=n.grade_band,
        parent_node_id=n.parent_node_id,
        parent_code=n.parent_code, parent_name=n.parent_name,
        name=n.name, description=n.description,
        video_title=n.video_title, video_url=n.video_url,
        teaching_strategy=n.teaching_strategy, student_hint=n.student_hint,
        learning_order=n.learning_order, prerequisites=list(n.prerequisites or []),
        canvas_x=n.canvas_x, canvas_y=n.canvas_y,
        is_system_seed=n.is_system_seed,
        on_canvas=n.on_canvas,
        created_at=n.created_at, updated_at=n.updated_at,
    )


def _misconception_to_brief(m: Misconception) -> MisconceptionBrief:
    return MisconceptionBrief(
        id=m.id, node_id=m.node_id, label=m.label,
        detail=m.detail, student_detail=m.student_detail,
        confirm_question=m.confirm_question,
        is_default=m.is_default, owner_id=m.owner_id,
        display_order=m.display_order,
    )


def _node_to_detail(n: KnowledgeNode) -> KnowledgeNodeDetail:
    base = _node_to_brief(n)
    return KnowledgeNodeDetail(
        **base.model_dump(by_alias=False),
        misconceptions=[_misconception_to_brief(m) for m in n.misconceptions],
    )


@router.get("", response_model=list[KnowledgeNodeDetail], response_model_by_alias=True)
async def list_nodes(
    unit_id: str | None = Query(default=None, alias="unitId"),
    unassigned: bool = Query(default=False, description="僅顯示尚未分配單元的節點"),
    grade_band: str | None = Query(default=None, alias="gradeBand"),
    on_canvas: bool | None = Query(default=None, alias="onCanvas",
                                     description="W5c：true=畫布上、false=節點庫；不傳=全部"),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[KnowledgeNodeDetail]:
    stmt = select(KnowledgeNode).options(selectinload(KnowledgeNode.misconceptions))
    if unassigned:
        stmt = stmt.where(KnowledgeNode.unit_id.is_(None))
    elif unit_id is not None:
        stmt = stmt.where(KnowledgeNode.unit_id == unit_id)
    if grade_band is not None:
        stmt = stmt.where(KnowledgeNode.grade_band == grade_band)
    if on_canvas is not None:
        stmt = stmt.where(KnowledgeNode.on_canvas.is_(on_canvas))
    stmt = stmt.order_by(
        KnowledgeNode.parent_code.asc().nulls_last(),
        KnowledgeNode.learning_order.asc(),
        KnowledgeNode.id.asc(),
    )
    nodes = list((await db.execute(stmt)).scalars().all())
    return [_node_to_detail(n) for n in nodes]


@router.get("/{node_id}", response_model=KnowledgeNodeDetail, response_model_by_alias=True)
async def get_node(
    node_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeNodeDetail:
    stmt = (
        select(KnowledgeNode)
        .where(KnowledgeNode.id == node_id)
        .options(selectinload(KnowledgeNode.misconceptions))
    )
    node = (await db.execute(stmt)).scalar_one_or_none()
    if node is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "NODE_NOT_FOUND")
    return _node_to_detail(node)


async def _check_unit_exists(db: AsyncSession, unit_id: str | None) -> None:
    if unit_id is None:
        return
    if await db.get(Unit, unit_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")


@router.post("", response_model=KnowledgeNodeBrief, response_model_by_alias=True,
             status_code=status.HTTP_201_CREATED)
async def create_node(
    payload: CreateNodeRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeNodeBrief:
    if await db.get(KnowledgeNode, payload.id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "NODE_ID_EXISTS")
    await _check_unit_exists(db, payload.unit_id)

    learning_order = payload.learning_order
    if learning_order is None:
        # 同單元同 parent_code 下取最大 learning_order + 1
        existing = await db.execute(
            select(KnowledgeNode.learning_order)
            .where(
                KnowledgeNode.unit_id == payload.unit_id,
                KnowledgeNode.parent_code == payload.parent_code,
            ),
        )
        orders = [r[0] for r in existing.all()]
        learning_order = (max(orders) + 1) if orders else 1

    node = KnowledgeNode(
        id=payload.id, unit_id=payload.unit_id,
        grade_band=payload.grade_band,
        parent_code=payload.parent_code, parent_name=payload.parent_name,
        name=payload.name, description=payload.description,
        video_title=payload.video_title, video_url=payload.video_url,
        teaching_strategy=payload.teaching_strategy,
        student_hint=payload.student_hint,
        learning_order=learning_order,
        prerequisites=list(payload.prerequisites or []),
        is_system_seed=False,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return _node_to_brief(node)


@router.patch("/{node_id}", response_model=KnowledgeNodeBrief, response_model_by_alias=True)
async def update_node(
    node_id: str,
    payload: UpdateNodeRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeNodeBrief:
    node = await db.get(KnowledgeNode, node_id)
    if node is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "NODE_NOT_FOUND")
    data = payload.model_dump(exclude_unset=True)
    if "unit_id" in data:
        await _check_unit_exists(db, data["unit_id"])
    for key, value in data.items():
        if value is None and key not in {"unit_id", "description", "video_title",
                                         "video_url", "parent_code", "parent_name",
                                         "teaching_strategy", "student_hint"}:
            continue
        setattr(node, key, value if key != "prerequisites" else list(value or []))
    await db.commit()
    await db.refresh(node)
    return _node_to_brief(node)


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    node = await db.get(KnowledgeNode, node_id)
    if node is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "NODE_NOT_FOUND")
    if node.is_system_seed:
        raise HTTPException(status.HTTP_409_CONFLICT, "NODE_IS_SYSTEM_SEED")
    await db.delete(node)
    await db.commit()


@router.post("/bulk-positions", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_update_positions(
    payload: BulkPositionsRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """批次更新節點畫布座標（拖曳結束時 debounced 呼叫）。"""
    ids = [p.id for p in payload.positions]
    if not ids:
        return
    stmt = select(KnowledgeNode).where(KnowledgeNode.id.in_(ids))
    nodes = {n.id: n for n in (await db.execute(stmt)).scalars().all()}
    for pos in payload.positions:
        n = nodes.get(pos.id)
        if n is not None:
            n.canvas_x = pos.x
            n.canvas_y = pos.y
    await db.commit()


@router.post("/bulk-set-canvas", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_set_canvas(
    payload: BulkSetCanvasRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """加入畫布 / 從畫布移除（W5c）。

    on_canvas=true：把節點加到畫布；若已有座標保留，否則 NULL 走自動排版。
    on_canvas=false：把節點移回節點庫；節點資料與既有座標保留不動。
    """
    if not payload.node_ids:
        return
    stmt = select(KnowledgeNode).where(KnowledgeNode.id.in_(payload.node_ids))
    nodes = list((await db.execute(stmt)).scalars().all())
    for n in nodes:
        n.on_canvas = payload.on_canvas
    await db.commit()


@router.post("/bulk-assign-unit", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_assign_unit(
    payload: BulkAssignUnitRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """批次把多個節點指派到同一個單元（或 None 表示移回未分配）。"""
    await _check_unit_exists(db, payload.unit_id)
    if not payload.node_ids:
        return
    stmt = select(KnowledgeNode).where(KnowledgeNode.id.in_(payload.node_ids))
    nodes = list((await db.execute(stmt)).scalars().all())
    for n in nodes:
        n.unit_id = payload.unit_id
    await db.commit()


# --- Excel 匯入 ---
@router.post("/import-excel/preview")
async def import_excel_preview(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),  # noqa: ARG001
) -> dict:
    """Dry-run：解析 Excel 並回傳預覽資料，不寫入 DB。"""
    if file.content_type not in {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        None, "",
    }:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "INVALID_FILE_TYPE")
    data = await file.read(MAX_NODE_EXCEL_SIZE + 1)
    if len(data) > MAX_NODE_EXCEL_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "FILE_TOO_LARGE")
    try:
        rows = parse_nodes_xlsx(io.BytesIO(data))
    except NodeExcelParseError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    # 統計依 grade_band 和 parent_code 分組
    by_band: dict[str, int] = {}
    by_parent: dict[str, dict] = {}
    for r in rows:
        by_band[r["grade_band"]] = by_band.get(r["grade_band"], 0) + 1
        key = r["parent_code"] or "(無)"
        if key not in by_parent:
            by_parent[key] = {
                "parentCode": r["parent_code"],
                "parentName": r["parent_name"],
                "gradeBand": r["grade_band"],
                "count": 0,
            }
        by_parent[key]["count"] += 1
    return {
        "rows": rows,
        "total": len(rows),
        "byGradeBand": by_band,
        "byParent": list(by_parent.values()),
    }


@router.post("/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """從 Excel 匯入節點。所有節點以 unit_id=NULL 進入「未分配」池，admin 之後再批次指派單元。
    既有 id 略過（idempotent），但會 log 跳過數。
    """
    if file.content_type not in {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        None, "",
    }:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "INVALID_FILE_TYPE")
    data = await file.read(MAX_NODE_EXCEL_SIZE + 1)
    if len(data) > MAX_NODE_EXCEL_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "FILE_TOO_LARGE")
    try:
        rows = parse_nodes_xlsx(io.BytesIO(data))
    except NodeExcelParseError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    inserted = 0
    skipped = 0
    for r in rows:
        if await db.get(KnowledgeNode, r["id"]) is not None:
            skipped += 1
            continue
        db.add(KnowledgeNode(
            id=r["id"], unit_id=None,
            grade_band=r["grade_band"],
            parent_code=r["parent_code"], parent_name=r["parent_name"],
            name=r["name"],
            video_title=r["video_title"], video_url=r["video_url"],
            learning_order=0, prerequisites=[],
            is_system_seed=False,
        ))
        inserted += 1
    await db.commit()
    return {"inserted": inserted, "skipped": skipped, "total": len(rows)}


# --- Misconceptions ---
@router.post("/{node_id}/misconceptions", response_model=MisconceptionBrief,
             response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def create_misconception(
    node_id: str,
    payload: CreateMisconceptionRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MisconceptionBrief:
    node = await db.get(KnowledgeNode, node_id)
    if node is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "NODE_NOT_FOUND")
    if await db.get(Misconception, payload.id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "MISCONCEPTION_ID_EXISTS")

    display_order = payload.display_order
    if display_order is None:
        # 取該節點下最大 display_order + 1
        rows = (await db.execute(
            select(Misconception.display_order).where(Misconception.node_id == node_id),
        )).all()
        orders = [r[0] for r in rows]
        display_order = (max(orders) + 1) if orders else 1

    m = Misconception(
        id=payload.id, node_id=node_id,
        label=payload.label, detail=payload.detail,
        student_detail=payload.student_detail, confirm_question=payload.confirm_question,
        is_default=True, display_order=display_order,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _misconception_to_brief(m)
