"""Add teaching_strategy + student_hint to knowledge_nodes (W5b).

W5a 階段忘了把 hard-code 中既有的 teachingStrategy 與 studentHint 兩個欄位帶入 DB。
W5b 拔 hard-code 之前先補上 schema 並回填 12 個 seed 節點的內容。

Revision ID: 0015_node_teaching_aid
Revises: 0014_knowledge_nodes
Create Date: 2026-05-25
"""
import json
from collections.abc import Sequence
from pathlib import Path

import sqlalchemy as sa

from alembic import op

revision: str = "0015_node_teaching_aid"
down_revision: str | None = "0014_knowledge_nodes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SEED_PATH = Path(__file__).resolve().parent.parent.parent / "app" / "seed" / "data" / "knowledge_nodes_seed.json"


def upgrade() -> None:
    op.add_column("knowledge_nodes",
                  sa.Column("teaching_strategy", sa.Text(), nullable=True))
    op.add_column("knowledge_nodes",
                  sa.Column("student_hint", sa.Text(), nullable=True))

    # Backfill from seed JSON
    if not SEED_PATH.exists():
        return
    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    update_stmt = sa.text("""
        UPDATE knowledge_nodes
           SET teaching_strategy = :ts, student_hint = :sh
         WHERE id = :id
    """)
    bind = op.get_bind()
    for n in data:
        bind.execute(update_stmt, {
            "id": n["id"],
            "ts": n.get("teachingStrategy"),
            "sh": n.get("studentHint"),
        })


def downgrade() -> None:
    op.drop_column("knowledge_nodes", "student_hint")
    op.drop_column("knowledge_nodes", "teaching_strategy")
