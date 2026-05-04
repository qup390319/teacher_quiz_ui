"""Quiz / QuizQuestion / QuizOption tables. See spec-11 §3.5~3.7."""
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
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Quiz(Base):
    __tablename__ = "quizzes"
    __table_args__ = (
        CheckConstraint("status IN ('draft','published')", name="quizzes_status_chk"),
        Index("quizzes_status_idx", "status"),
        Index("quizzes_created_by_idx", "created_by"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    knowledge_node_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), default=list, nullable=False, server_default="{}",
    )
    created_by: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), server_onupdate=func.now(), nullable=False,
    )

    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan", lazy="selectin",
        order_by="QuizQuestion.order_index",
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    __table_args__ = (
        UniqueConstraint("quiz_id", "order_index", name="quiz_questions_order_idx"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    quiz_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False,
    )
    order_index: Mapped[int] = mapped_column(nullable=False)
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    knowledge_node_id: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    quiz: Mapped[Quiz] = relationship(back_populates="questions")
    options: Mapped[list["QuizOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", lazy="selectin",
        order_by="QuizOption.tag",
    )


class QuizOption(Base):
    __tablename__ = "quiz_options"
    __table_args__ = (
        CheckConstraint("tag IN ('A','B','C','D')", name="quiz_options_tag_chk"),
        UniqueConstraint("question_id", "tag", name="quiz_options_question_tag_idx"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False,
    )
    tag: Mapped[str] = mapped_column(String(1), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    diagnosis: Mapped[str] = mapped_column(String(16), nullable=False)

    question: Mapped[QuizQuestion] = relationship(back_populates="options")
