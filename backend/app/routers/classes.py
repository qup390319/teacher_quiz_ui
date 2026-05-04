"""Class / student listings. See spec-04 §1.4 hooks (useClasses / useClass).

Mutation: PUT /api/classes/{class_id}/students replaces the roster wholesale
(matches the existing frontend `updateClassStudents` pattern).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.db.models import Class, Student, User
from app.db.session import get_db
from app.schemas.class_ import (
    ClassBrief,
    ClassDetail,
    StudentBrief,
    UpdateStudentsRequest,
)

router = APIRouter()


@router.get("", response_model=list[ClassBrief], response_model_by_alias=True)
async def list_classes(
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[ClassBrief]:
    res = await db.execute(select(Class).order_by(Class.id))
    classes = list(res.scalars().all())
    return [
        ClassBrief(
            id=c.id, name=c.name, grade=c.grade, subject=c.subject,
            color=c.color, text_color=c.text_color,
            student_count=len(c.students),
        )
        for c in classes
    ]


@router.get("/{class_id}", response_model=ClassDetail, response_model_by_alias=True)
async def get_class(
    class_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassDetail:
    cls = await db.get(Class, class_id)
    if cls is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    students = sorted(cls.students, key=lambda s: s.seat)
    user_map = {}
    if students:
        res = await db.execute(select(User).where(User.id.in_([s.user_id for s in students])))
        user_map = {u.id: u for u in res.scalars().all()}
    return ClassDetail(
        id=cls.id, name=cls.name, grade=cls.grade, subject=cls.subject,
        color=cls.color, text_color=cls.text_color,
        student_count=len(students),
        students=[
            StudentBrief(
                id=s.user_id, name=s.name, seat=s.seat,
                password_was_default=user_map.get(s.user_id).password_was_default
                if user_map.get(s.user_id) else True,
            )
            for s in students
        ],
    )


CLASS_ACCOUNT_OFFSET = {"class-A": 0, "class-B": 100, "class-C": 200}


def _account_for(class_id: str, seat: int) -> str:
    """Mirror the seed convention so manually-added students get a sensible account."""
    offset = CLASS_ACCOUNT_OFFSET.get(class_id, 900)
    return f"115{(offset + seat):03d}"


@router.put("/{class_id}/students", response_model=ClassDetail, response_model_by_alias=True)
async def update_class_students(
    class_id: str,
    payload: UpdateStudentsRequest,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassDetail:
    """Replace the entire roster for a class.

    - Existing students whose account is no longer in the payload → deleted (User cascades).
    - Students with new accounts → User + Student rows created with default password.
    - Existing accounts present in payload → name/seat updated.
    """
    cls = await db.get(Class, class_id)
    if cls is None:
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
            # Update existing student
            stu = await db.get(Student, account)
            if stu:
                stu.name = s.name
                stu.seat = s.seat
                stu.class_id = class_id

    await db.commit()
    await db.refresh(cls)
    # re-fetch for response
    return await get_class(class_id=class_id, _teacher=_teacher, db=db)
