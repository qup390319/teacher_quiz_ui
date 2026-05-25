"""Public knowledge-node endpoints (W5a).

任何已登入使用者皆可讀（教師端 / 學生端 / 管理員端共用）。
寫入動作集中於 admin_knowledge_nodes router。
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import KnowledgeNode
from app.db.session import get_db
from app.schemas.knowledge_node import KnowledgeNodeDetail

router = APIRouter()


@router.get("", response_model=list[KnowledgeNodeDetail], response_model_by_alias=True)
async def list_nodes(
    unit_id: str | None = Query(default=None, alias="unitId"),
    grade_band: str | None = Query(default=None, alias="gradeBand"),
    include_misconceptions: bool = Query(default=True, alias="includeMisconceptions"),
    db: AsyncSession = Depends(get_db),
) -> list[KnowledgeNodeDetail]:
    """公開讀（不需 auth），讓前端可在 app boot 階段預載入 knowledge graph (W5b)。"""
    stmt = select(KnowledgeNode)
    if include_misconceptions:
        stmt = stmt.options(selectinload(KnowledgeNode.misconceptions))
    if unit_id is not None:
        stmt = stmt.where(KnowledgeNode.unit_id == unit_id)
    if grade_band is not None:
        stmt = stmt.where(KnowledgeNode.grade_band == grade_band)
    stmt = stmt.order_by(
        KnowledgeNode.parent_code.asc().nulls_last(),
        KnowledgeNode.learning_order.asc(),
        KnowledgeNode.id.asc(),
    )
    nodes = list((await db.execute(stmt)).scalars().all())
    result: list[KnowledgeNodeDetail] = []
    for n in nodes:
        misconceptions = n.misconceptions if include_misconceptions else []
        from app.routers.admin_knowledge_nodes import (
            _misconception_to_brief,
            _node_to_brief,
        )
        base = _node_to_brief(n)
        result.append(KnowledgeNodeDetail(
            **base.model_dump(by_alias=False),
            misconceptions=[_misconception_to_brief(m) for m in misconceptions],
        ))
    return result
