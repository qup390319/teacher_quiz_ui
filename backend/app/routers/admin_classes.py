"""Admin-only class overview + write endpoints.

GET 端點：列出跨教師班級 + 詳情。
POST /api/admin/classes：管理員建立班級並指定所屬教師。
POST /api/admin/classes/:id/students：管理員手動新增學生。
"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import Class, Student, Teacher, User
from app.db.session import get_db
from app.routers.classes import (
    _account_for,
    _generate_class_id,
    _get_class_for_admin_or_teacher,
)
from app.schemas.class_ import (
    AddStudentRequest,
    AdminCreateClassRequest,
    ClassBrief,
    ClassDetail,
    StudentBrief,
)
from app.utils.school_year import get_current_school_year, get_current_semester

router = APIRouter()


@router.post("", response_model=ClassBrief, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def admin_create_class(
    payload: AdminCreateClassRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ClassBrief:
    """Admin creates a class and assigns it to a specific teacher."""
    teacher = await db.get(User, payload.teacher_id)
    if teacher is None or teacher.role != "teacher":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "TEACHER_NOT_FOUND")

    new_id = await _generate_class_id(db)
    cls = Class(
        id=new_id,
        name=payload.name,
        grade=payload.grade,
        subject=payload.subject,
        color=payload.color,
        text_color=payload.text_color,
        teacher_id=payload.teacher_id,
        note=payload.note,
        school_year=payload.school_year if payload.school_year is not None else get_current_school_year(),
        semester=payload.semester if payload.semester is not None else get_current_semester(),
        status="active",
        archived_at=None,
    )
    db.add(cls)
    await db.commit()
    await db.refresh(cls)
    return ClassBrief(
        id=cls.id, name=cls.name, grade=cls.grade, subject=cls.subject,
        color=cls.color, text_color=cls.text_color, student_count=0,
        note=cls.note, school_year=cls.school_year, semester=cls.semester,
        status=cls.status, archived_at=cls.archived_at, teacher_id=cls.teacher_id,
    )


@router.get("", response_model=list[ClassBrief], response_model_by_alias=True)
async def admin_list_classes(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    teacher_id: str | None = Query(default=None, description="篩選特定教師"),
    school_year: int | None = Query(default=None, ge=2000, le=2100),
    semester: Literal["first", "second"] | None = Query(default=None),
    status_filter: Literal["active", "archived", "all"] = Query(default="all", alias="status"),
) -> list[ClassBrief]:
    """List all classes across teachers for the admin overview."""
    stmt = select(Class)
    if teacher_id is not None:
        stmt = stmt.where(Class.teacher_id == teacher_id)
    if school_year is not None:
        stmt = stmt.where(Class.school_year == school_year)
    if semester is not None:
        stmt = stmt.where(Class.semester == semester)
    if status_filter != "all":
        stmt = stmt.where(Class.status == status_filter)
    stmt = stmt.order_by(Class.school_year.desc(), Class.id)

    classes = list((await db.execute(stmt)).scalars().all())

    # Pre-compute student counts in one query.
    count_rows = (await db.execute(
        select(Student.class_id, func.count(Student.user_id))
        .group_by(Student.class_id),
    )).all()
    counts = {cid: int(n) for cid, n in count_rows}

    return [
        ClassBrief(
            id=c.id, name=c.name, grade=c.grade, subject=c.subject,
            color=c.color, text_color=c.text_color,
            student_count=counts.get(c.id, 0), note=c.note,
            school_year=c.school_year, semester=c.semester, status=c.status,
            archived_at=c.archived_at, teacher_id=c.teacher_id,
        )
        for c in classes
    ]


@router.get("/{class_id}", response_model=ClassDetail, response_model_by_alias=True)
async def admin_get_class(
    class_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ClassDetail:
    return await _get_class_for_admin_or_teacher(class_id, admin, db)


@router.get("/{class_id}/teacher", response_model=dict)
async def admin_get_class_teacher(
    class_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Side query：取得該班的教師（用於 UI 顯示「所屬教師」欄位）。"""
    cls = await db.get(Class, class_id)
    if cls is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    if cls.teacher_id is None:
        return {"teacherId": None, "teacherName": None, "teacherAccount": None}
    teacher_user = await db.get(User, cls.teacher_id)
    teacher_profile = await db.get(Teacher, cls.teacher_id)
    return {
        "teacherId": cls.teacher_id,
        "teacherAccount": teacher_user.account if teacher_user else None,
        "teacherName": teacher_profile.name if teacher_profile else None,
    }


@router.post("/{class_id}/students", response_model=ClassDetail, response_model_by_alias=True)
async def admin_add_student(
    class_id: str,
    payload: AddStudentRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ClassDetail:
    """Admin manually adds a single student to a class."""
    cls = await db.get(Class, class_id)
    if cls is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")

    existing_seats = {s.seat for s in (cls.students or [])}
    if payload.seat in existing_seats:
        raise HTTPException(status.HTTP_409_CONFLICT, "DUPLICATE_SEAT")

    account = _account_for(class_id, payload.seat)
    existing_user = await db.get(User, account)
    if existing_user is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"ACCOUNT_ALREADY_EXISTS:{account}")

    db.add(User(
        id=account, account=account, password=account,
        role="student", password_was_default=True, is_active=True,
    ))
    db.add(Student(
        user_id=account, name=payload.name, seat=payload.seat, class_id=class_id,
    ))
    await db.commit()
    await db.refresh(cls)
    return await _get_class_for_admin_or_teacher(class_id, admin, db)
