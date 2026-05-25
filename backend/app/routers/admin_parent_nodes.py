"""Admin-only parent_nodes (大節點) endpoints (W7a)."""
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import KnowledgeNode, ParentNode, Unit, User
from app.db.session import get_db
from app.schemas.parent_node import (
    BulkReorderRequest,
    CreateParentNodeRequest,
    ParentNodeBrief,
    UpdateParentNodeRequest,
)

router = APIRouter()


def _slug(s: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return out or uuid.uuid4().hex[:8]


def _to_brief(p: ParentNode) -> ParentNodeBrief:
    return ParentNodeBrief(
        id=p.id, unit_id=p.unit_id, code=p.code, name=p.name,
        description=p.description, display_order=p.display_order,
        prerequisites=list(p.prerequisites or []),
        created_at=p.created_at, updated_at=p.updated_at,
    )


@router.get("", response_model=list[ParentNodeBrief], response_model_by_alias=True)
async def list_parent_nodes(
    unit_id: str | None = Query(default=None, alias="unitId"),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ParentNodeBrief]:
    stmt = select(ParentNode)
    if unit_id is not None:
        stmt = stmt.where(ParentNode.unit_id == unit_id)
    stmt = stmt.order_by(ParentNode.unit_id, ParentNode.display_order, ParentNode.code)
    items = list((await db.execute(stmt)).scalars().all())
    return [_to_brief(p) for p in items]


@router.post("", response_model=ParentNodeBrief, response_model_by_alias=True,
             status_code=status.HTTP_201_CREATED)
async def create_parent_node(
    payload: CreateParentNodeRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ParentNodeBrief:
    if payload.unit_id and await db.get(Unit, payload.unit_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "UNIT_NOT_FOUND")
    # 檢查 (unit_id, code) 重複
    dup = await db.execute(
        select(ParentNode).where(
            ParentNode.unit_id == payload.unit_id,
            ParentNode.code == payload.code,
        ),
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "PARENT_CODE_EXISTS")

    # 取 id（若沒傳，從 unit_code + code slug 推導）
    if payload.id:
        new_id = payload.id
    else:
        unit_part = "noteunit"
        if payload.unit_id:
            u = await db.get(Unit, payload.unit_id)
            if u:
                unit_part = u.code
        new_id = f"pnode-{_slug(unit_part)}-{_slug(payload.code)}"[:64]

    if await db.get(ParentNode, new_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "PARENT_ID_EXISTS")

    # display_order：未指定時取同單元最大值 + 1
    if payload.display_order is None:
        max_order = (await db.execute(
            select(func.coalesce(func.max(ParentNode.display_order), 0))
            .where(ParentNode.unit_id == payload.unit_id),
        )).scalar() or 0
        order = int(max_order) + 1
    else:
        order = payload.display_order

    p = ParentNode(
        id=new_id, unit_id=payload.unit_id, code=payload.code,
        name=payload.name, description=payload.description,
        display_order=order,
        prerequisites=list(payload.prerequisites or []),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _to_brief(p)


@router.patch("/{parent_id}", response_model=ParentNodeBrief, response_model_by_alias=True)
async def update_parent_node(
    parent_id: str,
    payload: UpdateParentNodeRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ParentNodeBrief:
    p = await db.get(ParentNode, parent_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PARENT_NOT_FOUND")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is None and key not in {"unit_id", "description"}:
            continue
        if key == "prerequisites":
            setattr(p, key, list(value or []))
        else:
            setattr(p, key, value)
    await db.commit()
    await db.refresh(p)
    # 若 code 變了，同步更新 knowledge_nodes.parent_code cache
    if "code" in data:
        await db.execute(sa_update_kn_parent_code(p.id, data["code"], data.get("name", p.name)))
        await db.commit()
    return _to_brief(p)


def sa_update_kn_parent_code(parent_id: str, new_code: str, new_name: str):
    from sqlalchemy import update
    return update(KnowledgeNode).where(KnowledgeNode.parent_node_id == parent_id).values(
        parent_code=new_code, parent_name=new_name,
    )


@router.delete("/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_parent_node(
    parent_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    p = await db.get(ParentNode, parent_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PARENT_NOT_FOUND")
    # 檢查是否還有小節點掛在此 parent
    cnt = (await db.execute(
        select(func.count(KnowledgeNode.id)).where(KnowledgeNode.parent_node_id == parent_id),
    )).scalar() or 0
    if cnt > 0:
        raise HTTPException(status.HTTP_409_CONFLICT, f"PARENT_HAS_CHILDREN:{cnt}")
    await db.delete(p)
    await db.commit()


@router.post("/bulk-reorder", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_reorder(
    payload: BulkReorderRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """批次更新 display_order（拖曳結束 debounced 呼叫）。"""
    if not payload.items:
        return
    ids = [i.id for i in payload.items]
    stmt = select(ParentNode).where(ParentNode.id.in_(ids))
    nodes = {p.id: p for p in (await db.execute(stmt)).scalars().all()}
    for it in payload.items:
        p = nodes.get(it.id)
        if p is not None:
            p.display_order = it.display_order
    await db.commit()
