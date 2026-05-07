"""Add per-student scenario assignment targeting (spec-11 §3.10).

Revision ID: 0002_assignment_students
Revises: 0001_initial
Create Date: 2026-05-06
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_assignment_students"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "assignments",
        sa.Column(
            "target_type",
            sa.String(16),
            nullable=False,
            server_default="class",
        ),
    )
    op.create_check_constraint(
        "assignments_target_type_chk",
        "assignments",
        "target_type IN ('class','students')",
    )

    op.create_table(
        "assignment_students",
        sa.Column(
            "assignment_id",
            sa.String(64),
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "student_id",
            sa.String(64),
            sa.ForeignKey("users.id"),
            primary_key=True,
        ),
    )
    op.create_index(
        "assignment_students_student_idx", "assignment_students", ["student_id"],
    )


def downgrade() -> None:
    op.drop_index("assignment_students_student_idx", table_name="assignment_students")
    op.drop_table("assignment_students")
    op.drop_constraint("assignments_target_type_chk", "assignments", type_="check")
    op.drop_column("assignments", "target_type")
