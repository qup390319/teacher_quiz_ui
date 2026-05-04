"""FastAPI Depends for authentication & role checks."""
import jwt as pyjwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_token
from app.config import settings
from app.db.models import User
from app.db.session import get_db


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "NOT_AUTHENTICATED")
    try:
        payload = decode_token(token)
    except pyjwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN") from exc

    user = await db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "USER_NOT_FOUND")
    return user


async def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role != "teacher":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "TEACHER_ONLY")
    return user


async def require_student(user: User = Depends(get_current_user)) -> User:
    if user.role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "STUDENT_ONLY")
    return user
