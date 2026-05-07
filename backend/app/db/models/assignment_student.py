"""Association table for per-student scenario assignments. See spec-11 §3.10b."""
from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AssignmentStudent(Base):
    __tablename__ = "assignment_students"
    __table_args__ = (
        Index("assignment_students_student_idx", "student_id"),
    )

    assignment_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    student_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id"),
        primary_key=True,
    )
