"""TreatmentSession / TreatmentMessage tables. See spec-11 §3.13~3.14."""
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class TreatmentSession(Base):
    __tablename__ = "treatment_sessions"
    __table_args__ = (
        CheckConstraint("status IN ('active','completed')", name="treatment_sessions_status_chk"),
        UniqueConstraint(
            "scenario_quiz_id", "student_id", name="treatment_sessions_unique_idx",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    scenario_quiz_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("scenario_quizzes.id"), nullable=False,
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    current_question_index: Mapped[int] = mapped_column(default=1, nullable=False)
    started_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    messages: Mapped[list["TreatmentMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan",
        order_by="TreatmentMessage.created_at",
    )


class TreatmentMessage(Base):
    __tablename__ = "treatment_messages"
    __table_args__ = (
        CheckConstraint("role IN ('ai','student')", name="treatment_messages_role_chk"),
        CheckConstraint(
            "phase IS NULL OR phase IN ('diagnosis','apprenticeship','completed')",
            name="treatment_messages_phase_chk",
        ),
        CheckConstraint(
            "stage IS NULL OR stage IN ('claim','evidence','reasoning','revise','complete')",
            name="treatment_messages_stage_chk",
        ),
        CheckConstraint(
            "step IS NULL OR (step BETWEEN 0 AND 7)", name="treatment_messages_step_chk",
        ),
        CheckConstraint(
            "hint_level IS NULL OR (hint_level BETWEEN 0 AND 3)",
            name="treatment_messages_hint_chk",
        ),
        Index(
            "treatment_messages_session_q_idx",
            "session_id", "question_index", "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("treatment_sessions.id", ondelete="CASCADE"), nullable=False,
    )
    question_index: Mapped[int] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(String(8), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[str | None] = mapped_column(String(16), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(16), nullable=True)
    step: Mapped[int | None] = mapped_column(nullable=True)
    hint_level: Mapped[int | None] = mapped_column(nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_restatement: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    session: Mapped[TreatmentSession] = relationship(back_populates="messages")
