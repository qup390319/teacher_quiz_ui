"""Add on_canvas flag to knowledge_nodes (W5c).

分離「新增節點 (加進單元庫)」與「加入畫布」兩個概念：
- 新建節點預設 on_canvas=FALSE（只在節點庫中）
- 既有 12 個 seed 節點預設 on_canvas=TRUE（保留視覺現狀）
- 畫布頁僅顯示 on_canvas=TRUE 的節點

Revision ID: 0017_node_on_canvas
Revises: 0016_quiz_is_sample
Create Date: 2026-05-25
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0017_node_on_canvas"
down_revision: str | None = "0016_quiz_is_sample"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "knowledge_nodes",
        sa.Column("on_canvas", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # 既有 12 個 system_seed 節點保留在畫布上
    op.execute(
        "UPDATE knowledge_nodes SET on_canvas = TRUE WHERE is_system_seed = TRUE",
    )
    op.create_index(
        "knowledge_nodes_on_canvas_idx",
        "knowledge_nodes",
        ["unit_id", "on_canvas"],
    )


def downgrade() -> None:
    op.drop_index("knowledge_nodes_on_canvas_idx", table_name="knowledge_nodes")
    op.drop_column("knowledge_nodes", "on_canvas")
