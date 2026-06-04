"""Relocate 水溶液 12 knowledge_nodes 到正確次主題 + 退出畫布待重排 (0026).

承 migration 0025（去重 water-solution 大節點）。0025 把 12 個示範知識節點的
parent_node_id 改指到正規次主題大節點（pnode-jb-ine-ii-3 / pnode-jd-ine-5），
但 unit_id 仍停在教學單元 unit-water-solution，導致「知識節點 > 階層結構」三欄
編輯器（第三欄先以次主題 unit_id 抓節點再依大節點過濾）在 Jb/Jd 下看不到這些
小節點 —— Jb 的 INe-Ⅱ-3 看起來「沒有小節點」。

本 migration 補正（使用者 2026-06-04 決定「修階層 + 退出畫布待重排」）：
  - parent_node_id=pnode-jb-ine-ii-3 的 5 個（INe-Ⅱ-3-01~05）→ unit_id=unit-jb
  - parent_node_id=pnode-jd-ine-5  的 7 個（INe-Ⅲ-5-1~7）→ unit_id=unit-jd
  - 同時 on_canvas=False 並清空 canvas 座標：依「退出畫布待重排」，避免與 Jd
    既有畫布節點重疊；之後可在畫布視圖重新加入，座標 NULL 會走自動排版
    （bulk-set-canvas 對既有座標會沿用，故必須清空才能重排）。

selector 以 parent_node_id 鎖定：全新 DB 上 0025 因 canonical 不存在而略過合併、
這些節點仍指向 legacy parent，故本 UPDATE 命中 0 列、安全 no-op。

Revision ID: 0026_relocate_water_kn
Revises: 0025_dedup_water_parent_nodes
Create Date: 2026-06-04
"""
from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0026_relocate_water_kn"
down_revision: str | None = "0025_dedup_water_parent_nodes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (canonical_parent_node_id, 目標次主題 unit_id)
MOVES: list[tuple[str, str]] = [
    ("pnode-jb-ine-ii-3", "unit-jb"),
    ("pnode-jd-ine-5", "unit-jd"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for parent_id, subtheme_id in MOVES:
        conn.execute(
            text(
                "UPDATE knowledge_nodes "
                "SET unit_id = :u, on_canvas = false, "
                "    canvas_x = NULL, canvas_y = NULL "
                "WHERE parent_node_id = :p"
            ),
            {"u": subtheme_id, "p": parent_id},
        )


def downgrade() -> None:
    """還原所屬次主題回教學單元並重新上畫布。

    座標於 upgrade 已清空，downgrade 不回填精確座標（best-effort）：重新上畫布後
    NULL 座標會走自動排版。
    """
    conn = op.get_bind()
    for parent_id, _subtheme_id in MOVES:
        conn.execute(
            text(
                "UPDATE knowledge_nodes "
                "SET unit_id = 'unit-water-solution', on_canvas = true "
                "WHERE parent_node_id = :p"
            ),
            {"p": parent_id},
        )
