"""Add class_categories table + classes.category_id.

See spec-11 §3.x and docs/deviations.md (2026-05-29 entry).

Revision ID: 0020_class_categories
Revises: 0019_units_add_type
Create Date: 2026-05-29
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0020_class_categories"
down_revision: str | None = "0019_units_add_type"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "class_categories",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column(
            "teacher_id", sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at", sa.TIMESTAMP(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("teacher_id", "name", name="class_categories_teacher_name_uq"),
    )
    op.create_index(
        "class_categories_teacher_order_idx",
        "class_categories",
        ["teacher_id", "sort_order"],
    )

    op.add_column(
        "classes",
        sa.Column(
            "category_id", sa.String(40),
            sa.ForeignKey("class_categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("classes_category_idx", "classes", ["category_id"])


def downgrade() -> None:
    op.drop_index("classes_category_idx", table_name="classes")
    op.drop_column("classes", "category_id")
    op.drop_index("class_categories_teacher_order_idx", table_name="class_categories")
    op.drop_table("class_categories")
