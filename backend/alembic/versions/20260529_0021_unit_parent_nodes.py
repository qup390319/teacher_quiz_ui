"""Add unit_parent_nodes M:N table.

教學單元（units type='unit'）可附掛多個課綱大節點（parent_nodes）。
既有 parent_nodes.unit_id 保留為「原次主題歸屬」不動，本表是額外綁定關係。

Revision ID: 0021_unit_parent_nodes
Revises: 0020_class_categories
Create Date: 2026-05-29
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0021_unit_parent_nodes"
down_revision: str | None = "0020_class_categories"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "unit_parent_nodes",
        sa.Column(
            "unit_id", sa.String(64),
            sa.ForeignKey("units.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_node_id", sa.String(64),
            sa.ForeignKey("parent_nodes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("unit_id", "parent_node_id"),
    )
    op.create_index(
        "unit_parent_nodes_unit_idx",
        "unit_parent_nodes",
        ["unit_id", "sort_order"],
    )


def downgrade() -> None:
    op.drop_index("unit_parent_nodes_unit_idx", table_name="unit_parent_nodes")
    op.drop_table("unit_parent_nodes")
