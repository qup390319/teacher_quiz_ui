"""Make student_detail and confirm_question nullable on custom_misconceptions.

Revision ID: 0006_custom_misc_nullable
Revises: 0005_custom_misconceptions
Create Date: 2026-05-11
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_custom_misc_nullable"
down_revision: str | None = "0005_custom_misconceptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "custom_misconceptions", "student_detail",
        existing_type=sa.Text(), nullable=True,
    )
    op.alter_column(
        "custom_misconceptions", "confirm_question",
        existing_type=sa.Text(), nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "custom_misconceptions", "confirm_question",
        existing_type=sa.Text(), nullable=False,
    )
    op.alter_column(
        "custom_misconceptions", "student_detail",
        existing_type=sa.Text(), nullable=False,
    )
