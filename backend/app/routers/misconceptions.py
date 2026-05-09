"""Custom misconceptions — per-teacher private extension to the static knowledge graph.

Each teacher only sees their own custom misconceptions; one teacher's additions are never
visible to another teacher (or to students). spec-04 §2.6 / spec-13 §9.
"""
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.db.models import CustomMisconception, User
from app.db.session import get_db
from app.schemas.custom_misconception import (
    CreateCustomMisconceptionRequest,
    CustomMisconceptionIO,
)

router = APIRouter()


# Allowed knowledge node IDs (must match src/data/knowledgeGraph.js).
# Hard-coded since the curriculum is fixed (12 nodes for 水溶液 unit).
_ALLOWED_NODE_IDS = {
    "INe-II-3-01", "INe-II-3-02", "INe-II-3-03", "INe-II-3-04", "INe-II-3-05",
    "INe-Ⅲ-5-1", "INe-Ⅲ-5-2", "INe-Ⅲ-5-3", "INe-Ⅲ-5-4",
    "INe-Ⅲ-5-5", "INe-Ⅲ-5-6", "INe-Ⅲ-5-7",
}


def _to_io(m: CustomMisconception) -> CustomMisconceptionIO:
    return CustomMisconceptionIO(
        id=m.id,
        node_id=m.node_id,
        label=m.label,
        detail=m.detail,
        student_detail=m.student_detail,
        confirm_question=m.confirm_question,
        created_at=m.created_at.date().isoformat() if m.created_at else "",
    )


@router.get("/custom", response_model=list[CustomMisconceptionIO], response_model_by_alias=True)
async def list_custom(
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[CustomMisconceptionIO]:
    """List the current teacher's own custom misconceptions only."""
    res = await db.execute(
        select(CustomMisconception)
        .where(CustomMisconception.teacher_id == teacher.id)
        .order_by(CustomMisconception.node_id, CustomMisconception.created_at),
    )
    return [_to_io(m) for m in res.scalars().all()]


@router.post(
    "/custom",
    response_model=CustomMisconceptionIO,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_custom(
    payload: CreateCustomMisconceptionRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> CustomMisconceptionIO:
    if payload.node_id not in _ALLOWED_NODE_IDS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"INVALID_NODE_ID: {payload.node_id} 不在 12 個合法知識節點之中",
        )
    new_id = f"cm-{int(time.time() * 1000)}-{teacher.id[:6]}"
    m = CustomMisconception(
        id=new_id,
        teacher_id=teacher.id,
        node_id=payload.node_id,
        label=payload.label,
        detail=payload.detail,
        student_detail=payload.student_detail,
        confirm_question=payload.confirm_question,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _to_io(m)


@router.delete("/custom/{custom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom(
    custom_id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    m = await db.get(CustomMisconception, custom_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CUSTOM_MISCONCEPTION_NOT_FOUND")
    if m.teacher_id != teacher.id:
        # Don't leak existence — return 404 for other teachers' records
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CUSTOM_MISCONCEPTION_NOT_FOUND")
    await db.delete(m)
    await db.commit()
