"""Add misconceptions.source column.

迷思概念新增「資料來源／出處」欄位（Text, nullable），用於標註該迷思的文獻來源
（例如後設研究的引用清單）。自建迷思可留空。

Revision ID: 0028_misconception_source
Revises: 0027_load_kn_hierarchy
Create Date: 2026-06-04
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0028_misconception_source"
down_revision: str | None = "0027_load_kn_hierarchy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "misconceptions",
        sa.Column("source", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("misconceptions", "source")
