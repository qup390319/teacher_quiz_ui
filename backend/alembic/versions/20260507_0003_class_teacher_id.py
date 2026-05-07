"""Add teacher_id to classes for per-teacher data isolation (spec-11 §3.3).

Backfills any existing rows to teacher 'aaa001' so the demo dashboard remains
populated after upgrade. New teachers (e.g. 'bbb001') start with an empty
class roster.

Revision ID: 0003_class_teacher_id
Revises: 0002_assignment_students
Create Date: 2026-05-07
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_class_teacher_id"
down_revision: str | None = "0002_assignment_students"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "classes",
        sa.Column(
            "teacher_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("classes_teacher_idx", "classes", ["teacher_id"])

    # Backfill: existing demo classes belong to the seeded demo teacher.
    # Only updates rows where the teacher actually exists (idempotent / safe
    # for fresh DBs where 0001 hasn't seeded yet).
    op.execute(
        """
        UPDATE classes
           SET teacher_id = 'aaa001'
         WHERE teacher_id IS NULL
           AND EXISTS (SELECT 1 FROM users WHERE id = 'aaa001')
        """,
    )


def downgrade() -> None:
    op.drop_index("classes_teacher_idx", table_name="classes")
    op.drop_column("classes", "teacher_id")
