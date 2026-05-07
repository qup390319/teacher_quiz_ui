"""Assignment table. See spec-11 §3.10."""
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.models.assignment_student import AssignmentStudent


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (
        CheckConstraint("type IN ('diagnosis','scenario')", name="assignments_type_chk"),
        CheckConstraint("status IN ('active','completed')", name="assignments_status_chk"),
        CheckConstraint(
            "target_type IN ('class','students')", name="assignments_target_type_chk",
        ),
        CheckConstraint(
            "(type='diagnosis' AND quiz_id IS NOT NULL AND scenario_quiz_id IS NULL) "
            "OR (type='scenario' AND scenario_quiz_id IS NOT NULL AND quiz_id IS NULL)",
            name="assignments_quiz_xor",
        ),
        Index("assignments_class_due_idx", "class_id", "due_date"),
        Index("assignments_quiz_idx", "quiz_id"),
        Index("assignments_scenario_idx", "scenario_quiz_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(16), default="diagnosis", nullable=False)
    quiz_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("quizzes.id"), nullable=True,
    )
    scenario_quiz_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("scenario_quizzes.id"), nullable=True,
    )
    class_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("classes.id"), nullable=False,
    )
    target_type: Mapped[str] = mapped_column(
        String(16), default="class", nullable=False,
    )
    assigned_at: Mapped[date] = mapped_column(
        Date, server_default=func.current_date(), nullable=False,
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    students: Mapped[list[AssignmentStudent]] = relationship(
        AssignmentStudent,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
