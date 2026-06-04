"""Make Unit.code unique per grade_band instead of globally.

允許同一 code（如 'ab'）在不同年段（middle/upper）並存。

Revision ID: 0023_unit_code_per_grade
Revises: 0022_seed_teaching_units
Create Date: 2026-05-29
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0023_unit_code_per_grade"
down_revision: str | None = "0022_seed_teaching_units"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # alembic / SQLAlchemy 自動命名單欄位 unique constraint 為 units_code_key
    op.drop_constraint("units_code_key", "units", type_="unique")
    op.create_unique_constraint(
        "units_code_grade_band_uq",
        "units",
        ["code", "grade_band"],
    )


def downgrade() -> None:
    op.drop_constraint("units_code_grade_band_uq", "units", type_="unique")
    op.create_unique_constraint("units_code_key", "units", ["code"])
