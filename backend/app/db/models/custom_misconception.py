"""CustomMisconception table — 教師自訂迷思（per-teacher 私有）。spec-04 §2.6 / spec-11 §3.13."""
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class CustomMisconception(Base):
    """單一教師私有的自訂迷思。每位教師只看得到自己建立的，不跨帳號共享。"""

    __tablename__ = "custom_misconceptions"
    __table_args__ = (
        Index("custom_misconceptions_teacher_idx", "teacher_id"),
        Index("custom_misconceptions_teacher_node_idx", "teacher_id", "node_id"),
    )

    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    node_id: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    student_detail: Mapped[str] = mapped_column(Text, nullable=False)
    confirm_question: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False,
    )
