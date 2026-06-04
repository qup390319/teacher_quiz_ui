"""UnitParentNode — M:N 教學單元附掛大節點關聯表（spec-11）。"""
from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class UnitParentNode(Base):
    __tablename__ = "unit_parent_nodes"
    __table_args__ = (
        Index("unit_parent_nodes_unit_idx", "unit_id", "sort_order"),
    )

    unit_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("units.id", ondelete="CASCADE"), primary_key=True,
    )
    parent_node_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("parent_nodes.id", ondelete="CASCADE"), primary_key=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
