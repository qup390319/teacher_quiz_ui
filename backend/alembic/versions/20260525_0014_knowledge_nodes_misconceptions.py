"""Create knowledge_nodes + misconceptions + seed existing 12 + 48 (W5a).

兩張新表 + 從 app/seed/data/knowledge_nodes_seed.json seed 既有 12 個水溶液節點
與 48 條迷思概念（與 src/data/knowledgeGraph.js 對應）。

12 節點全部標 is_system_seed=True、unit_id='unit-water-solution'。
parent_code / parent_name 依 ID 前綴推導（子主題 A=INe-Ⅱ-3、B=INe-Ⅲ-5）。

Revision ID: 0014_knowledge_nodes
Revises: 0013_units_table
Create Date: 2026-05-25
"""
import json
from collections.abc import Sequence
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

from alembic import op

revision: str = "0014_knowledge_nodes"
down_revision: str | None = "0013_units_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SEED_PATH = Path(__file__).resolve().parent.parent.parent / "app" / "seed" / "data" / "knowledge_nodes_seed.json"

# 既有 12 節點分屬 2 個大節點（學習內容代號）
PARENT_META = {
    # ID 前綴 → (parent_code, parent_name, learning_order start)
    "INe-II-3-": ("INe-Ⅱ-3", "認識水溶液中的變化（溶解）"),
    "INe-Ⅲ-5-": ("INe-Ⅲ-5", "認識酸鹼反應"),
}


def _parent_for(node_id: str) -> tuple[str | None, str | None]:
    for prefix, (code, name) in PARENT_META.items():
        if node_id.startswith(prefix):
            return code, name
    return None, None


def upgrade() -> None:
    op.create_table(
        "knowledge_nodes",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("unit_id", sa.String(64),
                  sa.ForeignKey("units.id", ondelete="SET NULL"), nullable=True),
        sa.Column("grade_band", sa.String(16), nullable=False),
        sa.Column("parent_code", sa.String(32), nullable=True),
        sa.Column("parent_name", sa.Text(), nullable=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("video_title", sa.String(256), nullable=True),
        sa.Column("video_url", sa.String(512), nullable=True),
        sa.Column("learning_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prerequisites", ARRAY(sa.String(64)), nullable=False, server_default="{}"),
        sa.Column("canvas_x", sa.Float(), nullable=True),
        sa.Column("canvas_y", sa.Float(), nullable=True),
        sa.Column("is_system_seed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("grade_band IN ('lower','middle','upper')",
                           name="knowledge_nodes_grade_band_chk"),
    )
    op.create_index("knowledge_nodes_unit_idx", "knowledge_nodes", ["unit_id"])
    op.create_index("knowledge_nodes_grade_idx", "knowledge_nodes", ["grade_band"])
    op.create_index("knowledge_nodes_parent_idx", "knowledge_nodes", ["parent_code"])

    op.create_table(
        "misconceptions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("node_id", sa.String(64),
                  sa.ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(256), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("student_detail", sa.Text(), nullable=True),
        sa.Column("confirm_question", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("owner_id", sa.String(64),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("node_id", "id", name="misconceptions_node_id_uq"),
    )
    op.create_index("misconceptions_node_idx", "misconceptions", ["node_id"])

    # --- Seed 既有 12 節點 + 48 迷思 ---
    if not SEED_PATH.exists():
        print(f"[migration 0014] seed file not found at {SEED_PATH}; skipping data seed")
        return

    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    insert_node = sa.text("""
        INSERT INTO knowledge_nodes
          (id, unit_id, grade_band, parent_code, parent_name, name, description,
           video_title, video_url, learning_order, prerequisites, is_system_seed)
        VALUES
          (:id, :unit_id, :grade_band, :parent_code, :parent_name, :name, :description,
           :video_title, :video_url, :learning_order, :prerequisites, TRUE)
        ON CONFLICT (id) DO NOTHING
    """)
    insert_mis = sa.text("""
        INSERT INTO misconceptions
          (id, node_id, label, detail, student_detail, confirm_question,
           is_default, display_order)
        VALUES
          (:id, :node_id, :label, :detail, :student_detail, :confirm_question,
           TRUE, :display_order)
        ON CONFLICT (id) DO NOTHING
    """)

    bind = op.get_bind()
    for order_idx, node in enumerate(data, start=1):
        parent_code, parent_name = _parent_for(node["id"])
        bind.execute(insert_node, {
            "id": node["id"],
            "unit_id": "unit-water-solution",
            "grade_band": "upper",
            "parent_code": parent_code,
            "parent_name": parent_name,
            "name": node["name"],
            "description": node.get("description"),
            "video_title": node.get("videoTitle"),
            "video_url": node.get("videoUrl"),
            "learning_order": node.get("level", order_idx),
            "prerequisites": node.get("prerequisites", []),
        })
        for m_idx, m in enumerate(node.get("misconceptions", []), start=1):
            bind.execute(insert_mis, {
                "id": m["id"],
                "node_id": node["id"],
                "label": m["label"],
                "detail": m.get("detail"),
                "student_detail": m.get("studentDetail"),
                "confirm_question": m.get("confirmQuestion"),
                "display_order": m_idx,
            })


def downgrade() -> None:
    op.drop_index("misconceptions_node_idx", table_name="misconceptions")
    op.drop_table("misconceptions")
    op.drop_index("knowledge_nodes_parent_idx", table_name="knowledge_nodes")
    op.drop_index("knowledge_nodes_grade_idx", table_name="knowledge_nodes")
    op.drop_index("knowledge_nodes_unit_idx", table_name="knowledge_nodes")
    op.drop_table("knowledge_nodes")
