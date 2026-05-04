"""Auth endpoints. See spec-13 §6."""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.deps import get_current_user
from app.auth.jwt import create_token
from app.auth.password import verify_password
from app.config import settings
from app.db.models import Student, Teacher, User
from app.db.session import get_db
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUser,
    LoginRequest,
    LoginResponse,
    OkResponse,
)

router = APIRouter()


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.JWT_EXPIRES_HOURS * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


async def _build_current_user(db: AsyncSession, user: User) -> CurrentUser:
    name: str | None = None
    class_id: str | None = None
    seat: int | None = None
    if user.role == "teacher":
        teacher = await db.get(Teacher, user.id)
        if teacher:
            name = teacher.name
    elif user.role == "student":
        student = await db.get(Student, user.id)
        if student:
            name = student.name
            class_id = student.class_id
            seat = student.seat
    return CurrentUser(
        id=user.id,
        account=user.account,
        role=user.role,
        name=name,
        class_id=class_id,
        seat=seat,
        password_was_default=user.password_was_default,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    result = await db.execute(select(User).where(User.account == payload.account))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS")

    token = create_token(user_id=user.id, role=user.role)
    _set_session_cookie(response, token)
    current = await _build_current_user(db, user)
    return LoginResponse(user=current)


@router.post("/logout")
async def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=CurrentUser)
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    return await _build_current_user(db, user)


@router.patch("/password", response_model=OkResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OkResponse:
    if not verify_password(payload.old_password, user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "OLD_PASSWORD_MISMATCH")
    user.password = payload.new_password
    user.password_was_default = (payload.new_password == user.account)
    await db.commit()
    return OkResponse(password_was_default=user.password_was_default)
