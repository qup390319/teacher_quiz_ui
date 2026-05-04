"""User / Teacher / Student tables. See spec-11 §3.1~3.4."""
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('teacher','student')", name="users_role_chk"),
        Index("users_role_idx", "role"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    password_was_default: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), server_onupdate=func.now(), nullable=False,
    )

    teacher: Mapped["Teacher | None"] = relationship(back_populates="user", uselist=False)
    student: Mapped["Student | None"] = relationship(back_populates="user", uselist=False)


class Teacher(Base):
    __tablename__ = "teachers"

    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="teacher")


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint("seat > 0", name="students_seat_pos"),
        UniqueConstraint("class_id", "seat", name="students_class_seat_idx"),
        Index("students_class_idx", "class_id"),
    )

    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    seat: Mapped[int] = mapped_column(nullable=False)
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id"), nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="student")
    class_: Mapped["Class"] = relationship(back_populates="students")  # type: ignore[name-defined] # noqa: F821
