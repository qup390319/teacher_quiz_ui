"""Add parent_nodes table + backfill from existing knowledge_nodes.parent_code (W7a).

108 課綱階層：次主題（unit）→ 內容細目（parent_node）→ 知識節點（knowledge_node）。
本 migration 把既有 knowledge_nodes.parent_code 升級為 FK：
  1. 建 parent_nodes 表
  2. 從 knowledge_nodes 取 distinct (unit_id, parent_code) 自動建立 parent_node 列
     - id 採 `pnode-{unit_code}-{parent_code-slug}`
     - display_order 依 parent_code 字典序，從 1 起算
  3. knowledge_nodes 加 parent_node_id FK，並依 (unit_id, parent_code) 回填

Revision ID: 0018_parent_nodes
Revises: 0017_node_on_canvas
Create Date: 2026-05-26
"""
import re
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

from alembic import op

revision: str = "0018_parent_nodes"
down_revision: str | None = "0017_node_on_canvas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "x"


def upgrade() -> None:
    op.create_table(
        "parent_nodes",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("unit_id", sa.String(64),
                  sa.ForeignKey("units.id", ondelete="SET NULL"), nullable=True),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prerequisites", ARRAY(sa.String(64)),
                  nullable=False, server_default="{}"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("unit_id", "code", name="parent_nodes_unit_code_uq"),
    )
    op.create_index("parent_nodes_unit_idx", "parent_nodes", ["unit_id"])

    # knowledge_nodes 加 parent_node_id FK
    op.add_column(
        "knowledge_nodes",
        sa.Column("parent_node_id", sa.String(64),
                  sa.ForeignKey("parent_nodes.id", ondelete="SET NULL"),
                  nullable=True),
    )
    op.create_index("knowledge_nodes_parent_node_idx", "knowledge_nodes", ["parent_node_id"])

    # === Backfill ===
    bind = op.get_bind()
    # 取所有 (unit_id, parent_code, parent_name) distinct 對，建立 parent_node 列
    distinct_rows = bind.execute(sa.text(
        """
        SELECT DISTINCT unit_id, parent_code, COALESCE(MAX(parent_name), '')
        FROM knowledge_nodes
        WHERE parent_code IS NOT NULL
        GROUP BY unit_id, parent_code
        ORDER BY unit_id NULLS FIRST, parent_code
        """,
    )).all()

    # 預先抓單元代碼以產生穩定的 parent_node id
    unit_code_map: dict[str, str] = {}
    for r in bind.execute(sa.text("SELECT id, code FROM units")).all():
        unit_code_map[r[0]] = r[1]

    # 按 unit 分組計算 display_order
    order_counter: dict[str | None, int] = {}
    insert_stmt = sa.text("""
        INSERT INTO parent_nodes (id, unit_id, code, name, display_order)
        VALUES (:id, :unit_id, :code, :name, :display_order)
        ON CONFLICT (id) DO NOTHING
    """)
    update_kn_stmt = sa.text("""
        UPDATE knowledge_nodes SET parent_node_id = :pnid
        WHERE unit_id IS NOT DISTINCT FROM :unit_id AND parent_code = :parent_code
    """)

    for unit_id, parent_code, parent_name in distinct_rows:
        order_counter[unit_id] = order_counter.get(unit_id, 0) + 1
        unit_part = unit_code_map.get(unit_id, "noteunit") if unit_id else "noteunit"
        pn_id = f"pnode-{_slug(unit_part)}-{_slug(parent_code)}"
        # 截長
        pn_id = pn_id[:64]
        bind.execute(insert_stmt, {
            "id": pn_id,
            "unit_id": unit_id,
            "code": parent_code,
            "name": parent_name or parent_code,
            "display_order": order_counter[unit_id],
        })
        bind.execute(update_kn_stmt, {
            "pnid": pn_id,
            "unit_id": unit_id,
            "parent_code": parent_code,
        })


def downgrade() -> None:
    op.drop_index("knowledge_nodes_parent_node_idx", table_name="knowledge_nodes")
    op.drop_column("knowledge_nodes", "parent_node_id")
    op.drop_index("parent_nodes_unit_idx", table_name="parent_nodes")
    op.drop_table("parent_nodes")
