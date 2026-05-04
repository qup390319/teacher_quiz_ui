"""ScenarioQuiz / ScenarioQuestion tables. See spec-11 §3.8~3.9."""
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
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ScenarioQuiz(Base):
    __tablename__ = "scenario_quizzes"
    __table_args__ = (
        CheckConstraint("status IN ('draft','published')", name="scenario_quizzes_status_chk"),
        Index("scenario_quizzes_target_node_idx", "target_node_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    target_node_id: Mapped[str] = mapped_column(String(32), nullable=False)
    target_misconceptions: Mapped[list[str]] = mapped_column(
        ARRAY(String(16)), default=list, nullable=False, server_default="{}",
    )
    created_by: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), server_onupdate=func.now(), nullable=False,
    )

    questions: Mapped[list["ScenarioQuestion"]] = relationship(
        back_populates="scenario_quiz", cascade="all, delete-orphan", lazy="selectin",
        order_by="ScenarioQuestion.order_index",
    )


class ScenarioQuestion(Base):
    __tablename__ = "scenario_questions"
    __table_args__ = (
        UniqueConstraint("scenario_quiz_id", "order_index", name="scenario_questions_order_idx"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scenario_quiz_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("scenario_quizzes.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    scenario_text: Mapped[str] = mapped_column(Text, nullable=False)
    scenario_images: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, nullable=False, server_default="[]",
    )
    scenario_image_zoomable: Mapped[bool] = mapped_column(default=False, nullable=False)
    initial_message: Mapped[str] = mapped_column(Text, nullable=False)
    expert_model: Mapped[str] = mapped_column(Text, nullable=False)
    target_misconceptions: Mapped[list[str]] = mapped_column(
        ARRAY(String(16)), default=list, nullable=False, server_default="{}",
    )

    scenario_quiz: Mapped[ScenarioQuiz] = relationship(back_populates="questions")
