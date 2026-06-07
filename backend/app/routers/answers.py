"""Student answers / followups / aggregations. See spec-10 §6 P4."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, require_student, require_teacher
from app.db.models import (
    Assignment,
    Class,
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
    DiagnosisLogRow,
    FollowupConversationRow,
    QuizClassAnswersResponse,
    QuizClassFollowupsResponse,
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

        # Upsert followup — atomic on_conflict_do_update avoids the
        # non-atomic delete+insert race when a student re-submits.
        stmt = (
            pg_insert(FollowupResult.__table__)
            .values(
                student_answer_id=f.student_answer_id,
                conversation_log=f.conversation_log,
                final_status=f.final_status,
                misconception_code=f.misconception_code,
                reasoning_quality=f.reasoning_quality,
                status_change=f.status_change,
                ai_summary=f.ai_summary,
                cause_ids=f.cause_ids,
                error_type=f.error_type,
            )
            .on_conflict_do_update(
                index_elements=["student_answer_id"],
                set_={
                    "conversation_log": f.conversation_log,
                    "final_status": f.final_status,
                    "misconception_code": f.misconception_code,
                    "reasoning_quality": f.reasoning_quality,
                    "status_change": f.status_change,
                    "ai_summary": f.ai_summary,
                    "cause_ids": f.cause_ids,
                    "error_type": f.error_type,
                },
            )
        )
        await db.execute(stmt)

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
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizClassAnswersResponse:
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    data = await stats_service.get_class_answers(db, quiz_id, class_id)
    return QuizClassAnswersResponse.model_validate({
        "quiz_id": data["quiz_id"],
        "class_id": data["class_id"],
        "rows": data["rows"],
    })


@quiz_router.get(
    "/{quiz_id}/followups",
    response_model=QuizClassFollowupsResponse,
    response_model_by_alias=True,
)
async def get_quiz_class_followups(
    quiz_id: str,
    class_id: str = Query(alias="classId"),
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizClassFollowupsResponse:
    """Return per-(student, question) follow-up dialogue logs for a class.

    Used by teacher dashboard to read what students actually said during
    the second-layer N3 follow-up dialogue, not just the final verdict.
    """
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")

    # Pull answers + follow-ups + question (to constrain by quiz_id) + student profile.
    # Filter by quiz via question.quiz_id.
    res = await db.execute(
        select(StudentAnswer, FollowupResult, QuizQuestion, Student)
        .join(QuizQuestion, QuizQuestion.id == StudentAnswer.question_id)
        .join(FollowupResult, FollowupResult.student_answer_id == StudentAnswer.id)
        .join(Student, Student.user_id == StudentAnswer.student_id)
        .where(QuizQuestion.quiz_id == quiz_id, Student.class_id == class_id)
        .order_by(Student.seat, QuizQuestion.id),
    )
    rows: list[FollowupConversationRow] = []
    for ans, fup, _q, stu in res.all():
        rows.append(FollowupConversationRow(
            student_id=stu.user_id,
            student_name=stu.name,
            seat=stu.seat,
            question_id=ans.question_id,
            selected_tag=ans.selected_tag,
            diagnosis=ans.diagnosis,
            answered_at=ans.answered_at,
            final_status=fup.final_status,
            misconception_code=fup.misconception_code,
            reasoning_quality=fup.reasoning_quality,
            ai_summary=fup.ai_summary,
            cause_ids=fup.cause_ids,
            status_change=fup.status_change or {},
            conversation_log=fup.conversation_log or [],
        ))
    return QuizClassFollowupsResponse(
        quiz_id=quiz_id, class_id=class_id, rows=rows,
    )


@quiz_router.get(
    "/{quiz_id}/stats",
    response_model=QuizStatsResponse,
    response_model_by_alias=True,
)
async def get_quiz_stats(
    quiz_id: str,
    class_id: str | None = Query(default=None, alias="classId"),
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> QuizStatsResponse:
    if class_id:
        cls = await db.get(Class, class_id)
        if cls is None or cls.teacher_id != teacher.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
        data = await stats_service.get_class_stats(db, quiz_id, class_id)
    else:
        data = await stats_service.get_grade_stats(db, quiz_id, teacher_id=teacher.id)
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
        cause_map: dict[str, set[int]] = {}
        error_type_map: dict[str, str] = {}
        for a in ans_list:
            fup = a.followup
            if not fup or not fup.misconception_code:
                continue
            if fup.cause_ids:
                cause_map.setdefault(fup.misconception_code, set()).update(fup.cause_ids)
            # 取第一筆同迷思的 errorType（與前端 getErrorType 一致）
            if fup.error_type and fup.misconception_code not in error_type_map:
                error_type_map[fup.misconception_code] = fup.error_type
        cause_ids_by_misconception = {
            code: sorted(ids) for code, ids in cause_map.items()
        }
        rows.append(StudentHistoryRow(
            quiz_id=qid,
            quiz_title=quiz.title,
            answered_at=latest.answered_at,
            correct_count=correct,
            total_questions=len(ans_list),
            misconceptions=misc,
            cause_ids_by_misconception=cause_ids_by_misconception,
            error_type_by_misconception=error_type_map,
        ))
    rows.sort(key=lambda r: r.answered_at, reverse=True)
    return rows


# ── teacher-facing: diagnosis follow-up logs ─────────────────────────────
teacher_router = APIRouter()  # mounted under /api/teachers


@teacher_router.get(
    "/diagnosis-logs",
    response_model=list[DiagnosisLogRow],
    response_model_by_alias=True,
)
async def list_diagnosis_logs(
    class_id: str | None = Query(default=None, alias="classId"),
    quiz_id: str | None = Query(default=None, alias="quizId"),
    student_id: str | None = Query(default=None, alias="studentId"),
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[DiagnosisLogRow]:
    """Return all follow-up dialogue logs across the teacher's classes."""
    teacher_cls_res = await db.execute(
        select(Class.id).where(Class.teacher_id == teacher.id),
    )
    teacher_class_ids = {cid for (cid,) in teacher_cls_res.all()}
    if not teacher_class_ids:
        return []

    stmt = (
        select(StudentAnswer, FollowupResult, QuizQuestion, Student)
        .join(QuizQuestion, QuizQuestion.id == StudentAnswer.question_id)
        .join(FollowupResult, FollowupResult.student_answer_id == StudentAnswer.id)
        .join(Student, Student.user_id == StudentAnswer.student_id)
        .where(Student.class_id.in_(teacher_class_ids))
        .order_by(StudentAnswer.answered_at.desc())
    )
    if quiz_id:
        stmt = stmt.where(QuizQuestion.quiz_id == quiz_id)
    if class_id:
        stmt = stmt.where(Student.class_id == class_id)
    if student_id:
        stmt = stmt.where(Student.user_id == student_id)

    res = await db.execute(stmt)
    all_rows = res.all()

    quiz_ids = {q.quiz_id for _, _, q, _ in all_rows}
    quiz_res = await db.execute(select(Quiz).where(Quiz.id.in_(quiz_ids)))
    quiz_map = {q.id: q for q in quiz_res.scalars().all()}

    cls_res = await db.execute(select(Class).where(Class.id.in_(teacher_class_ids)))
    cls_map = {c.id: c for c in cls_res.scalars().all()}

    rows: list[DiagnosisLogRow] = []
    for ans, fup, qq, stu in all_rows:
        quiz = quiz_map.get(qq.quiz_id)
        cls = cls_map.get(stu.class_id)
        rows.append(DiagnosisLogRow(
            student_id=stu.user_id,
            student_name=stu.name,
            seat=stu.seat,
            class_id=cls.id if cls else None,
            class_name=cls.name if cls else None,
            quiz_id=qq.quiz_id,
            quiz_title=quiz.title if quiz else qq.quiz_id,
            question_id=ans.question_id,
            final_status=fup.final_status,
            misconception_code=fup.misconception_code,
            reasoning_quality=fup.reasoning_quality,
            ai_summary=fup.ai_summary,
            cause_ids=fup.cause_ids,
            status_change=fup.status_change or {},
            conversation_log=fup.conversation_log or [],
            answered_at=ans.answered_at,
        ))
    return rows
