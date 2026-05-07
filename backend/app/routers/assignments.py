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
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, require_teacher
from app.db.models import (
    Assignment,
    AssignmentStudent,
    Class,
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

    - total_students:
        * targetType='class'   → distinct students in that class
        * targetType='students' → count of explicitly targeted students
    - submitted: distinct students with ≥1 answer (diagnosis) or completed
      treatment session (scenario), restricted to the targeted set.
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

    sce_assignments = [a for a in assignments if a.type == "scenario"]
    for a in sce_assignments:
        targeted_ids = {s.student_id for s in a.students}
        stmt = (
            select(func.count(distinct(TreatmentSession.student_id)))
            .join(Student, Student.user_id == TreatmentSession.student_id)
            .where(
                TreatmentSession.scenario_quiz_id == a.scenario_quiz_id,
                Student.class_id == a.class_id,
                TreatmentSession.status == "completed",
            )
        )
        if a.target_type == "students" and targeted_ids:
            stmt = stmt.where(TreatmentSession.student_id.in_(targeted_ids))
        res = await db.execute(stmt)
        sce_subs[a.id] = res.scalar_one() or 0

    out: dict[str, tuple[int, int, int]] = {}
    for a in assignments:
        if a.target_type == "students":
            total = len(a.students)
        else:
            total = totals_by_class.get(a.class_id, 0)
        submitted = (diag_subs if a.type == "diagnosis" else sce_subs).get(a.id, 0)
        rate = round(submitted * 100 / total) if total else 0
        out[a.id] = (submitted, total, rate)
    return out


def _to_io(
    a: Assignment, stats: tuple[int, int, int],
    my_scenario_completed: bool | None = None,
    my_diagnosis_completed: bool | None = None,
) -> AssignmentIO:
    submitted, total, rate = stats
    return AssignmentIO(
        id=a.id,
        type=a.type,
        quiz_id=a.quiz_id,
        scenario_quiz_id=a.scenario_quiz_id,
        class_id=a.class_id,
        target_type=a.target_type,
        student_ids=[s.student_id for s in a.students],
        assigned_at=a.assigned_at,
        due_date=a.due_date,
        status=a.status,
        completion_rate=rate,
        submitted_count=submitted,
        total_students=total,
        my_scenario_completed=my_scenario_completed,
        my_diagnosis_completed=my_diagnosis_completed,
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
    """Filter is optional. Students implicitly limited to their own class +
    (for student-targeted assignments) only the ones they're in."""
    stmt = (
        select(Assignment)
        .options(selectinload(Assignment.students))
        .order_by(Assignment.assigned_at.desc())
    )
    if type:
        stmt = stmt.where(Assignment.type == type)
    if class_id:
        stmt = stmt.where(Assignment.class_id == class_id)
    if quiz_id:
        stmt = stmt.where(Assignment.quiz_id == quiz_id)
    if scenario_quiz_id:
        stmt = stmt.where(Assignment.scenario_quiz_id == scenario_quiz_id)

    if user.role == "student":
        student = await db.get(Student, user.id)
        if student is None:
            return []
        stmt = stmt.where(Assignment.class_id == student.class_id)
    else:
        # Teacher: limit to assignments in their own classes.
        teacher_class_ids_res = await db.execute(
            select(Class.id).where(Class.teacher_id == user.id),
        )
        teacher_class_ids = [cid for (cid,) in teacher_class_ids_res.all()]
        if not teacher_class_ids:
            return []
        stmt = stmt.where(Assignment.class_id.in_(teacher_class_ids))

    res = await db.execute(stmt)
    assignments = list(res.scalars().all())

    if user.role == "student":
        # Hide student-targeted assignments that don't include this student.
        assignments = [
            a for a in assignments
            if a.target_type == "class"
            or any(s.student_id == user.id for s in a.students)
        ]

    stats = await _build_stats(db, assignments)

    # For students: compute per-student scenario completion
    my_scenario_map: dict[str, bool] = {}
    my_diagnosis_map: dict[str, bool] = {}
    if user.role == "student":
        sce_quiz_ids = [
            a.scenario_quiz_id for a in assignments
            if a.type == "scenario" and a.scenario_quiz_id
        ]
        if sce_quiz_ids:
            completed_res = await db.execute(
                select(TreatmentSession.scenario_quiz_id)
                .where(
                    TreatmentSession.student_id == user.id,
                    TreatmentSession.scenario_quiz_id.in_(sce_quiz_ids),
                    TreatmentSession.status == "completed",
                )
            )
            completed_sq_ids = {row[0] for row in completed_res.all()}
            for a in assignments:
                if a.type == "scenario" and a.scenario_quiz_id:
                    my_scenario_map[a.id] = a.scenario_quiz_id in completed_sq_ids

        diag_assign_ids = [a.id for a in assignments if a.type == "diagnosis"]
        if diag_assign_ids:
            answered_res = await db.execute(
                select(distinct(StudentAnswer.assignment_id))
                .where(
                    StudentAnswer.student_id == user.id,
                    StudentAnswer.assignment_id.in_(diag_assign_ids),
                )
            )
            answered_ids = {row[0] for row in answered_res.all()}
            for a in assignments:
                if a.type == "diagnosis":
                    my_diagnosis_map[a.id] = a.id in answered_ids

    return [
        _to_io(
            a, stats.get(a.id, (0, 0, 0)),
            my_scenario_map.get(a.id), my_diagnosis_map.get(a.id),
        )
        for a in assignments
    ]


async def _validate_student_ids(
    db: AsyncSession, class_id: str, student_ids: list[str],
) -> None:
    """Ensure all targeted student_ids belong to class_id."""
    if not student_ids:
        return
    res = await db.execute(
        select(Student.user_id)
        .where(Student.user_id.in_(student_ids), Student.class_id == class_id),
    )
    found = {r[0] for r in res.all()}
    missing = set(student_ids) - found
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"STUDENTS_NOT_IN_CLASS: {sorted(missing)}",
        )


async def _ensure_class_owned(db: AsyncSession, class_id: str, teacher: User) -> None:
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")


@router.post("", response_model=AssignmentIO, status_code=status.HTTP_201_CREATED, response_model_by_alias=True)
async def create_assignment(
    payload: AssignmentCreate,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> AssignmentIO:
    await _ensure_class_owned(db, payload.class_id, teacher)
    await _validate_student_ids(db, payload.class_id, payload.student_ids)
    aid = f"assign-{int(time.time() * 1000)}"
    a = Assignment(
        id=aid,
        type=payload.type,
        quiz_id=payload.quiz_id,
        scenario_quiz_id=payload.scenario_quiz_id,
        class_id=payload.class_id,
        target_type=payload.target_type,
        assigned_at=date_cls.today(),
        due_date=payload.due_date,
        status=payload.status,
    )
    a.students = [
        AssignmentStudent(assignment_id=aid, student_id=sid)
        for sid in payload.student_ids
    ]
    db.add(a)
    await db.commit()
    await db.refresh(a, attribute_names=["students"])
    stats = await _build_stats(db, [a])
    return _to_io(a, stats.get(a.id, (0, 0, 0)))


@router.patch("/{assignment_id}", response_model=AssignmentIO, response_model_by_alias=True)
async def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdate,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> AssignmentIO:
    res = await db.execute(
        select(Assignment)
        .options(selectinload(Assignment.students))
        .where(Assignment.id == assignment_id),
    )
    a = res.scalar_one_or_none()
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ASSIGNMENT_NOT_FOUND")
    await _ensure_class_owned(db, a.class_id, teacher)
    if payload.due_date is not None:
        a.due_date = payload.due_date
    if payload.status is not None:
        a.status = payload.status
    if payload.student_ids is not None:
        if a.target_type != "students":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "CANNOT_MODIFY_STUDENTS_ON_CLASS_ASSIGNMENT",
            )
        if not payload.student_ids:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "STUDENTS_REQUIRED_FOR_STUDENT_TARGETED",
            )
        await _validate_student_ids(db, a.class_id, payload.student_ids)
        a.students = [
            AssignmentStudent(assignment_id=a.id, student_id=sid)
            for sid in payload.student_ids
        ]
    await db.commit()
    await db.refresh(a, attribute_names=["students"])
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
