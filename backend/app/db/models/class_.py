"""Class table. See spec-11 §3.3."""
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Class(Base):
    __tablename__ = "classes"
    __table_args__ = (
        Index("classes_teacher_idx", "teacher_id"),
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
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    students: Mapped[list["Student"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        back_populates="class_", lazy="selectin",
    )
