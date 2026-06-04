"""Admin-only unit management endpoints (W4).

對應 /admin/units 頁面。CRUD + archive/unarchive，並有「水溶液」防呆
（is_system_current=True 的單元不可封存或刪除）。
"""
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import ParentNode, Unit, UnitParentNode, User
from app.db.session import get_db
from app.schemas.unit import (
    CreateUnitRequest,
    GradeBand,
    UnitBrief,
    UnitParentNodeBrief,
    UnitStatus,
    UnitType,
    UpdateUnitRequest,
)
from app.schemas.unit_parent_node import (
    AttachParentNodesRequest,
    ReorderParentNodesRequest,
    UnitParentNodeRead,
)

router = APIRouter()


def _to_brief(
    u: Unit, parent_nodes: list[UnitParentNodeBrief] | None = None,
) -> UnitBrief:
    return UnitBrief(
        id=u.id, code=u.code, name=u.name,
        grade_band=u.grade_band, description=u.description,
        display_order=u.display_order, status=u.status,
        type=u.type,
        is_system_current=u.is_system_current,
        parent_nodes=parent_nodes or [],
        created_at=u.created_at, updated_at=u.updated_at,
    )


async def _parent_nodes_by_unit(
    db: AsyncSession, unit_ids: list[str],
) -> dict[str, list[UnitParentNodeBrief]]:
    """一支查詢撈回多個單元綁定的大節點，依 sort_order 分組。"""
    if not unit_ids:
        return {}
    stmt = (
        select(UnitParentNode.unit_id, ParentNode.id, ParentNode.code,
               ParentNode.name, UnitParentNode.sort_order)
        .join(ParentNode, ParentNode.id == UnitParentNode.parent_node_id)
        .where(UnitParentNode.unit_id.in_(unit_ids))
        .order_by(UnitParentNode.unit_id, UnitParentNode.sort_order, ParentNode.code)
    )
    grouped: dict[str, list[UnitParentNodeBrief]] = {}
    for unit_id, pid, code, name, sort_order in (await db.execute(stmt)).all():
        grouped.setdefault(unit_id, []).append(
            UnitParentNodeBrief(
                parent_node_id=pid, code=code, name=name, sort_order=sort_order,
            ),
        )
    return grouped


def _slugify(name: str) -> str:
    """非常輕量的 slug：保留小寫字母 / 數字，其他換為 hyphen。
    含 CJK 字元時 fallback 為 unit-{8-char-uuid}。
    """
    candidate = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    if not candidate:  # all CJK / symbols
        return uuid.uuid4().hex[:8]
    return candidate[:64]


async def _next_display_order(db: AsyncSession, grade_band: str) -> int:
    res = await db.execute(
        select(func.coalesce(func.max(Unit.display_order), 0))
        .where(Unit.grade_band == grade_band),
    )
    return int(res.scalar() or 0) + 1


@router.get("", response_model=list[UnitBrief], response_model_by_alias=True)
async def list_units(
    grade_band: GradeBand | None = Query(default=None, alias="gradeBand"),
    status_filter: UnitStatus | None = Query(default=None, alias="status"),
    type_filter: UnitType | None = Query(default=None, alias="type"),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UnitBrief]:
    stmt = select(Unit)
    if grade_band is not None:
        stmt = stmt.where(Unit.grade_band == grade_band)
    if status_filter is not None:
        stmt = stmt.where(Unit.status == status_filter)
    if type_filter is not None:
        stmt = stmt.where(Unit.type == type_filter)
    stmt = stmt.order_by(Unit.grade_band, Unit.display_order, Unit.id)
    units = list((await db.execute(stmt)).scalars().all())
    parents_map = await _parent_nodes_by_unit(db, [u.id for u in units])
    return [_to_brief(u, parents_map.get(u.id, [])) for u in units]


@router.post("", response_model=UnitBrief, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def create_unit(
    payload: CreateUnitRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UnitBrief:
    code = (payload.code or _slugify(payload.name)).strip().lower()
    # 確保 code 不重複
    existing = await db.execute(select(Unit).where(Unit.code == code))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "UNIT_CODE_EXISTS")

    new_id = f"unit-{code}"
    if await db.get(Unit, new_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "UNIT_ID_EXISTS")

    display_order = payload.display_order
    if display_order is None:
        display_order = await _next_display_order(db, payload.grade_band)

    unit = Unit(
        id=new_id, code=code, name=payload.name.strip(),
        grade_band=payload.grade_band,
        type=payload.type,
        description=(payload.description or None),
        display_order=display_order,
        status="active",
        is_system_current=False,
    )
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return _to_brief(unit)


@router.patch("/{unit_id}", response_model=UnitBrief, response_model_by_alias=True)
async def update_unit(
    unit_id: str,
    payload: UpdateUnitRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UnitBrief:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")
    data = payload.model_dump(exclude_unset=True)
    for key in ("name", "grade_band", "description", "display_order"):
        if key in data and data[key] is not None:
            setattr(unit, key, data[key])
    await db.commit()
    await db.refresh(unit)
    return _to_brief(unit)


@router.post("/{unit_id}/archive", response_model=UnitBrief, response_model_by_alias=True)
async def archive_unit(
    unit_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UnitBrief:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")
    if unit.is_system_current:
        raise HTTPException(status.HTTP_409_CONFLICT, "UNIT_IS_SYSTEM_CURRENT")
    if unit.status != "archived":
        unit.status = "archived"
        await db.commit()
        await db.refresh(unit)
    return _to_brief(unit)


@router.post("/{unit_id}/unarchive", response_model=UnitBrief, response_model_by_alias=True)
async def unarchive_unit(
    unit_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UnitBrief:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")
    if unit.status != "active":
        unit.status = "active"
        await db.commit()
        await db.refresh(unit)
    return _to_brief(unit)


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")
    if unit.is_system_current:
        raise HTTPException(status.HTTP_409_CONFLICT, "UNIT_IS_SYSTEM_CURRENT")
    await db.delete(unit)
    await db.commit()


# ---------- 教學單元 ↔ 大節點 M:N（spec-11 §3.21 unit_parent_nodes）----------

async def _hydrate_unit_parent_nodes(
    db: AsyncSession, unit_id: str,
) -> list[UnitParentNodeRead]:
    """回 sort_order 排序、含父節點與所屬次主題名稱。"""
    upn_stmt = (
        select(UnitParentNode, ParentNode, Unit)
        .join(ParentNode, ParentNode.id == UnitParentNode.parent_node_id)
        .outerjoin(Unit, Unit.id == ParentNode.unit_id)
        .where(UnitParentNode.unit_id == unit_id)
        .order_by(UnitParentNode.sort_order, ParentNode.code)
    )
    rows = (await db.execute(upn_stmt)).all()
    return [
        UnitParentNodeRead(
            parent_node_id=upn.parent_node_id,
            sort_order=upn.sort_order,
            code=p.code, name=p.name,
            subtheme_unit_id=u.id if u else None,
            subtheme_name=u.name if u else None,
            created_at=upn.created_at,
        )
        for upn, p, u in rows
    ]


@router.get(
    "/{unit_id}/parent-nodes",
    response_model=list[UnitParentNodeRead],
    response_model_by_alias=True,
)
async def list_unit_parent_nodes(
    unit_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UnitParentNodeRead]:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")
    return await _hydrate_unit_parent_nodes(db, unit_id)


@router.post(
    "/{unit_id}/parent-nodes",
    response_model=list[UnitParentNodeRead],
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def attach_parent_nodes(
    unit_id: str,
    payload: AttachParentNodesRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UnitParentNodeRead]:
    """Idempotent：重複 attach 同一個大節點不會報錯，只回最終清單。"""
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")

    # 驗證 parent_node 存在
    incoming = list(dict.fromkeys(payload.parent_node_ids))  # dedupe
    if incoming:
        found = (await db.execute(
            select(ParentNode.id).where(ParentNode.id.in_(incoming)),
        )).scalars().all()
        missing = set(incoming) - set(found)
        if missing:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"PARENT_NODE_NOT_FOUND:{','.join(sorted(missing))}",
            )

    # 取得目前 max sort_order
    max_order_res = await db.execute(
        select(func.coalesce(func.max(UnitParentNode.sort_order), -1))
        .where(UnitParentNode.unit_id == unit_id),
    )
    next_order = (max_order_res.scalar() or -1) + 1

    # 已存在的避免重複
    existing_ids = set(
        (await db.execute(
            select(UnitParentNode.parent_node_id)
            .where(UnitParentNode.unit_id == unit_id),
        )).scalars().all(),
    )

    for pid in incoming:
        if pid in existing_ids:
            continue
        db.add(UnitParentNode(
            unit_id=unit_id, parent_node_id=pid, sort_order=next_order,
        ))
        next_order += 1

    await db.commit()
    return await _hydrate_unit_parent_nodes(db, unit_id)


@router.delete(
    "/{unit_id}/parent-nodes/{parent_node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def detach_parent_node(
    unit_id: str,
    parent_node_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    row = await db.get(UnitParentNode, (unit_id, parent_node_id))
    if row is None:
        # idempotent — 不存在也視為成功（避免列舉攻擊）
        return
    await db.delete(row)
    await db.commit()


@router.put(
    "/{unit_id}/parent-nodes/reorder",
    response_model=list[UnitParentNodeRead],
    response_model_by_alias=True,
)
async def reorder_unit_parent_nodes(
    unit_id: str,
    payload: ReorderParentNodesRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UnitParentNodeRead]:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")

    rows = (await db.execute(
        select(UnitParentNode).where(UnitParentNode.unit_id == unit_id),
    )).scalars().all()
    by_id = {r.parent_node_id: r for r in rows}

    seen: set[str] = set()
    next_order = 0
    for pid in payload.parent_node_ids:
        r = by_id.get(pid)
        if r is None or pid in seen:
            continue
        seen.add(pid)
        r.sort_order = next_order
        next_order += 1

    # 未列出的維持相對順序排在後面
    leftover = [r for r in rows if r.parent_node_id not in seen]
    leftover.sort(key=lambda r: r.sort_order)
    for r in leftover:
        r.sort_order = next_order
        next_order += 1

    await db.commit()
    return await _hydrate_unit_parent_nodes(db, unit_id)
