"""StudentAnswer / FollowupResult tables. See spec-11 §3.11~3.12."""
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class StudentAnswer(Base):
    __tablename__ = "student_answers"
    __table_args__ = (
        CheckConstraint("selected_tag IN ('A','B','C','D')", name="student_answers_tag_chk"),
        UniqueConstraint(
            "assignment_id", "student_id", "question_id",
            name="student_answers_unique_idx",
        ),
        Index("student_answers_student_idx", "student_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    assignment_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False,
    )
    student_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=False,
    )
    question_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("quiz_questions.id"), nullable=False,
    )
    selected_tag: Mapped[str] = mapped_column(String(1), nullable=False)
    diagnosis: Mapped[str] = mapped_column(String(16), nullable=False)
    answered_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    followup: Mapped["FollowupResult | None"] = relationship(
        back_populates="answer", uselist=False, cascade="all, delete-orphan",
    )


class FollowupResult(Base):
    __tablename__ = "followup_results"
    __table_args__ = (
        CheckConstraint(
            "final_status IN ('CORRECT','MISCONCEPTION','UNCERTAIN')",
            name="followup_status_chk",
        ),
        CheckConstraint(
            "reasoning_quality IN ('SOLID','PARTIAL','WEAK','GUESSING')",
            name="followup_quality_chk",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_answer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("student_answers.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    conversation_log: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, nullable=False, server_default="[]",
    )
    final_status: Mapped[str] = mapped_column(String(32), nullable=False)
    misconception_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    reasoning_quality: Mapped[str] = mapped_column(String(16), nullable=False)
    status_change: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False, server_default="{}",
    )
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    answer: Mapped[StudentAnswer] = relationship(back_populates="followup")
