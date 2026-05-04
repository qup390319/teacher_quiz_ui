"""Assignment CRUD with completion stats.

Stats are computed on read from `student_answers` (and `treatment_sessions` for
scenario assignments) so the frontend can render completion-rate cells without
holding stale denormalised counters. This is cheap because the DB is small
(<100 students per class) — promote to a materialised view if it ever stops
fitting in <50ms.
"""
import time
from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_teacher
from app.db.models import (
    Assignment,
    Student,
    StudentAnswer,
    TreatmentSession,
    User,
)
from app.db.session import get_db
from app.schemas.assignment import AssignmentCreate, AssignmentIO, AssignmentUpdate

router = APIRouter()


async def _build_stats(
    db: AsyncSession, assignments: list[Assignment],
) -> dict[str, tuple[int, int, int]]:
    """Return {assignment_id: (submitted_count, total_students, completion_rate%)}.

    - total_students: distinct students currently in that class
    - submitted: distinct students with ≥1 answer (diagnosis) or a session (scenario)
    """
    if not assignments:
        return {}

    class_ids = {a.class_id for a in assignments}
    totals_res = await db.execute(
        select(Student.class_id, func.count(Student.user_id))
        .where(Student.class_id.in_(class_ids))
        .group_by(Student.class_id),
    )
    totals_by_class: dict[str, int] = dict(totals_res.all())

    diag_ids = [a.id for a in assignments if a.type == "diagnosis"]
    sce_ids = [a.id for a in assignments if a.type == "scenario"]
    diag_subs: dict[str, int] = {}
    sce_subs: dict[str, int] = {}

    if diag_ids:
        d_res = await db.execute(
            select(
                StudentAnswer.assignment_id,
                func.count(distinct(StudentAnswer.student_id)),
            )
            .where(StudentAnswer.assignment_id.in_(diag_ids))
            .group_by(StudentAnswer.assignment_id),
        )
        diag_subs = dict(d_res.all())

    if sce_ids:
        # scenario assignment ↔ treatment_session via (scenario_quiz_id, class)
        # Sessions store scenario_quiz_id + student_id; link back via class membership.
        sce_assignments = [a for a in assignments if a.type == "scenario"]
        for a in sce_assignments:
            res = await db.execute(
                select(func.count(distinct(TreatmentSession.student_id)))
                .join(Student, Student.user_id == TreatmentSession.student_id)
                .where(
                    TreatmentSession.scenario_quiz_id == a.scenario_quiz_id,
                    Student.class_id == a.class_id,
                    TreatmentSession.status == "completed",
                ),
            )
            sce_subs[a.id] = res.scalar_one() or 0

    out: dict[str, tuple[int, int, int]] = {}
    for a in assignments:
        total = totals_by_class.get(a.class_id, 0)
        submitted = (diag_subs if a.type == "diagnosis" else sce_subs).get(a.id, 0)
        rate = round(submitted * 100 / total) if total else 0
        out[a.id] = (submitted, total, rate)
    return out


def _to_io(a: Assignment, stats: tuple[int, int, int]) -> AssignmentIO:
    submitted, total, rate = stats
    return AssignmentIO(
        id=a.id,
        type=a.type,
        quiz_id=a.quiz_id,
        scenario_quiz_id=a.scenario_quiz_id,
        class_id=a.class_id,
        assigned_at=a.assigned_at,
        due_date=a.due_date,
        status=a.status,
        completion_rate=rate,
        submitted_count=submitted,
        total_students=total,
    )


@router.get("", response_model=list[AssignmentIO], response_model_by_alias=True)
async def list_assignments(
    type: str | None = Query(default=None, pattern="^(diagnosis|scenario)$"),
    class_id: str | None = Query(default=None, alias="classId"),
    quiz_id: str | None = Query(default=None, alias="quizId"),
    scenario_quiz_id: str | None = Query(default=None, alias="scenarioQuizId"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AssignmentIO]:
    """Filter is optional. Students implicitly limited to their own class."""
    stmt = select(Assignment).order_by(Assignment.assigned_at.desc())
    if type:
        stmt = stmt.where(Assignment.type == type)
    if class_id:
        stmt = stmt.where(Assignment.class_id == class_id)
    if quiz_id:
        stmt = stmt.where(Assignment.quiz_id == quiz_id)
    if scenario_quiz_id:
        stmt = stmt.where(Assignment.scenario_quiz_id == scenario_quiz_id)

    # Student can only see their own class. Re-fetch via Student table to avoid
    # async lazy-load on user.student.
    if user.role == "student":
        student = await db.get(Student, user.id)
        if student is None:
            return []
        stmt = stmt.where(Assignment.class_id == student.class_id)

    res = await db.execute(stmt)
    assignments = list(res.scalars().all())
    stats = await _build_stats(db, assignments)
    return [_to_io(a, stats.get(a.id, (0, 0, 0))) for a in assignments]


@router.post("", response_model=AssignmentIO, status_code=status.HTTP_201_CREATED, response_model_by_alias=True)
async def create_assignment(
    payload: AssignmentCreate,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> AssignmentIO:
    aid = f"assign-{int(time.time() * 1000)}"
    a = Assignment(
        id=aid,
        type=payload.type,
        quiz_id=payload.quiz_id,
        scenario_quiz_id=payload.scenario_quiz_id,
        class_id=payload.class_id,
        assigned_at=date_cls.today(),
        due_date=payload.due_date,
        status=payload.status,
    )
    db.add(a)
    await db.commit()
    stats = await _build_stats(db, [a])
    return _to_io(a, stats.get(a.id, (0, 0, 0)))


@router.patch("/{assignment_id}", response_model=AssignmentIO, response_model_by_alias=True)
async def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdate,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> AssignmentIO:
    a = await db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ASSIGNMENT_NOT_FOUND")
    if payload.due_date is not None:
        a.due_date = payload.due_date
    if payload.status is not None:
        a.status = payload.status
    await db.commit()
    stats = await _build_stats(db, [a])
    return _to_io(a, stats.get(a.id, (0, 0, 0)))


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    a = await db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ASSIGNMENT_NOT_FOUND")
    await db.delete(a)
    await db.commit()
