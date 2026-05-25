"""Add is_sample flag to quizzes (W6).

管理員可標記任一題組為「系統範例」，教師端「從題庫挑題」會顯示徽章高亮。
既有題組預設 false；admin 自行決定要標哪些為範例。

Revision ID: 0016_quiz_is_sample
Revises: 0015_node_teaching_aid
Create Date: 2026-05-25
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0016_quiz_is_sample"
down_revision: str | None = "0015_node_teaching_aid"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "quizzes",
        sa.Column("is_sample", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("quizzes_is_sample_idx", "quizzes", ["is_sample"])


def downgrade() -> None:
    op.drop_index("quizzes_is_sample_idx", table_name="quizzes")
    op.drop_column("quizzes", "is_sample")
