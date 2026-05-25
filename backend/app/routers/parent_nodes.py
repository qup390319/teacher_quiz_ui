"""Public parent_nodes endpoint (W7a). 公開讀，任何訪客可用。"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ParentNode
from app.db.session import get_db
from app.schemas.parent_node import ParentNodeBrief

router = APIRouter()


@router.get("", response_model=list[ParentNodeBrief], response_model_by_alias=True)
async def list_public(
    unit_id: str | None = Query(default=None, alias="unitId"),
    db: AsyncSession = Depends(get_db),
) -> list[ParentNodeBrief]:
    stmt = select(ParentNode)
    if unit_id is not None:
        stmt = stmt.where(ParentNode.unit_id == unit_id)
    stmt = stmt.order_by(ParentNode.unit_id, ParentNode.display_order, ParentNode.code)
    items = list((await db.execute(stmt)).scalars().all())
    return [
        ParentNodeBrief(
            id=p.id, unit_id=p.unit_id, code=p.code, name=p.name,
            description=p.description, display_order=p.display_order,
            prerequisites=list(p.prerequisites or []),
            created_at=p.created_at, updated_at=p.updated_at,
        )
        for p in items
    ]
