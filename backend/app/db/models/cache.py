"""AiSummaryCache table. See spec-11 §3.15."""
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class AiSummaryCache(Base):
    __tablename__ = "ai_summary_cache"
    __table_args__ = (
        CheckConstraint("scope IN ('grade','class')", name="ai_summary_cache_scope_chk"),
        UniqueConstraint(
            "scope", "scope_id", "quiz_id", name="ai_summary_cache_unique_idx",
        ),
        Index("ai_summary_cache_expires_idx", "expires_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    scope_id: Mapped[str] = mapped_column(String(64), nullable=False)
    quiz_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("quizzes.id"), nullable=False,
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    citations: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, nullable=False, server_default="[]",
    )
    generated_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
