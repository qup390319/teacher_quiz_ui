"""Admin-only misconception update/delete (W5a).

新增走 POST /api/admin/knowledge-nodes/{node_id}/misconceptions（在 admin_knowledge_nodes router）。
這裡只負責個別 misconception 的 update / delete（不需要 node_id 即可定位）。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import Misconception, User
from app.db.session import get_db
from app.schemas.knowledge_node import MisconceptionBrief, UpdateMisconceptionRequest

router = APIRouter()


def _to_brief(m: Misconception) -> MisconceptionBrief:
    return MisconceptionBrief(
        id=m.id, node_id=m.node_id, label=m.label,
        detail=m.detail, student_detail=m.student_detail,
        confirm_question=m.confirm_question, source=m.source,
        is_default=m.is_default, owner_id=m.owner_id,
        display_order=m.display_order,
    )


@router.patch("/{misconception_id}", response_model=MisconceptionBrief, response_model_by_alias=True)
async def update_misconception(
    misconception_id: str,
    payload: UpdateMisconceptionRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MisconceptionBrief:
    m = await db.get(Misconception, misconception_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "MISCONCEPTION_NOT_FOUND")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is None and key not in {"detail", "student_detail", "confirm_question", "source"}:
            continue
        setattr(m, key, value)
    await db.commit()
    await db.refresh(m)
    return _to_brief(m)


@router.delete("/{misconception_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_misconception(
    misconception_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    m = await db.get(Misconception, misconception_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "MISCONCEPTION_NOT_FOUND")
    await db.delete(m)
    await db.commit()
