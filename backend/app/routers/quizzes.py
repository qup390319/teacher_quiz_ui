"""Quiz CRUD with nested questions / options."""
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_teacher
from app.db.models import (
    Assignment,
    Quiz,
    QuizOption,
    QuizQuestion,
    Student,
    StudentAnswer,
    User,
)
from app.db.session import get_db
from app.schemas.quiz import (
    QuizBrief,
    QuizDetail,
    QuizOptionIO,
    QuizQuestionIO,
    QuizReasonOptionIO,
    QuizSaveRequest,
)

router = APIRouter()


def _to_brief(q: Quiz) -> QuizBrief:
    return QuizBrief(
        id=q.id,
        title=q.title,
        status=q.status,
        mode=q.mode or "single",
        knowledge_node_ids=q.knowledge_node_ids or [],
        question_count=len(q.questions),
        is_sample=q.is_sample,
        created_by=q.created_by,
        created_at=q.created_at.date().isoformat() if q.created_at else "",
    )


def _to_detail(q: Quiz) -> QuizDetail:
    return QuizDetail(
        id=q.id,
        title=q.title,
        status=q.status,
        mode=q.mode or "single",
        knowledge_node_ids=q.knowledge_node_ids or [],
        question_count=len(q.questions),
        created_at=q.created_at.date().isoformat() if q.created_at else "",
        questions=[
            QuizQuestionIO(
                id=qq.order_index,
                stem=qq.stem,
                knowledge_node_id=qq.knowledge_node_id,
                mode="two-tier" if qq.reason_options else (q.mode or "single"),
                options=[
                    QuizOptionIO(tag=opt.tag, content=opt.content, diagnosis=opt.diagnosis)
                    for opt in sorted(qq.options, key=lambda o: o.tag)
                ],
                reason_options=[
                    QuizReasonOptionIO(
                        tag=r["tag"], content=r["content"],
                        diagnosis=r["diagnosis"], answer_tag=r.get("answerTag"),
                    )
                    for r in qq.reason_options
                ] if qq.reason_options else None,
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


async def _upsert_questions_options(
    db: AsyncSession, quiz: Quiz, payload_questions: list[QuizQuestionIO],
) -> None:
    """Smart diff: UPDATE existing questions in-place (matched by order_index),
    INSERT new ones, DELETE removed ones (only if they have no student answers).

    Why match/update by order_index instead of wipe-and-recreate? Students reference
    questions by 卷內題序 `order_index` (student_answers.question_id 存 order_index，
    見 spec-11 §3.11)。In-place update keeps each question's order_index stable, so
    existing answers stay correctly aligned; and we refuse to delete a question that
    already has answers (QUESTION_HAS_ANSWERS, 409) to avoid orphaning them.

    Options have no inbound references, so they are still wipe-and-recreate per
    question (simpler than diffing tag-by-tag).
    """
    # Load existing questions (already populated via lazy="selectin" on Quiz.questions
    # but we re-read here to be safe within this transaction).
    res = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id),
    )
    existing = list(res.scalars().all())
    existing_by_order = {q.order_index: q for q in existing}
    payload_orders = {q_in.id for q_in in payload_questions}

    # 1) Detect removed questions and ensure none have student answers.
    # student_answers.question_id 存的是卷內題序 order_index（非 quiz_questions PK，
    # 且無外鍵），故以「本題組的 assignment × order_index」反查是否已有人作答。
    # spec-11 §3.11。
    removed = [q for q in existing if q.order_index not in payload_orders]
    if removed:
        removed_orders = [q.order_index for q in removed]
        ans_res = await db.execute(
            select(StudentAnswer.id)
            .join(Assignment, Assignment.id == StudentAnswer.assignment_id)
            .where(
                Assignment.quiz_id == quiz.id,
                StudentAnswer.question_id.in_(removed_orders),
            )
            .limit(1),
        )
        if ans_res.scalar_one_or_none() is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "QUESTION_HAS_ANSWERS: 部分要刪除的題目已有學生作答，無法刪除。"
                "請改為修改題目內容，或建立新版本題組。",
            )

    # 2) UPDATE existing or INSERT new for each payload question
    for q_in in payload_questions:
        # two-tier 理由選項存成 JSONB（list[dict]）；single 題為 None。
        reason_json = (
            [r.model_dump(by_alias=True) for r in q_in.reason_options]
            if q_in.reason_options else None
        )
        existing_q = existing_by_order.get(q_in.id)
        if existing_q is not None:
            existing_q.stem = q_in.stem
            existing_q.knowledge_node_id = q_in.knowledge_node_id
            existing_q.reason_options = reason_json
            await db.execute(
                delete(QuizOption).where(QuizOption.question_id == existing_q.id),
            )
            await db.flush()
            for opt in q_in.options:
                db.add(QuizOption(
                    question_id=existing_q.id, tag=opt.tag,
                    content=opt.content, diagnosis=opt.diagnosis,
                ))
        else:
            qq = QuizQuestion(
                quiz_id=quiz.id,
                order_index=q_in.id,
                stem=q_in.stem,
                knowledge_node_id=q_in.knowledge_node_id,
                reason_options=reason_json,
            )
            db.add(qq)
            await db.flush()
            for opt in q_in.options:
                db.add(QuizOption(
                    question_id=qq.id, tag=opt.tag,
                    content=opt.content, diagnosis=opt.diagnosis,
                ))

    # 3) DELETE removed questions (safe now: no student answers)
    for q in removed:
        await db.delete(q)
    await db.flush()


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
        mode=payload.mode,
        knowledge_node_ids=payload.knowledge_node_ids,
        created_by=teacher.id,
    )
    db.add(quiz)
    await db.flush()
    await _upsert_questions_options(db, quiz, payload.questions)
    await db.commit()
    await db.refresh(quiz, ["questions"])
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
    quiz.mode = payload.mode
    quiz.knowledge_node_ids = payload.knowledge_node_ids
    await _upsert_questions_options(db, quiz, payload.questions)
    await db.commit()
    await db.refresh(quiz, ["questions"])
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
