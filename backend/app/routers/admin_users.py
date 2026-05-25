"""Admin user-management endpoints. See spec-13 §7.4 / spec-10.

W2 of admin rollout: list / create-teacher / disable / enable / reset-password / detail.
All endpoints require `require_admin`.
"""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db.models import Class, Student, Teacher, User
from app.db.session import get_db
from app.schemas.admin import (
    ActiveFilter,
    AdminPasswordResetResponse,
    AdminUserDetail,
    AdminUserListItem,
    AdminUsersListResponse,
    AdminUserStatusResponse,
    CreateTeacherRequest,
    RoleFilter,
)

router = APIRouter()


async def _build_list_item(
    db: AsyncSession, user: User,
) -> AdminUserListItem:
    """Assemble a list-row payload for a user. No plaintext password."""
    name: str | None = None
    class_count: int | None = None
    student_count: int | None = None
    class_id: str | None = None
    class_name: str | None = None
    seat: int | None = None

    if user.role == "teacher":
        teacher = await db.get(Teacher, user.id)
        if teacher:
            name = teacher.name
        # Count classes owned by this teacher (active + archived).
        c_res = await db.execute(
            select(func.count(Class.id)).where(Class.teacher_id == user.id),
        )
        class_count = int(c_res.scalar() or 0)
        # Count students across those classes.
        s_res = await db.execute(
            select(func.count(Student.user_id))
            .join(Class, Class.id == Student.class_id)
            .where(Class.teacher_id == user.id),
        )
        student_count = int(s_res.scalar() or 0)
    elif user.role == "student":
        student = await db.get(Student, user.id)
        if student:
            name = student.name
            class_id = student.class_id
            seat = student.seat
            cls = await db.get(Class, student.class_id)
            if cls:
                class_name = cls.name

    return AdminUserListItem(
        id=user.id,
        account=user.account,
        role=user.role,
        name=name,
        class_count=class_count,
        student_count=student_count,
        class_id=class_id,
        class_name=class_name,
        seat=seat,
        is_active=user.is_active,
        password_was_default=user.password_was_default,
        disabled_at=user.disabled_at,
        disabled_by=user.disabled_by,
        created_at=user.created_at,
    )


@router.get("", response_model=AdminUsersListResponse)
async def list_users(
    role: RoleFilter | None = Query(default=None),
    q: str | None = Query(default=None, description="搜尋帳號或姓名"),
    active: ActiveFilter = Query(default="all"),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUsersListResponse:
    """List teachers or students for the admin console.

    - `role`：可選，未指定時回兩種角色（不含 admin 自身）。
    - `q`：在 `account` 或 `users` 的關聯姓名（teacher.name / student.name）模糊搜尋。
    - `active`：active / disabled / all。
    """
    # 未指定 role：預設不顯示 admin 自己（後台目前只管教師與學生）
    role_clause = (User.role == role) if role is not None else (User.role != "admin")
    stmt = select(User).where(role_clause)

    if active == "active":
        stmt = stmt.where(User.is_active.is_(True))
    elif active == "disabled":
        stmt = stmt.where(User.is_active.is_(False))

    # Count before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar() or 0)

    stmt = stmt.order_by(User.role.asc(), User.account.asc()).limit(limit).offset(offset)
    users = list((await db.execute(stmt)).scalars().all())

    items: list[AdminUserListItem] = []
    needle = (q or "").strip().lower()
    for u in users:
        item = await _build_list_item(db, u)
        if needle:
            haystack = " ".join(filter(None, [u.account.lower(), (item.name or "").lower()]))
            if needle not in haystack:
                continue
        items.append(item)

    return AdminUsersListResponse(items=items, total=total)


@router.get("/{user_id}", response_model=AdminUserDetail)
async def get_user(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND")
    base = await _build_list_item(db, user)
    return AdminUserDetail(**base.model_dump(by_alias=False), password=user.password)


@router.post("", response_model=AdminUserListItem, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: CreateTeacherRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserListItem:
    """Create a new teacher account. Account becomes the user_id; default password = account."""
    account = payload.account.strip()
    name = payload.name.strip()
    if not account or not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "MISSING_FIELDS")
    existing = await db.get(User, account)
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "ACCOUNT_EXISTS")

    user = User(
        id=account, account=account, password=account,
        role="teacher", password_was_default=True, is_active=True,
    )
    teacher = Teacher(user_id=account, name=name)
    db.add(user)
    db.add(teacher)
    await db.commit()
    await db.refresh(user)
    return await _build_list_item(db, user)


@router.patch("/{user_id}/disable", response_model=AdminUserStatusResponse)
async def disable_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserStatusResponse:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND")
    if user.role == "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "CANNOT_DISABLE_ADMIN")
    user.is_active = False
    user.disabled_at = datetime.now(UTC)
    user.disabled_by = admin.id
    await db.commit()
    return AdminUserStatusResponse(is_active=False)


@router.patch("/{user_id}/enable", response_model=AdminUserStatusResponse)
async def enable_user(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserStatusResponse:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND")
    user.is_active = True
    user.disabled_at = None
    user.disabled_by = None
    await db.commit()
    return AdminUserStatusResponse(is_active=True)


@router.post("/{user_id}/reset-password", response_model=AdminPasswordResetResponse)
async def reset_password(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminPasswordResetResponse:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND")
    user.password = user.account
    user.password_was_default = True
    await db.commit()
    return AdminPasswordResetResponse(password=user.password)
