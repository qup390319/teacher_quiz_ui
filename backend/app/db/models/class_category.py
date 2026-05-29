"""ClassCategory table — teacher-owned class grouping. See spec-11."""
from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class ClassCategory(Base):
    __tablename__ = "class_categories"
    __table_args__ = (
        UniqueConstraint("teacher_id", "name", name="class_categories_teacher_name_uq"),
        Index("class_categories_teacher_order_idx", "teacher_id", "sort_order"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False,
    )
