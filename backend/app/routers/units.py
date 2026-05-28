"""Public unit endpoints (W4).

任何已登入使用者皆可讀取（教師端 / 學生端 / 管理員端 共用）。
寫入動作集中在 admin_units router。
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.db.models import Unit, User
from app.db.session import get_db
from app.schemas.unit import GradeBand, UnitBrief, UnitType

router = APIRouter()


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
    return [
        UnitBrief(
            id=u.id, code=u.code, name=u.name,
            grade_band=u.grade_band, description=u.description,
            display_order=u.display_order, status=u.status,
            type=u.type,
            is_system_current=u.is_system_current,
            created_at=u.created_at, updated_at=u.updated_at,
        )
        for u in units
    ]
