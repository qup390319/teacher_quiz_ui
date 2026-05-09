"""Add custom_misconceptions table for per-teacher private misconceptions.

Revision ID: 0005_custom_misconceptions
Revises: 0004_class_note
Create Date: 2026-05-09
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_custom_misconceptions"
down_revision: str | None = "0004_class_note"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "custom_misconceptions",
        sa.Column("id", sa.String(48), primary_key=True),
        sa.Column(
            "teacher_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("node_id", sa.String(32), nullable=False),
        sa.Column("label", sa.String(64), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("student_detail", sa.Text(), nullable=False),
        sa.Column("confirm_question", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "custom_misconceptions_teacher_idx",
        "custom_misconceptions",
        ["teacher_id"],
    )
    op.create_index(
        "custom_misconceptions_teacher_node_idx",
        "custom_misconceptions",
        ["teacher_id", "node_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "custom_misconceptions_teacher_node_idx",
        table_name="custom_misconceptions",
    )
    op.drop_index(
        "custom_misconceptions_teacher_idx",
        table_name="custom_misconceptions",
    )
    op.drop_table("custom_misconceptions")
