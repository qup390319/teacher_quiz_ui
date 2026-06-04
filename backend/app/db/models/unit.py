"""Unit table — 課程單元（W4）。See spec-11 §3.17."""
from datetime import datetime

from sqlalchemy import TIMESTAMP, CheckConstraint, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (
        CheckConstraint(
            "grade_band IN ('lower','middle','upper')",
            name="units_grade_band_chk",
        ),
        CheckConstraint(
            "status IN ('active','archived')",
            name="units_status_chk",
        ),
        CheckConstraint(
            "type IN ('unit','subtheme')",
            name="units_type_chk",
        ),
        Index("units_grade_band_idx", "grade_band", "display_order"),
        # 同一 code 在不同年段可重複（middle/upper 都有 'ab'）— migration 0022
        UniqueConstraint("code", "grade_band", name="units_code_grade_band_uq"),
    )

    id: Mapped[str] = mapped_column(String(64), nullable=False, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    grade_band: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    type: Mapped[str] = mapped_column(String(16), default="subtheme", nullable=False)
    # 是否為系統現有知識節點所屬的單元（W4 過渡用；目前為「水溶液」）。
    # 標 True 的單元不可封存或刪除，避免破壞既有題組。
    is_system_current: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        server_onupdate=func.now(), nullable=False,
    )
