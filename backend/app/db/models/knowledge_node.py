"""KnowledgeNode + Misconception tables (W5a). See spec-11 §3.18 / §3.19."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    pass


class KnowledgeNode(Base):
    """小節點 — admin 可自訂 ID、所屬單元、先備關係、畫布座標。"""
    __tablename__ = "knowledge_nodes"
    __table_args__ = (
        CheckConstraint(
            "grade_band IN ('lower','middle','upper')",
            name="knowledge_nodes_grade_band_chk",
        ),
        Index("knowledge_nodes_unit_idx", "unit_id"),
        Index("knowledge_nodes_grade_idx", "grade_band"),
        Index("knowledge_nodes_parent_idx", "parent_code"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    # 可為 NULL：剛從 Excel 匯入、尚未指派單元
    unit_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("units.id", ondelete="SET NULL"),
        nullable=True,
    )
    grade_band: Mapped[str] = mapped_column(String(16), nullable=False)
    # 大節點（學習內容）資訊
    # W7a：parent_node_id FK 為新欄位（migration 0018 backfill 既有資料）。
    # parent_code / parent_name 仍保留作 denormalized cache，方便公開 API 不必 join。
    parent_node_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("parent_nodes.id", ondelete="SET NULL"),
        nullable=True,
    )
    parent_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    parent_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 課綱外的補充欄位
    video_title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # W5b: 教師輔助說明（teachingStrategy）與學生提示（studentHint）。
    # 由 W5a hard-code 移植；空值代表尚未填寫。
    teaching_strategy: Mapped[str | None] = mapped_column(Text, nullable=True)
    student_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 學習順序與先備（同單元內）
    learning_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prerequisites: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), default=list, nullable=False,
    )
    # 畫布座標（NULL = 走自動排版）
    canvas_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    canvas_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    # 既有 12 個水溶液節點標 True，可編輯但不可刪
    is_system_seed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # W5c: 是否已加入到單元畫布。新建節點預設 false（先進節點庫）；admin 從
    # 「加入節點」picker 選擇後才上畫布。是「畫布視圖」與「節點庫」的開關。
    on_canvas: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        server_onupdate=func.now(), nullable=False,
    )

    misconceptions: Mapped[list["Misconception"]] = relationship(
        back_populates="node", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Misconception.display_order",
    )


class Misconception(Base):
    """節點的常見迷思概念。"""
    __tablename__ = "misconceptions"
    __table_args__ = (
        UniqueConstraint("node_id", "id", name="misconceptions_node_id_uq"),
        Index("misconceptions_node_idx", "node_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    node_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("knowledge_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(256), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    student_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirm_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 資料來源／出處（如後設研究文獻引用）；自建迷思可留空
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    owner_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        server_onupdate=func.now(), nullable=False,
    )

    node: Mapped["KnowledgeNode"] = relationship(back_populates="misconceptions")
