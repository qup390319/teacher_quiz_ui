"""Admin-only quiz endpoints (W6).

對應 /admin/sample-quizzes 頁面：列出所有教師題組（含 owner）+ 切換 is_sample。
寫入動作（建立 / 編輯）仍走教師端 /api/quizzes/*；admin 只負責標記。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import Quiz, Teacher, User
from app.db.session import get_db
from app.schemas.quiz import QuizBrief

router = APIRouter()


class AdminQuizBrief(QuizBrief):
    """擴充 QuizBrief，多帶 owner 教師資訊（給管理員清單用）。"""
    created_by_name: str | None = Field(default=None, serialization_alias="createdByName")

    model_config = ConfigDict(populate_by_name=True)


class ToggleSampleRequest(BaseModel):
    is_sample: bool = Field(validation_alias="isSample", serialization_alias="isSample")
    model_config = ConfigDict(populate_by_name=True)


@router.get("", response_model=list[AdminQuizBrief], response_model_by_alias=True)
async def list_all_quizzes(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminQuizBrief]:
    """跨教師列出所有題組（含 owner 姓名）。"""
    quizzes = list(
        (await db.execute(select(Quiz).order_by(Quiz.created_at.desc()))).scalars().all(),
    )
    # 預先撈所有 teacher 姓名
    teacher_ids = {q.created_by for q in quizzes if q.created_by}
    teacher_names: dict[str, str] = {}
    if teacher_ids:
        teachers = (await db.execute(
            select(Teacher).where(Teacher.user_id.in_(teacher_ids)),
        )).scalars().all()
        teacher_names = {t.user_id: t.name for t in teachers}

    return [
        AdminQuizBrief(
            id=q.id, title=q.title, status=q.status,
            knowledge_node_ids=q.knowledge_node_ids or [],
            question_count=len(q.questions),
            is_sample=q.is_sample,
            created_by=q.created_by,
            created_by_name=teacher_names.get(q.created_by) if q.created_by else None,
            created_at=q.created_at.date().isoformat() if q.created_at else "",
        )
        for q in quizzes
    ]


@router.patch("/{quiz_id}/sample", response_model=QuizBrief, response_model_by_alias=True)
async def toggle_sample(
    quiz_id: str,
    payload: ToggleSampleRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> QuizBrief:
    q = await db.get(Quiz, quiz_id)
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QUIZ_NOT_FOUND")
    q.is_sample = payload.is_sample
    await db.commit()
    await db.refresh(q)
    return QuizBrief(
        id=q.id, title=q.title, status=q.status,
        knowledge_node_ids=q.knowledge_node_ids or [],
        question_count=len(q.questions),
        is_sample=q.is_sample,
        created_by=q.created_by,
        created_at=q.created_at.date().isoformat() if q.created_at else "",
    )
