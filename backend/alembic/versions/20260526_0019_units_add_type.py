"""Add type column to units table.

Distinguishes teaching units ('unit') from curriculum subthemes ('subtheme').
Backfill: is_system_current=true → 'unit', all others → 'subtheme'.
"""
from alembic import op
import sqlalchemy as sa  # noqa: I001

revision: str = "0019_units_add_type"
down_revision: str | None = "0018_parent_nodes"
branch_labels: tuple | None = None
depends_on: tuple | None = None


def upgrade() -> None:
    op.add_column(
        "units",
        sa.Column(
            "type", sa.String(16), nullable=False, server_default="subtheme",
        ),
    )
    op.create_check_constraint(
        "units_type_chk", "units",
        "type IN ('unit', 'subtheme')",
    )
    op.execute(
        "UPDATE units SET type = 'unit' WHERE is_system_current = TRUE"
    )


def downgrade() -> None:
    op.drop_constraint("units_type_chk", "units", type_="check")
    op.drop_column("units", "type")
