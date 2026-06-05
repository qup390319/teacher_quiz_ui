"""Insert literature-sourced misconceptions (all four domains).

來源：陳淑筠、熊同鑫《國內學生自然科學迷思概念研究之後設研究》第四章綜合研究一覽表
（表四-2 物理／表四-3 化學／表四-4 生物／表四-5 地球科學）。逐條引用原文（detail 不更改
字句），依關鍵字對應到本系統相關知識節點（無相關節點者不收），並於 source 欄標註出處與
原始研究引用；label 為便於瀏覽之簡短標題（編者擬）。

以 upsert（ON CONFLICT DO UPDATE）載入，冪等。資料見 data/0029_literature_misconceptions.json。

Revision ID: 0029_literature_misconceptions
Revises: 0028_misconception_source
Create Date: 2026-06-04
"""
import json
from collections.abc import Sequence
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert as pg_insert

from alembic import op
from app.db.models import Misconception

revision: str = "0029_literature_misconceptions"
down_revision: str | None = "0028_misconception_source"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DATA_FILE = Path(__file__).parent / "data" / "0029_literature_misconceptions.json"


def _rows() -> list[dict]:
    data = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    rows = []
    for m in data["misconceptions"]:
        rows.append({
            "id": m["id"],
            "node_id": m["node_id"],
            "label": m["label"],
            "detail": m.get("detail"),
            "student_detail": m.get("student_detail"),
            "confirm_question": m.get("confirm_question"),
            "source": m.get("source"),
            "is_default": True,
            "owner_id": None,
            "display_order": m.get("display_order", 0),
        })
    return rows


def upgrade() -> None:
    rows = _rows()
    if not rows:
        return
    table = Misconception.__table__
    stmt = pg_insert(table).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={
            "node_id": stmt.excluded.node_id,
            "label": stmt.excluded.label,
            "detail": stmt.excluded.detail,
            "student_detail": stmt.excluded.student_detail,
            "confirm_question": stmt.excluded.confirm_question,
            "source": stmt.excluded.source,
            "is_default": stmt.excluded.is_default,
            "display_order": stmt.excluded.display_order,
        },
    )
    op.get_bind().execute(stmt)


def downgrade() -> None:
    ids = [m["id"] for m in _rows()]
    if not ids:
        return
    table = Misconception.__table__
    op.get_bind().execute(table.delete().where(table.c.id.in_(ids)))
