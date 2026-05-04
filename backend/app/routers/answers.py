"""Student answers / followups / aggregations. See spec-10 §6 P4."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, require_student, require_teacher
from app.db.models import (
    Assignment,
    FollowupResult,
    Quiz,
    QuizQuestion,
    Student,
    StudentAnswer,
    User,
)
from app.db.session import get_db
from app.schemas.answer import (
    AnswerOut,
    QuizClassAnswersResponse,
    QuizStatsResponse,
    RecordAnswersRequest,
    RecordFollowupsRequest,
    StudentHistoryRow,
)
from app.services import stats_service

router = APIRouter()


# ── student-facing: record answers / followups ────────────────────────────
@router.post("/answers", response_model=list[AnswerOut], response_model_by_alias=True,
             status_code=status.HTTP_201_CREATED)
async def record_answers(
    payload: RecordAnswersRequest,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> list[AnswerOut]:
    """Upsert one row per (assignment, student, question)."""
    # Validate every assignment exists and is for the student's class
    assignment_ids = {a.assignment_id for a in payload.answers}
    asg_res = await db.execute(select(Assignment).where(Assignment.id.in_(assignment_ids)))
    asgs = {a.id: a for a in asg_res.scalars().all()}
    if len(asgs) != len(assignment_ids):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ASSIGNMENT_NOT_FOUND")
    student_record = await db.get(Student, student.id)
    for asg in asgs.values():
        if asg.class_id != student_record.class_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "ASSIGNMENT_NOT_FOR_YOUR_CLASS")

    # Upsert: on conflict (assignment_id, student_id, question_id) update.
    rows = [
        {
            "assignment_id": a.assignment_id,
            "student_id": student.id,
            "question_id": a.question_id,
            "selected_tag": a.selected_tag,
            "diagnosis": a.diagnosis,
        }
        for a in payload.answers
    ]
    stmt = (
        pg_insert(StudentAnswer.__table__)
        .values(rows)
        .on_conflict_do_update(
            index_elements=["assignment_id", "student_id", "question_id"],
            set_={
                "selected_tag": pg_insert(StudentAnswer.__table__).excluded.selected_tag,
                "diagnosis": pg_insert(StudentAnswer.__table__).excluded.diagnosis,
            },
        )
        .returning(StudentAnswer.__table__)
    )
    res = await db.execute(stmt)
    inserted = res.fetchall()
    await db.commit()

    out = [
        AnswerOut(
            id=row.id,
            assignment_id=row.assignment_id,
            student_id=row.student_id,
            question_id=row.question_id,
            selected_tag=row.selected_tag,
            diagnosis=row.diagnosis,
            answered_at=row.answered_at,
        )
        for row in inserted
    ]
    return out


@router.post("/answers/followups", response_model=dict[str, int],
             status_code=status.HTTP_201_CREATED)
async def record_followups(
    payload: RecordFollowupsRequest,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Insert followup results. Driven by N3 dialogue. statusChange may flip CORRECT→misconception."""
    # Validate that every student_answer_id belongs to this student
    ids = [f.student_answer_id for f in payload.followups]
    res = await db.execute(select(StudentAnswer).where(StudentAnswer.id.in_(ids)))
    sa_map = {sa.id: sa for sa in res.scalars().all()}
    if len(sa_map) != len(ids):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ANSWER_NOT_FOUND")
    for sa in sa_map.values():
        if sa.student_id != student.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "ANSWER_NOT_YOURS")

    inserted = 0
    for f in payload.followups:
        sa = sa_map[f.student_answer_id]
        # delete existing followup if any (re-attempt)
        existing = await db.execute(
            select(FollowupResult).where(FollowupResult.student_answer_id == f.student_answer_id),
        )
        old = existing.scalar_one_or_none()
        if old:
            await db.delete(old)

        db.add(FollowupResult(
            student_answer_id=f.student_answer_id,
            conversation_log=f.conversation_log,
            final_status=f.final_status,
            misconception_code=f.misconception_code,
            reasoning_quality=f.reasoning_quality,
            status_change=f.status_change,
            ai_summary=f.ai_summary,
        ))

        # Apply statusChange to base answer (UPGRADED/DOWNGRADED)
        change_type = (f.status_change or {}).get("changeType")
        if change_type == "UPGRADED":
            sa.diagnosis = "CORRECT"
        elif change_type == "DOWNGRADED" and f.misconception_code:
            sa.diagnosis = f.misconception_code

        inserted += 1

    await db.commit()
    return {"recorded": inserted}


# ── teacher-facing: aggregations ──────────────────────────────────────────
quiz_router = APIRouter()  # mounted under /api/quizzes/{quiz_id}


@quiz_router.get(
    "/{quiz_id}/answers",
    response_model=QuizClassAnswersResponse,
    response_model_by_alias=True,
)
async def get_quiz_class_answers(
    quiz_id: str,
    class_id: str = Query(alias="classId"),
    _teacher = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizClassAnswersResponse:
    data = await stats_service.get_class_answers(db, quiz_id, class_id)
    return QuizClassAnswersResponse.model_validate({
        "quiz_id": data["quiz_id"],
        "class_id": data["class_id"],
        "rows": data["rows"],
    })


@quiz_router.get(
    "/{quiz_id}/stats",
    response_model=QuizStatsResponse,
    response_model_by_alias=True,
)
async def get_quiz_stats(
    quiz_id: str,
    class_id: str | None = Query(default=None, alias="classId"),
    _teacher = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizStatsResponse:
    if class_id:
        data = await stats_service.get_class_stats(db, quiz_id, class_id)
    else:
        data = await stats_service.get_grade_stats(db, quiz_id)
    return QuizStatsResponse.model_validate(data)


# ── student history ───────────────────────────────────────────────────────
student_router = APIRouter()  # mounted under /api/students/{student_id}


@student_router.get(
    "/{student_id}/history",
    response_model=list[StudentHistoryRow],
    response_model_by_alias=True,
)
async def get_student_history(
    student_id: str,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StudentHistoryRow]:
    """Student can read their own; teachers can read any."""
    if user.role == "student" and user.id != student_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTHER_STUDENT")

    res = await db.execute(
        select(StudentAnswer)
        .where(StudentAnswer.student_id == student_id)
        .options(selectinload(StudentAnswer.followup)),
    )
    answers = list(res.scalars().all())
    if not answers:
        return []

    # Group by quiz (via question → quiz)
    q_ids = {a.question_id for a in answers}
    q_res = await db.execute(
        select(QuizQuestion).where(QuizQuestion.id.in_(q_ids)),
    )
    question_map = {q.id: q for q in q_res.scalars().all()}
    quiz_ids = {question_map[qid].quiz_id for qid in q_ids if qid in question_map}
    quiz_res = await db.execute(select(Quiz).where(Quiz.id.in_(quiz_ids)))
    quiz_map = {q.id: q for q in quiz_res.scalars().all()}

    by_quiz: dict[str, list[StudentAnswer]] = {}
    for a in answers:
        q = question_map.get(a.question_id)
        if not q:
            continue
        by_quiz.setdefault(q.quiz_id, []).append(a)

    rows: list[StudentHistoryRow] = []
    for qid, ans_list in by_quiz.items():
        quiz = quiz_map.get(qid)
        if not quiz:
            continue
        latest = max(ans_list, key=lambda a: a.answered_at)
        correct = sum(1 for a in ans_list if a.diagnosis == "CORRECT")
        misc = sorted({a.diagnosis for a in ans_list if a.diagnosis != "CORRECT"})
        rows.append(StudentHistoryRow(
            quiz_id=qid,
            quiz_title=quiz.title,
            answered_at=latest.answered_at,
            correct_count=correct,
            total_questions=len(ans_list),
            misconceptions=misc,
        ))
    rows.sort(key=lambda r: r.answered_at, reverse=True)
    return rows
