"""Add optional `note` column to classes for teachers to distinguish across years.

Revision ID: 0004_class_note
Revises: 0003_class_teacher_id
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_class_note"
down_revision: str | None = "0003_class_teacher_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("classes", sa.Column("note", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("classes", "note")
