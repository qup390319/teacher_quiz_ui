"""Load full knowledge-node hierarchy snapshot (units / parent_nodes /
knowledge_nodes / misconceptions / unit_parent_nodes) via upsert.

問題（詳見 docs/deviations.md [2026-06-04]）：完整課綱階層（39 次主題 + 200+ 大節點
+ 400+ 小節點）原本是透過 runtime「Word 匯入」建在 DB 裡、不在版控，所以 deploy 不會
帶資料、各環境各自匯入而不一致。

本 migration 把本地當前完整階層快照（backend/alembic/versions/data/
0027_knowledge_hierarchy.json）以 **upsert（ON CONFLICT DO UPDATE）** 載入，作為最後
一支 migration：不論前面 0014/0022/0024/0025/0026 對這些資料做了什麼，最終狀態都會被
強制覆蓋成快照，fresh 與既有 DB 皆適用、且冪等。

策略：
- 依外鍵相依順序 upsert：units → parent_nodes → knowledge_nodes → misconceptions
  → unit_parent_nodes。
- 只 upsert 快照含的欄位（不含 created_at/updated_at；INSERT 走 server default、
  ON CONFLICT 時不動時間戳）。
- 只新增/更新快照內的列，**不刪除**快照外的列（避免誤刪被題組引用的節點；prod 既有
  題組僅引用 5 個 demo 節點，皆在快照內）。

Revision ID: 0027_load_kn_hierarchy
Revises: 0026_relocate_water_kn
Create Date: 2026-06-04
"""
import json
from collections.abc import Sequence
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert as pg_insert

from alembic import op
from app.db.models import (
    KnowledgeNode,
    Misconception,
    ParentNode,
    Unit,
    UnitParentNode,
)

revision: str = "0027_load_kn_hierarchy"
down_revision: str | None = "0026_relocate_water_kn"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DATA_FILE = Path(__file__).parent / "data" / "0027_knowledge_hierarchy.json"

# (json key, ORM table, primary-key 欄位) — 依外鍵相依順序
_TABLES = [
    ("units", Unit.__table__, ["id"]),
    ("parent_nodes", ParentNode.__table__, ["id"]),
    ("knowledge_nodes", KnowledgeNode.__table__, ["id"]),
    ("misconceptions", Misconception.__table__, ["id"]),
    ("unit_parent_nodes", UnitParentNode.__table__, ["unit_id", "parent_node_id"]),
]

_CHUNK = 200


def _upsert(conn, table, rows, pk_cols) -> None:
    if not rows:
        return
    data_cols = [k for k in rows[0] if k not in pk_cols]
    for i in range(0, len(rows), _CHUNK):
        chunk = rows[i:i + _CHUNK]
        stmt = pg_insert(table).values(chunk)
        stmt = stmt.on_conflict_do_update(
            index_elements=pk_cols,
            set_={c: stmt.excluded[c] for c in data_cols},
        )
        conn.execute(stmt)


def upgrade() -> None:
    with _DATA_FILE.open(encoding="utf-8") as fh:
        snapshot = json.load(fh)
    conn = op.get_bind()
    for key, table, pk_cols in _TABLES:
        _upsert(conn, table, snapshot.get(key) or [], pk_cols)


def downgrade() -> None:
    """No-op：資料快照載入無法乾淨還原（不知道載入前各列原值）。

    如需回復，請改用部署前的 pg_dump 全量備份。
    """
