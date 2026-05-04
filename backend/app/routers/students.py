"""Student endpoints. See spec-13 §6.5~6.6."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.db.models import Student, User
from app.db.session import get_db
from app.schemas.student import ResetPasswordResponse, StudentDetail

router = APIRouter()


async def _load_student(db: AsyncSession, student_id: str) -> tuple[User, Student]:
    user = await db.get(User, student_id)
    if user is None or user.role != "student":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "STUDENT_NOT_FOUND")
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "STUDENT_PROFILE_MISSING")
    return user, student


@router.get("/{student_id}", response_model=StudentDetail)
async def get_student(
    student_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> StudentDetail:
    user, student = await _load_student(db, student_id)
    return StudentDetail(
        id=user.id,
        account=user.account,
        name=student.name,
        seat=student.seat,
        class_id=student.class_id,
        password=user.password,
        password_was_default=user.password_was_default,
    )


@router.post("/{student_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_student_password(
    student_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    user, _ = await _load_student(db, student_id)
    user.password = user.account
    user.password_was_default = True
    await db.commit()
    return ResetPasswordResponse(password=user.password)
