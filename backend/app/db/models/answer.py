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
        CheckConstraint(
            "quadrant IS NULL OR quadrant IN ('TT','TF','FT','FF')",
            name="student_answers_quadrant_chk",
        ),
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
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    # 存「卷內題序 order_index」(1..N)，非 quiz_questions 全域 PK，故不設外鍵。
    # 要還原題目/題組須先經 assignment.quiz_id 再以 (quiz_id, order_index) 反查。
    # spec-11 §3.11、deviations.md。
    question_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    selected_tag: Mapped[str] = mapped_column(String(1), nullable=False)
    # two-tier 第二層所選理由 tag（甲/乙/丙…）；single 題為 NULL。spec-04、spec-11。
    reason_tag: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # 四象限判定 TT/TF/FT/FF；single 題以答案對錯映射為 TT/FF；舊資料為 NULL。
    quadrant: Mapped[str | None] = mapped_column(String(2), nullable=True)
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
    cause_ids: Mapped[list[int] | None] = mapped_column(JSONB, nullable=True)
    # 答錯主導方向（spec-09 §12.4a）：EXPLANATION / DEFINITION / OBSERVATION / NULL
    error_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    answer: Mapped[StudentAnswer] = relationship(back_populates="followup")
