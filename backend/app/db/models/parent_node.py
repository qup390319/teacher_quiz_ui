"""ParentNode table — 大節點 / 課綱內容細目指標（W7a）。

對應 108 課綱 docx 中的「課綱內容細目指標」，介於 unit (次主題)
與 knowledge_node (知識節點 / 小節點) 之間的階層。
"""
from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class ParentNode(Base):
    __tablename__ = "parent_nodes"
    __table_args__ = (
        UniqueConstraint("unit_id", "code", name="parent_nodes_unit_code_uq"),
        Index("parent_nodes_unit_idx", "unit_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    unit_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # 同單元內其他大節點的先備關係
    prerequisites: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), default=list, nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        server_onupdate=func.now(), nullable=False,
    )
