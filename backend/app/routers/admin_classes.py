"""Admin-only class overview endpoints (W3).

對應 /admin/classes 頁面，列出跨教師班級 + 詳情。
寫入動作（建立 / 編輯 / 封存 / 刪除）仍由教師端 `/api/classes/*` 走，避免重複維護。
"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import Class, Student, Teacher, User
from app.db.session import get_db
from app.routers.classes import _get_class_for_admin_or_teacher
from app.schemas.class_ import ClassBrief, ClassDetail

router = APIRouter()


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
