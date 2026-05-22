"""Class / student listings. See spec-04 §1.4 hooks (useClasses / useClass).

Mutation: PUT /api/classes/{class_id}/students replaces the roster wholesale
(matches the existing frontend `updateClassStudents` pattern).
"""
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.db.models import Class, Student, User
from app.db.session import get_db
from app.schemas.class_ import (
    ClassBrief,
    ClassDetail,
    CreateClassRequest,
    StudentBrief,
    UpdateClassRequest,
    UpdateStudentsRequest,
)
from app.utils.school_year import get_current_school_year, get_current_semester

router = APIRouter()


def _to_brief(cls: Class, student_count: int | None = None) -> ClassBrief:
    return ClassBrief(
        id=cls.id, name=cls.name, grade=cls.grade, subject=cls.subject,
        color=cls.color, text_color=cls.text_color,
        student_count=student_count if student_count is not None else len(cls.students),
        note=cls.note,
        school_year=cls.school_year, semester=cls.semester, status=cls.status,
        archived_at=cls.archived_at,
    )


@router.get("", response_model=list[ClassBrief], response_model_by_alias=True)
async def list_classes(
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
    school_year: int | None = Query(default=None, ge=2000, le=2100),
    semester: Literal["first", "second"] | None = Query(default=None),
    include_archived: bool = Query(default=False),
) -> list[ClassBrief]:
    """List classes for the current teacher.

    Default filter: current school year / semester / active only.
    Omit ``school_year`` / ``semester`` to skip those filters; pass
    ``include_archived=true`` to include archived classes.
    """
    stmt = select(Class).where(Class.teacher_id == teacher.id)
    if school_year is not None:
        stmt = stmt.where(Class.school_year == school_year)
    if semester is not None:
        stmt = stmt.where(Class.semester == semester)
    if not include_archived:
        stmt = stmt.where(Class.status == "active")
    stmt = stmt.order_by(Class.id)
    res = await db.execute(stmt)
    classes = list(res.scalars().all())
    return [_to_brief(c) for c in classes]


async def _generate_class_id(db: AsyncSession) -> str:
    """Auto-generate a class id. Uses class-A..Z first, then class-{n} fallback."""
    res = await db.execute(select(Class.id))
    existing = {row[0] for row in res.all()}
    for code in (chr(c) for c in range(ord("A"), ord("Z") + 1)):
        candidate = f"class-{code}"
        if candidate not in existing:
            return candidate
    n = len(existing) + 1
    while f"class-{n}" in existing:
        n += 1
    return f"class-{n}"


@router.post("", response_model=ClassBrief, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: CreateClassRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassBrief:
    new_id = await _generate_class_id(db)
    cls = Class(
        id=new_id,
        name=payload.name,
        grade=payload.grade,
        subject=payload.subject,
        color=payload.color,
        text_color=payload.text_color,
        teacher_id=teacher.id,
        note=payload.note,
        school_year=payload.school_year if payload.school_year is not None else get_current_school_year(),
        semester=payload.semester if payload.semester is not None else get_current_semester(),
        status="active",
        archived_at=None,
    )
    db.add(cls)
    await db.commit()
    await db.refresh(cls)
    return _to_brief(cls, student_count=0)


@router.patch("/{class_id}", response_model=ClassBrief, response_model_by_alias=True)
async def update_class(
    class_id: str,
    payload: UpdateClassRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassBrief:
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    data = payload.model_dump(exclude_unset=True)
    for key in ("name", "grade", "subject", "color", "text_color", "note", "school_year", "semester"):
        if key in data:
            setattr(cls, key, data[key])
    await db.commit()
    await db.refresh(cls)
    return _to_brief(cls)


@router.post("/{class_id}/archive", response_model=ClassBrief, response_model_by_alias=True)
async def archive_class(
    class_id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassBrief:
    """Soft-archive: status='archived', archived_at=now. History data preserved."""
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    if cls.status != "archived":
        cls.status = "archived"
        cls.archived_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(cls)
    return _to_brief(cls)


@router.post("/{class_id}/unarchive", response_model=ClassBrief, response_model_by_alias=True)
async def unarchive_class(
    class_id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassBrief:
    """Restore an archived class to active."""
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    if cls.status != "active":
        cls.status = "active"
        cls.archived_at = None
        await db.commit()
        await db.refresh(cls)
    return _to_brief(cls)


@router.get("/{class_id}", response_model=ClassDetail, response_model_by_alias=True)
async def get_class(
    class_id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassDetail:
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    students = sorted(cls.students, key=lambda s: s.seat)
    user_map = {}
    if students:
        res = await db.execute(select(User).where(User.id.in_([s.user_id for s in students])))
        user_map = {u.id: u for u in res.scalars().all()}
    return ClassDetail(
        id=cls.id, name=cls.name, grade=cls.grade, subject=cls.subject,
        color=cls.color, text_color=cls.text_color,
        student_count=len(students), note=cls.note,
        school_year=cls.school_year, semester=cls.semester, status=cls.status,
        archived_at=cls.archived_at,
        students=[
            StudentBrief(
                id=s.user_id, name=s.name, seat=s.seat,
                password_was_default=user_map.get(s.user_id).password_was_default
                if user_map.get(s.user_id) else True,
            )
            for s in students
        ],
    )


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a class together with all its students and assignments."""
    from app.db.models import Assignment

    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")

    # Delete student User rows (CASCADE removes Student rows)
    for stu in list(cls.students):
        user = await db.get(User, stu.user_id)
        if user:
            await db.delete(user)

    # Delete assignments belonging to this class
    res = await db.execute(
        select(Assignment).where(Assignment.class_id == class_id),
    )
    for assignment in res.scalars().all():
        await db.delete(assignment)

    await db.delete(cls)
    await db.commit()


def _account_for(class_id: str, seat: int) -> str:
    """Derive a unique student account from class id + seat number.

    Format: ``115{offset + seat:03d}`` where offset = letter_index * 100.
    class-A → 0, class-B → 100, … class-Z → 2500.
    Numeric fallback ids (class-27 etc.) start at offset 2600+.
    """
    suffix = class_id.removeprefix("class-")
    if len(suffix) == 1 and suffix.isalpha():
        offset = (ord(suffix.upper()) - ord("A")) * 100
    else:
        offset = 2600 + int(suffix, 36) * 100
    return f"115{(offset + seat):03d}"


@router.put("/{class_id}/students", response_model=ClassDetail, response_model_by_alias=True)
async def update_class_students(
    class_id: str,
    payload: UpdateStudentsRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassDetail:
    """Replace the entire roster for a class.

    - Existing students whose account is no longer in the payload → deleted (User cascades).
    - Students with new accounts → User + Student rows created with default password.
    - Existing accounts present in payload → name/seat updated.
    """
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")

    # Validate seat uniqueness in payload
    seats = [s.seat for s in payload.students]
    if len(set(seats)) != len(seats):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "DUPLICATE_SEAT")

    incoming_accounts: set[str] = set()
    for s in payload.students:
        account = s.account or _account_for(class_id, s.seat)
        incoming_accounts.add(account)

    # Delete students no longer in the payload
    existing = list(cls.students)
    for stu in existing:
        if stu.user_id not in incoming_accounts:
            user = await db.get(User, stu.user_id)
            if user:
                await db.delete(user)  # cascade removes Student row

    # Upsert each incoming student
    for s in payload.students:
        account = s.account or _account_for(class_id, s.seat)
        user = await db.get(User, account)
        if user is None:
            user = User(
                id=account, account=account, password=account,
                role="student", password_was_default=True,
            )
            db.add(user)
            db.add(Student(user_id=account, name=s.name, seat=s.seat, class_id=class_id))
        else:
            stu = await db.get(Student, account)
            if stu and stu.class_id != class_id:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"ACCOUNT_IN_OTHER_CLASS:{account}",
                )
            if stu:
                stu.name = s.name
                stu.seat = s.seat
            else:
                db.add(Student(user_id=account, name=s.name, seat=s.seat, class_id=class_id))

    await db.commit()
    await db.refresh(cls)
    # re-fetch for response
    return await get_class(class_id=class_id, teacher=teacher, db=db)
