"""Add school_year / semester / status / archived_at to classes.

See spec-04 §2.3, spec-05 §1.5, spec-11 §3.3 and §4.

Backfill: existing rows → school_year=2025, semester='second', status='active'.

Revision ID: 0011_class_school_year
Revises: 0010_remaining_fk_cascades
Create Date: 2026-05-22
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011_class_school_year"
down_revision: str | None = "0010_remaining_fk_cascades"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "classes",
        sa.Column("school_year", sa.Integer(), nullable=False, server_default="2025"),
    )
    op.add_column(
        "classes",
        sa.Column("semester", sa.String(8), nullable=False, server_default="second"),
    )
    op.add_column(
        "classes",
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
    )
    op.add_column(
        "classes",
        sa.Column("archived_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_check_constraint(
        "classes_semester_chk",
        "classes",
        "semester IN ('first', 'second')",
    )
    op.create_check_constraint(
        "classes_status_chk",
        "classes",
        "status IN ('active', 'archived')",
    )
    op.create_check_constraint(
        "classes_archived_consistency_chk",
        "classes",
        "(status = 'archived' AND archived_at IS NOT NULL) "
        "OR (status = 'active' AND archived_at IS NULL)",
    )
    op.create_index(
        "classes_term_idx",
        "classes",
        ["teacher_id", "school_year", "semester", "status"],
    )


def downgrade() -> None:
    op.drop_index("classes_term_idx", table_name="classes")
    op.drop_constraint("classes_archived_consistency_chk", "classes", type_="check")
    op.drop_constraint("classes_status_chk", "classes", type_="check")
    op.drop_constraint("classes_semester_chk", "classes", type_="check")
    op.drop_column("classes", "archived_at")
    op.drop_column("classes", "status")
    op.drop_column("classes", "semester")
    op.drop_column("classes", "school_year")
