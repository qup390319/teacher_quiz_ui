"""Class table. See spec-11 §3.3."""
from datetime import datetime
from typing import Literal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Class(Base):
    __tablename__ = "classes"
    __table_args__ = (
        Index("classes_teacher_idx", "teacher_id"),
        Index("classes_term_idx", "teacher_id", "school_year", "semester", "status"),
        CheckConstraint(
            "semester IN ('first', 'second')",
            name="classes_semester_chk",
        ),
        CheckConstraint(
            "status IN ('active', 'archived')",
            name="classes_status_chk",
        ),
        CheckConstraint(
            "(status = 'archived' AND archived_at IS NOT NULL) "
            "OR (status = 'active' AND archived_at IS NULL)",
            name="classes_archived_consistency_chk",
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    grade: Mapped[str] = mapped_column(String(16), nullable=False)
    subject: Mapped[str] = mapped_column(String(32), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    text_color: Mapped[str] = mapped_column(String(7), nullable=False)
    teacher_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    school_year: Mapped[int] = mapped_column(Integer, nullable=False, server_default="2025")
    semester: Mapped[Literal["first", "second"]] = mapped_column(
        String(8), nullable=False, server_default="second",
    )
    status: Mapped[Literal["active", "archived"]] = mapped_column(
        String(16), nullable=False, server_default="active",
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    students: Mapped[list["Student"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        back_populates="class_", lazy="selectin", passive_deletes=True,
    )
