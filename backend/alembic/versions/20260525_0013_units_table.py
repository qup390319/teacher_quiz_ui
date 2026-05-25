"""Create units table + seed 12 upper-elementary units (W4).

12 個高年級單元依使用者提供截圖順序 seed；「水溶液」標為 is_system_current=True
（既有 12 個知識節點都掛在此單元下，W4 階段其他單元僅有名稱）。

Revision ID: 0013_units_table
Revises: 0012_admin_role_and_is_active
Create Date: 2026-05-25
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0013_units_table"
down_revision: str | None = "0012_admin_role_and_is_active"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


UPPER_ELEMENTARY_UNITS = [
    # (code, name, display_order, is_system_current)
    ("light-refraction",      "太陽與光的折射",   1, False),
    ("plant-world",           "植物世界",         2, False),
    ("air-and-combustion",    "空氣與燃燒",       3, False),
    ("sound-and-instruments", "聲音與樂器",       4, False),
    ("astronomy",             "觀測星空",         5, False),
    ("water-solution",        "水溶液",           6, True),   # ← 系統現有節點所屬
    ("animal-world",          "動物大觀園",       7, False),
    ("force-and-motion",      "力與運動",         8, False),
    ("weather",               "多變的天氣",       9, False),
    ("earth-surface",         "地表的變化",       10, False),
    ("electromagnetism",      "電磁作用",         11, False),
    ("heat-and-matter",       "熱對物質的影響",   12, False),
]


def upgrade() -> None:
    op.create_table(
        "units",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("grade_band", sa.String(16), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("is_system_current", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True),
            nullable=False, server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at", sa.TIMESTAMP(timezone=True),
            nullable=False, server_default=sa.func.now(),
        ),
        sa.CheckConstraint("grade_band IN ('lower','middle','upper')", name="units_grade_band_chk"),
        sa.CheckConstraint("status IN ('active','archived')", name="units_status_chk"),
    )
    op.create_index("units_grade_band_idx", "units", ["grade_band", "display_order"])

    # Seed upper-elementary units.
    for code, name, order, is_sys in UPPER_ELEMENTARY_UNITS:
        op.execute(
            sa.text(
                """
                INSERT INTO units (id, code, name, grade_band, display_order, status, is_system_current)
                VALUES (:id, :code, :name, 'upper', :order, 'active', :is_sys)
                ON CONFLICT (id) DO NOTHING
                """,
            ).bindparams(id=f"unit-{code}", code=code, name=name, order=order, is_sys=is_sys),
        )


def downgrade() -> None:
    op.drop_index("units_grade_band_idx", table_name="units")
    op.drop_table("units")
