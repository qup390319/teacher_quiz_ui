"""Treatment session endpoints. spec-08 / spec-10 §6 P4."""
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, require_student, require_teacher
from app.db.models import (
    Class,
    ScenarioQuiz,
    Student,
    TreatmentMessage,
    TreatmentSession,
    User,
)
from app.db.session import get_db
from app.schemas.treatment import (
    AdvanceQuestionRequest,
    AppendMessageRequest,
    StartSessionRequest,
    TreatmentLogRow,
    TreatmentMessageIO,
    TreatmentSessionBrief,
    TreatmentSessionDetail,
)

router = APIRouter()


def _to_message_io(m: TreatmentMessage) -> TreatmentMessageIO:
    return TreatmentMessageIO(
        id=m.id, session_id=m.session_id, question_index=m.question_index,
        role=m.role, text=m.text, phase=m.phase, stage=m.stage, step=m.step,
        hint_level=m.hint_level, feedback=m.feedback,
        requires_restatement=m.requires_restatement, created_at=m.created_at,
    )


def _to_session_detail(s: TreatmentSession) -> TreatmentSessionDetail:
    return TreatmentSessionDetail(
        id=s.id, scenario_quiz_id=s.scenario_quiz_id, student_id=s.student_id,
        status=s.status, current_question_index=s.current_question_index,
        started_at=s.started_at, completed_at=s.completed_at,
        messages=[_to_message_io(m) for m in s.messages],
    )


# ── student-facing ────────────────────────────────────────────────────────
@router.post("/sessions/start", response_model=TreatmentSessionDetail,
             response_model_by_alias=True)
async def start_session(
    payload: StartSessionRequest,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> TreatmentSessionDetail:
    """Idempotent: returns existing session if (scenarioQuizId, studentId) already exists."""
    res = await db.execute(
        select(TreatmentSession).where(
            TreatmentSession.scenario_quiz_id == payload.scenario_quiz_id,
            TreatmentSession.student_id == student.id,
        ).options(selectinload(TreatmentSession.messages)),
    )
    existing = res.scalar_one_or_none()
    if existing:
        return _to_session_detail(existing)

    sq = await db.get(ScenarioQuiz, payload.scenario_quiz_id)
    if sq is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SCENARIO_NOT_FOUND")

    sid = f"session-{int(time.time() * 1000)}"
    s = TreatmentSession(
        id=sid,
        scenario_quiz_id=payload.scenario_quiz_id,
        student_id=student.id,
        status="active",
        current_question_index=1,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s, attribute_names=["messages"])
    return _to_session_detail(s)


@router.get("/sessions/{session_id}", response_model=TreatmentSessionDetail,
            response_model_by_alias=True)
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TreatmentSessionDetail:
    s = await db.get(
        TreatmentSession, session_id,
        options=[selectinload(TreatmentSession.messages)],
    )
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SESSION_NOT_FOUND")
    if user.role == "student" and s.student_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTHER_STUDENT")
    return _to_session_detail(s)


@router.get(
    "/sessions/by-key/{scenario_quiz_id}/{student_id}",
    response_model=TreatmentSessionDetail | None,
    response_model_by_alias=True,
)
async def get_session_by_key(
    scenario_quiz_id: str,
    student_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TreatmentSessionDetail | None:
    if user.role == "student" and user.id != student_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTHER_STUDENT")
    res = await db.execute(
        select(TreatmentSession).where(
            TreatmentSession.scenario_quiz_id == scenario_quiz_id,
            TreatmentSession.student_id == student_id,
        ).options(selectinload(TreatmentSession.messages)),
    )
    s = res.scalar_one_or_none()
    return _to_session_detail(s) if s else None


@router.post("/sessions/{session_id}/messages", response_model=TreatmentMessageIO,
             response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def append_message(
    session_id: str,
    payload: AppendMessageRequest,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> TreatmentMessageIO:
    s = await db.get(TreatmentSession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SESSION_NOT_FOUND")
    if s.student_id != student.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTHER_STUDENT")
    m = TreatmentMessage(
        session_id=session_id,
        question_index=payload.question_index,
        role=payload.role,
        text=payload.text,
        phase=payload.phase,
        stage=payload.stage,
        step=payload.step,
        hint_level=payload.hint_level,
        feedback=payload.feedback,
        requires_restatement=payload.requires_restatement,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _to_message_io(m)


@router.patch("/sessions/{session_id}/advance", response_model=TreatmentSessionBrief,
              response_model_by_alias=True)
async def advance_question(
    session_id: str,
    payload: AdvanceQuestionRequest,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> TreatmentSessionBrief:
    s = await db.get(TreatmentSession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SESSION_NOT_FOUND")
    if s.student_id != student.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTHER_STUDENT")
    s.current_question_index = payload.next_index
    await db.commit()
    return TreatmentSessionBrief(
        id=s.id, scenario_quiz_id=s.scenario_quiz_id, student_id=s.student_id,
        status=s.status, current_question_index=s.current_question_index,
        started_at=s.started_at, completed_at=s.completed_at,
    )


@router.post("/sessions/{session_id}/complete", response_model=TreatmentSessionBrief,
             response_model_by_alias=True)
async def complete_session(
    session_id: str,
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> TreatmentSessionBrief:
    s = await db.get(TreatmentSession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SESSION_NOT_FOUND")
    if s.student_id != student.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTHER_STUDENT")
    s.status = "completed"
    s.completed_at = datetime.now(UTC)
    await db.commit()
    return TreatmentSessionBrief(
        id=s.id, scenario_quiz_id=s.scenario_quiz_id, student_id=s.student_id,
        status=s.status, current_question_index=s.current_question_index,
        started_at=s.started_at, completed_at=s.completed_at,
    )


# ── teacher-facing ────────────────────────────────────────────────────────
teacher_router = APIRouter()  # mounted under /api/teachers


@teacher_router.get(
    "/treatment-logs",
    response_model=list[TreatmentLogRow],
    response_model_by_alias=True,
)
async def list_treatment_logs(
    class_id: str | None = Query(default=None, alias="classId"),
    scenario_quiz_id: str | None = Query(default=None, alias="scenarioQuizId"),
    status_filter: str | None = Query(default=None, alias="status"),
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[TreatmentLogRow]:
    stmt = select(TreatmentSession).order_by(TreatmentSession.started_at.desc())
    if scenario_quiz_id:
        stmt = stmt.where(TreatmentSession.scenario_quiz_id == scenario_quiz_id)
    if status_filter in ("active", "completed"):
        stmt = stmt.where(TreatmentSession.status == status_filter)

    res = await db.execute(stmt)
    sessions = list(res.scalars().all())

    # Pre-load related rows
    sq_ids = {s.scenario_quiz_id for s in sessions}
    student_ids = {s.student_id for s in sessions}
    sq_res = await db.execute(
        select(ScenarioQuiz).where(ScenarioQuiz.id.in_(sq_ids))
        .options(selectinload(ScenarioQuiz.questions)),
    )
    sq_map = {s.id: s for s in sq_res.scalars().all()}
    stu_res = await db.execute(
        select(Student).where(Student.user_id.in_(student_ids)),
    )
    stu_map = {s.user_id: s for s in stu_res.scalars().all()}
    cls_ids = {s.class_id for s in stu_map.values()}
    cls_res = await db.execute(select(Class).where(Class.id.in_(cls_ids)))
    cls_map = {c.id: c for c in cls_res.scalars().all()}

    rows: list[TreatmentLogRow] = []
    for s in sessions:
        sq = sq_map.get(s.scenario_quiz_id)
        stu = stu_map.get(s.student_id)
        cls = cls_map.get(stu.class_id) if stu else None
        # Apply class_id filter post-fetch (since student class is on Student row)
        if class_id and (cls is None or cls.id != class_id):
            continue
        rows.append(TreatmentLogRow(
            session_id=s.id,
            scenario_quiz_id=s.scenario_quiz_id,
            scenario_title=sq.title if sq else s.scenario_quiz_id,
            student_id=s.student_id,
            student_name=stu.name if stu else f"學生 {s.student_id}",
            class_id=cls.id if cls else None,
            class_name=cls.name if cls else None,
            status=s.status,
            current_question_index=s.current_question_index,
            total_questions=len(sq.questions) if sq else 0,
            started_at=s.started_at,
            completed_at=s.completed_at,
        ))
    return rows


@teacher_router.get(
    "/treatment-logs/{session_id}",
    response_model=TreatmentSessionDetail,
    response_model_by_alias=True,
)
async def get_treatment_log_detail(
    session_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> TreatmentSessionDetail:
    s = await db.get(
        TreatmentSession, session_id,
        options=[selectinload(TreatmentSession.messages)],
    )
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SESSION_NOT_FOUND")
    return _to_session_detail(s)
