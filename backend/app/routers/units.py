"""Public unit endpoints (W4).

任何已登入使用者皆可讀取（教師端 / 學生端 / 管理員端 共用）。
寫入動作集中在 admin_units router。
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.db.models import ParentNode, Unit, UnitParentNode, User
from app.db.session import get_db
from app.schemas.unit import GradeBand, UnitBrief, UnitParentNodeBrief, UnitType

router = APIRouter()


async def _parent_nodes_by_unit(
    db: AsyncSession, unit_ids: list[str],
) -> dict[str, list[UnitParentNodeBrief]]:
    """一支查詢撈回多個教學單元綁定的大節點（unit_parent_nodes），依 sort_order 分組。

    教學單元（type='unit'）與知識節點的關聯走 unit_parent_nodes → parent_nodes，
    而非 knowledge_nodes.unit_id（後者指向次主題）。教師端出題選單元後，
    需靠此處回傳的 parentNodes 反查該單元底下的知識節點。
    """
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


@router.get("", response_model=list[UnitBrief], response_model_by_alias=True)
async def list_units(
    grade_band: GradeBand | None = Query(default=None, alias="gradeBand"),
    include_archived: bool = Query(default=False, alias="includeArchived"),
    type_filter: UnitType | None = Query(default=None, alias="type"),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UnitBrief]:
    stmt = select(Unit)
    if grade_band is not None:
        stmt = stmt.where(Unit.grade_band == grade_band)
    if not include_archived:
        stmt = stmt.where(Unit.status == "active")
    if type_filter is not None:
        stmt = stmt.where(Unit.type == type_filter)
    stmt = stmt.order_by(Unit.grade_band, Unit.display_order, Unit.id)
    units = list((await db.execute(stmt)).scalars().all())
    parents = await _parent_nodes_by_unit(db, [u.id for u in units])
    return [
        UnitBrief(
            id=u.id, code=u.code, name=u.name,
            grade_band=u.grade_band, description=u.description,
            display_order=u.display_order, status=u.status,
            type=u.type,
            is_system_current=u.is_system_current,
            parent_nodes=parents.get(u.id, []),
            created_at=u.created_at, updated_at=u.updated_at,
        )
        for u in units
    ]
