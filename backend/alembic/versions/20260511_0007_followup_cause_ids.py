"""Add cause_ids JSONB column to followup_results.

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0007_followup_cause_ids"
down_revision = "0006_custom_misc_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "followup_results",
        sa.Column("cause_ids", JSONB, nullable=True, server_default=None),
    )


def downgrade() -> None:
    op.drop_column("followup_results", "cause_ids")
