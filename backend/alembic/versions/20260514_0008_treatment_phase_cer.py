"""Extend treatment_messages.phase to allow 'cer'.

Revision ID: 0008
Revises: 0007
"""
from alembic import op


revision = "0008_treatment_phase_cer"
down_revision = "0007_followup_cause_ids"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "treatment_messages_phase_chk", "treatment_messages", type_="check",
    )
    op.create_check_constraint(
        "treatment_messages_phase_chk",
        "treatment_messages",
        "phase IS NULL OR phase IN ('diagnosis','apprenticeship','cer','completed')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "treatment_messages_phase_chk", "treatment_messages", type_="check",
    )
    op.create_check_constraint(
        "treatment_messages_phase_chk",
        "treatment_messages",
        "phase IS NULL OR phase IN ('diagnosis','apprenticeship','completed')",
    )
