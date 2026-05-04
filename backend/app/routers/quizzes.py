"""Quiz CRUD with nested questions / options."""
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_teacher
from app.db.models import Assignment, Quiz, QuizOption, QuizQuestion, Student, User
from app.db.session import get_db
from app.schemas.quiz import (
    QuizBrief,
    QuizDetail,
    QuizOptionIO,
    QuizQuestionIO,
    QuizSaveRequest,
)

router = APIRouter()


def _to_brief(q: Quiz) -> QuizBrief:
    return QuizBrief(
        id=q.id,
        title=q.title,
        status=q.status,
        knowledge_node_ids=q.knowledge_node_ids or [],
        question_count=len(q.questions),
        created_at=q.created_at.date().isoformat() if q.created_at else "",
    )


def _to_detail(q: Quiz) -> QuizDetail:
    return QuizDetail(
        id=q.id,
        title=q.title,
        status=q.status,
        knowledge_node_ids=q.knowledge_node_ids or [],
        question_count=len(q.questions),
        created_at=q.created_at.date().isoformat() if q.created_at else "",
        questions=[
            QuizQuestionIO(
                id=qq.order_index,
                stem=qq.stem,
                knowledge_node_id=qq.knowledge_node_id,
                options=[
                    QuizOptionIO(tag=opt.tag, content=opt.content, diagnosis=opt.diagnosis)
                    for opt in sorted(qq.options, key=lambda o: o.tag)
                ],
            )
            for qq in sorted(q.questions, key=lambda x: x.order_index)
        ],
    )


@router.get("", response_model=list[QuizBrief], response_model_by_alias=True)
async def list_quizzes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[QuizBrief]:
    """Teachers see all quizzes; students see only quizzes assigned to their class."""
    stmt = select(Quiz).order_by(Quiz.created_at.desc())
    if user.role == "student":
        student = await db.get(Student, user.id)
        if student is None:
            return []
        assigned_ids_res = await db.execute(
            select(Assignment.quiz_id).where(
                Assignment.class_id == student.class_id,
                Assignment.quiz_id.is_not(None),
            ),
        )
        assigned_ids = {qid for (qid,) in assigned_ids_res.all() if qid}
        if not assigned_ids:
            return []
        stmt = stmt.where(Quiz.id.in_(assigned_ids))
    res = await db.execute(stmt)
    return [_to_brief(q) for q in res.scalars().all()]


@router.get("/{quiz_id}", response_model=QuizDetail, response_model_by_alias=True)
async def get_quiz(
    quiz_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizDetail:
    q = await db.get(Quiz, quiz_id)
    if q is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QUIZ_NOT_FOUND")
    # Students may only fetch quizzes that have been assigned to their class.
    if user.role == "student":
        student = await db.get(Student, user.id)
        if student is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "QUIZ_NOT_ASSIGNED")
        res = await db.execute(
            select(Assignment.id).where(
                Assignment.quiz_id == quiz_id,
                Assignment.class_id == student.class_id,
            ).limit(1),
        )
        if res.scalar_one_or_none() is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "QUIZ_NOT_ASSIGNED")
    return _to_detail(q)


async def _replace_questions_options(db: AsyncSession, quiz: Quiz, payload_questions: list[QuizQuestionIO]) -> None:
    """Wipe existing questions+options, recreate from payload. Simpler than diffing."""
    for qq in list(quiz.questions):
        await db.delete(qq)  # cascade removes options
    await db.flush()
    for q_in in payload_questions:
        qq = QuizQuestion(
            quiz_id=quiz.id,
            order_index=q_in.id,
            stem=q_in.stem,
            knowledge_node_id=q_in.knowledge_node_id,
        )
        db.add(qq)
        await db.flush()
        for opt in q_in.options:
            db.add(QuizOption(
                question_id=qq.id, tag=opt.tag,
                content=opt.content, diagnosis=opt.diagnosis,
            ))


@router.post("", response_model=QuizDetail, status_code=status.HTTP_201_CREATED, response_model_by_alias=True)
async def create_quiz(
    payload: QuizSaveRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizDetail:
    quiz_id = payload.id or f"quiz-{int(time.time() * 1000)}"
    if await db.get(Quiz, quiz_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "QUIZ_ID_EXISTS")
    quiz = Quiz(
        id=quiz_id,
        title=payload.title,
        status=payload.status,
        knowledge_node_ids=payload.knowledge_node_ids,
        created_by=teacher.id,
    )
    db.add(quiz)
    await db.flush()
    await _replace_questions_options(db, quiz, payload.questions)
    await db.commit()
    await db.refresh(quiz)
    return _to_detail(quiz)


@router.put("/{quiz_id}", response_model=QuizDetail, response_model_by_alias=True)
async def update_quiz(
    quiz_id: str,
    payload: QuizSaveRequest,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizDetail:
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QUIZ_NOT_FOUND")
    quiz.title = payload.title
    quiz.status = payload.status
    quiz.knowledge_node_ids = payload.knowledge_node_ids
    await _replace_questions_options(db, quiz, payload.questions)
    await db.commit()
    await db.refresh(quiz)
    return _to_detail(quiz)


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    quiz = await db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QUIZ_NOT_FOUND")
    await db.delete(quiz)
    await db.commit()
