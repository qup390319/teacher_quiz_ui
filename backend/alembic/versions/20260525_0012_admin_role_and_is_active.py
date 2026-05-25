"""Add admin role + is_active/disabled_at/disabled_by to users.

W1-1 of admin role rollout. See spec-13 §2.1, spec-11 §3.1.

- Relax users_role_chk to allow 'admin'.
- Add is_active (default true), disabled_at, disabled_by.
- Seed admin001 / admin001 (no Teacher/Student row needed).

Revision ID: 0012_admin_role_and_is_active
Revises: 0011_class_school_year
Create Date: 2026-05-25
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0012_admin_role_and_is_active"
down_revision: str | None = "0011_class_school_year"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("disabled_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("disabled_by", sa.String(64), nullable=True),
    )
    # Relax role CHECK to include 'admin'.
    op.drop_constraint("users_role_chk", "users", type_="check")
    op.create_check_constraint(
        "users_role_chk",
        "users",
        "role IN ('teacher','student','admin')",
    )

    # Seed the default admin account (admin001 / admin001) if absent.
    op.execute(
        """
        INSERT INTO users (id, account, password, role, password_was_default, is_active)
        VALUES ('admin001', 'admin001', 'admin001', 'admin', TRUE, TRUE)
        ON CONFLICT (id) DO NOTHING
        """,
    )


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE id = 'admin001'")
    op.drop_constraint("users_role_chk", "users", type_="check")
    op.create_check_constraint(
        "users_role_chk",
        "users",
        "role IN ('teacher','student')",
    )
    op.drop_column("users", "disabled_by")
    op.drop_column("users", "disabled_at")
    op.drop_column("users", "is_active")
