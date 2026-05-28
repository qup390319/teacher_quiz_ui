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
from app.db.models import Unit, User
from app.db.session import get_db
from app.schemas.unit import (
    CreateUnitRequest,
    GradeBand,
    UnitBrief,
    UnitStatus,
    UnitType,
    UpdateUnitRequest,
)

router = APIRouter()


def _to_brief(u: Unit) -> UnitBrief:
    return UnitBrief(
        id=u.id, code=u.code, name=u.name,
        grade_band=u.grade_band, description=u.description,
        display_order=u.display_order, status=u.status,
        type=u.type,
        is_system_current=u.is_system_current,
        created_at=u.created_at, updated_at=u.updated_at,
    )


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
    return [_to_brief(u) for u in units]


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
