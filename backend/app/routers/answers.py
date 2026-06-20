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
    StudentQuestionResult,
)
from app.services import stats_service

router = APIRouter()

# 模糊/亂答 + 模稜兩可的空話——挑「最具診斷性」學生原話時排除（與前端 getStudentQuote 一致）
_FUZZY_QUOTE_WORDS = (
    "不知道", "我不會", "忘記", "猜的", "沒想法", "不確定", "亂選", "隨便",
    "不一定", "看情況", "都可以", "還好", "沒差",
)


def _pick_student_quote(conversation_log: list) -> str | None:
    """從 conversation_log 挑最具診斷性的一句學生原話。

    規則同前端 getStudentQuote：濾掉太短（<8 字）或含模糊詞的回覆取最長者；
    全是模糊回覆時退而取最後一則學生發言。找不到回 None。
    """
    # 學生發言 role 在不同路徑下有兩種寫法：rule-based 存 'student'，LLM 路徑存
    # OpenAI 慣例的 'user'。兩者都視為學生。
    student_msgs = [
        m for m in (conversation_log or [])
        if isinstance(m, dict) and m.get("role") in ("student", "user") and (m.get("content") or "").strip()
    ]
    if not student_msgs:
        return None
    meaningful = [
        m for m in student_msgs
        if len(m["content"].strip()) >= 8
        and not any(w in m["content"] for w in _FUZZY_QUOTE_WORDS)
    ]
    # 寧缺勿濫：挑不到能反映想法的句子就回 None，不秀空話
    if not meaningful:
        return None
    return max(meaningful, key=lambda m: len(m["content"]))["content"]


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
            "reason_tag": a.reason_tag,
            "quadrant": a.quadrant,
            "diagnosis": a.diagnosis,
        }
        for a in payload.answers
    ]
    excluded = pg_insert(StudentAnswer.__table__).excluded
    stmt = (
        pg_insert(StudentAnswer.__table__)
        .values(rows)
        .on_conflict_do_update(
            index_elements=["assignment_id", "student_id", "question_id"],
            set_={
                "selected_tag": excluded.selected_tag,
                "reason_tag": excluded.reason_tag,
                "quadrant": excluded.quadrant,
                "diagnosis": excluded.diagnosis,
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
            reason_tag=row.reason_tag,
            quadrant=row.quadrant,
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

    # Pull answers + follow-ups + student profile, scoped to this quiz via the
    # assignment (StudentAnswer.question_id 存的是卷內題序 order_index，不是
    # quiz_questions 全域 PK，因此不能用它 join 題目表來判定題組；改以
    # assignment.quiz_id 限定範圍）。spec-11 §3.11。
    res = await db.execute(
        select(StudentAnswer, FollowupResult, Student)
        .join(Assignment, Assignment.id == StudentAnswer.assignment_id)
        .join(FollowupResult, FollowupResult.student_answer_id == StudentAnswer.id)
        .join(Student, Student.user_id == StudentAnswer.student_id)
        .where(Assignment.quiz_id == quiz_id, Student.class_id == class_id)
        .order_by(Student.seat, StudentAnswer.question_id),
    )
    rows: list[FollowupConversationRow] = []
    for ans, fup, stu in res.all():
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

    # 題組由 assignment 判定（StudentAnswer.question_id 是卷內題序 order_index，
    # 非 quiz_questions 全域 PK，不能用它反查題組）。spec-11 §3.11。
    asg_ids = {a.assignment_id for a in answers}
    asg_res = await db.execute(select(Assignment).where(Assignment.id.in_(asg_ids)))
    asg_map = {a.id: a for a in asg_res.scalars().all()}

    by_quiz: dict[str, list[StudentAnswer]] = {}
    for a in answers:
        asg = asg_map.get(a.assignment_id)
        if not asg:
            continue
        by_quiz.setdefault(asg.quiz_id, []).append(a)

    quiz_res = await db.execute(select(Quiz).where(Quiz.id.in_(set(by_quiz.keys()))))
    quiz_map = {q.id: q for q in quiz_res.scalars().all()}

    rows: list[StudentHistoryRow] = []
    for qid, raw_ans_list in by_quiz.items():
        quiz = quiz_map.get(qid)
        if not quiz:
            continue
        latest = max(raw_ans_list, key=lambda a: a.answered_at)
        # 去重：同一題若有多筆作答（重做），只取最新一筆，避免題數與對錯數被灌水
        # （例：5 題的測驗因重做變成 10 筆 → 顯示「答錯 8 題」誤導）。
        latest_by_q: dict[int, StudentAnswer] = {}
        for a in raw_ans_list:
            cur = latest_by_q.get(a.question_id)
            if cur is None or a.answered_at > cur.answered_at:
                latest_by_q[a.question_id] = a
        ans_list = list(latest_by_q.values())
        correct = sum(1 for a in ans_list if a.diagnosis == "CORRECT")
        misc = sorted({a.diagnosis for a in ans_list if a.diagnosis != "CORRECT"})
        cause_map: dict[str, set[int]] = {}
        error_type_map: dict[str, str] = {}
        ai_summary_map: dict[str, str] = {}
        status_change_map: dict[str, dict] = {}
        quote_map: dict[str, str] = {}
        for a in ans_list:
            fup = a.followup
            if not fup:
                continue
            # 報告卡片是以「該題答案的 diagnosis」（answer.diagnosis）為 key 顯示的，
            # 而非 LLM 結論碼 fup.misconception_code——兩者在部分資料並不一致。
            # 因此這裡用 a.diagnosis 當 key，把「這一題自己的」追問產出（每題唯一一個
            # followup）掛上去，確保前端用 miscon.id 查得到。a.diagnosis 為 CORRECT
            # （例如 UPGRADED 後）的題目不是迷思卡，跳過。
            code = a.diagnosis
            if not code or code == "CORRECT":
                continue
            if fup.cause_ids:
                cause_map.setdefault(code, set()).update(fup.cause_ids)
            if fup.error_type and code not in error_type_map:
                error_type_map[code] = fup.error_type
            if fup.ai_summary and code not in ai_summary_map:
                ai_summary_map[code] = fup.ai_summary
            if fup.status_change and code not in status_change_map:
                status_change_map[code] = fup.status_change
            if code not in quote_map:
                quote = _pick_student_quote(fup.conversation_log)
                if quote:
                    quote_map[code] = quote
        cause_ids_by_misconception = {
            code: sorted(ids) for code, ids in cause_map.items()
        }
        # 卷內題序（order_index）→ 該題組真正的題目，用來補上 node/題幹/選項內容，
        # 讓前端不必依賴 mock getQuizQuestions 即可渲染真實教師題組。
        q_by_order = {qq.order_index: qq for qq in quiz.questions}

        def _qr(a: StudentAnswer, q_by_order=q_by_order) -> StudentQuestionResult:
            qq = q_by_order.get(a.question_id)
            picked = None
            picked_reason = None
            if qq:
                picked = next((o.content for o in qq.options if o.tag == a.selected_tag), None)
                if a.reason_tag and qq.reason_options:
                    picked_reason = next(
                        (r.get("content") for r in qq.reason_options
                         if r.get("tag") == a.reason_tag),
                        None,
                    )
            # two-tier 以四象限判定「完全正確」（TT）；single（無 quadrant）沿用 diagnosis。
            is_correct = a.quadrant == "TT" if a.quadrant else (a.diagnosis == "CORRECT")
            return StudentQuestionResult(
                question_id=a.question_id,
                node_id=qq.knowledge_node_id if qq else None,
                stem=qq.stem if qq else None,
                selected_option_content=picked,
                selected_reason_content=picked_reason,
                quadrant=a.quadrant,
                selected_tag=a.selected_tag,
                diagnosis=a.diagnosis,
                is_correct=is_correct,
            )

        question_results = sorted(
            (_qr(a) for a in ans_list),
            key=lambda r: r.question_id,
        )
        rows.append(StudentHistoryRow(
            quiz_id=qid,
            quiz_title=quiz.title,
            answered_at=latest.answered_at,
            correct_count=correct,
            total_questions=len(ans_list),
            misconceptions=misc,
            cause_ids_by_misconception=cause_ids_by_misconception,
            error_type_by_misconception=error_type_map,
            ai_summary_by_misconception=ai_summary_map,
            status_change_by_misconception=status_change_map,
            quote_by_misconception=quote_map,
            question_results=question_results,
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

    # 題組改由 assignment.quiz_id 判定（StudentAnswer.question_id 是卷內題序
    # order_index，非 quiz_questions 全域 PK，不能用它 join 題目表）。spec-11 §3.11。
    stmt = (
        select(StudentAnswer, FollowupResult, Assignment, Student)
        .join(Assignment, Assignment.id == StudentAnswer.assignment_id)
        .join(FollowupResult, FollowupResult.student_answer_id == StudentAnswer.id)
        .join(Student, Student.user_id == StudentAnswer.student_id)
        .where(Student.class_id.in_(teacher_class_ids))
        .order_by(StudentAnswer.answered_at.desc())
    )
    if quiz_id:
        stmt = stmt.where(Assignment.quiz_id == quiz_id)
    if class_id:
        stmt = stmt.where(Student.class_id == class_id)
    if student_id:
        stmt = stmt.where(Student.user_id == student_id)

    res = await db.execute(stmt)
    all_rows = res.all()

    quiz_ids = {asg.quiz_id for _, _, asg, _ in all_rows}
    quiz_res = await db.execute(select(Quiz).where(Quiz.id.in_(quiz_ids)))
    quiz_map = {q.id: q for q in quiz_res.scalars().all()}

    cls_res = await db.execute(select(Class).where(Class.id.in_(teacher_class_ids)))
    cls_map = {c.id: c for c in cls_res.scalars().all()}

    rows: list[DiagnosisLogRow] = []
    for ans, fup, asg, stu in all_rows:
        quiz = quiz_map.get(asg.quiz_id)
        cls = cls_map.get(stu.class_id)
        rows.append(DiagnosisLogRow(
            student_id=stu.user_id,
            student_name=stu.name,
            seat=stu.seat,
            class_id=cls.id if cls else None,
            class_name=cls.name if cls else None,
            quiz_id=asg.quiz_id,
            quiz_title=quiz.title if quiz else asg.quiz_id,
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
