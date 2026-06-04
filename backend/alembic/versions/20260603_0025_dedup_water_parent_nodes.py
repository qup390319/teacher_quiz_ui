"""Dedup 水溶液 parent_nodes：合併 legacy 重複大節點到正規次主題節點。

問題（詳見 docs/deviations.md [2026-06-03]）：
  同一課綱代碼（INe-Ⅱ-3 / INe-Ⅲ-5）存在兩份 parent_node：
    - legacy：migration 0014/0018 從原型 12 個水溶液知識節點升級而來，
      unit_id 指向「教學單元」unit-water-solution（type='unit'），語意錯誤
      （parent_nodes.unit_id 應指向次主題 type='subtheme'，spec-11 §3.20/§3.21）。
      → 在「管理大節點」modal 左欄因對不到次主題而落入「（未指派次主題）」。
    - canonical：課綱 docx 匯入建立、正確掛在次主題（unit-jb / unit-jd），
      但完全沒有被引用（0 個 knowledge_node、0 個 unit_parent_node binding）。

處置（使用者 2026-06-03 決定「以官方課綱文件名稱為主」）：
  保留 canonical（官方課綱細目名稱、正確的次主題歸屬），刪除 legacy；
  把 legacy 的所有引用重指到 canonical：
    - knowledge_nodes.parent_node_id（12 筆）+ 同步反正規化 parent_name 快取
      （parent_code 兩者相同、不變）
    - unit_parent_nodes.parent_node_id（2 筆；canonical 原本 0 綁定，無 PK 衝突）
  最後刪除 2 筆 legacy parent_nodes。

執行前已 pg_dump 全庫備份至
  backend/backups/pre_dedup_water_parent_nodes_20260603.sql

Revision ID: 0025_dedup_water_parent_nodes
Revises: 0024_romanize_node_ids
Create Date: 2026-06-03
"""
from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0025_dedup_water_parent_nodes"
down_revision: str | None = "0024_romanize_node_ids"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (legacy_id, canonical_id, legacy_name, canonical_name, code, legacy_unit_id, legacy_display_order)
MERGES: list[tuple[str, str, str, str, str, str, int]] = [
    (
        "pnode-water-solution-ine-3",
        "pnode-jb-ine-ii-3",
        "認識水溶液中的變化（溶解）",
        "有些物質溶於水中，有些物質不容易溶於水中",
        "INe-Ⅱ-3",
        "unit-water-solution",
        1,
    ),
    (
        "pnode-water-solution-ine-5",
        "pnode-jd-ine-5",
        "認識酸鹼反應",
        "常用酸鹼物質的特性，水溶液的酸鹼性質及其生活上的運用",
        "INe-Ⅲ-5",
        "unit-water-solution",
        2,
    ),
]


def upgrade() -> None:
    conn = op.get_bind()
    for legacy, canonical, _legacy_name, canon_name, _code, _u, _ord in MERGES:
        # 防呆：canonical（正規次主題節點）由 runtime「課綱 Word 匯入」產生、
        # 不在任何 migration/seed 中。全新資料庫尚未匯入課綱時 canonical 不存在、
        # 也就沒有重複可言 → 直接跳過本筆合併，避免 FK 違規。
        exists = conn.execute(
            text("SELECT 1 FROM parent_nodes WHERE id = :c"), {"c": canonical},
        ).first()
        if exists is None:
            continue
        # 1) knowledge_nodes：重指 parent_node_id + 同步 parent_name 快取（parent_code 不變）
        conn.execute(
            text(
                "UPDATE knowledge_nodes SET parent_node_id = :c, parent_name = :n "
                "WHERE parent_node_id = :l"
            ),
            {"c": canonical, "n": canon_name, "l": legacy},
        )
        # 2) unit_parent_nodes：先刪掉會與 canonical 撞 PK 的列（防呆，目前為 0），再重指
        conn.execute(
            text(
                "DELETE FROM unit_parent_nodes upn WHERE upn.parent_node_id = :l "
                "AND EXISTS (SELECT 1 FROM unit_parent_nodes x "
                "WHERE x.unit_id = upn.unit_id AND x.parent_node_id = :c)"
            ),
            {"l": legacy, "c": canonical},
        )
        conn.execute(
            text(
                "UPDATE unit_parent_nodes SET parent_node_id = :c "
                "WHERE parent_node_id = :l"
            ),
            {"c": canonical, "l": legacy},
        )
        # 3) 刪除 legacy parent_node
        conn.execute(text("DELETE FROM parent_nodes WHERE id = :l"), {"l": legacy})


def downgrade() -> None:
    """還原：重建 legacy parent_node 並把引用指回去（best-effort，依 MERGES 內記錄的原值）。"""
    conn = op.get_bind()
    for legacy, canonical, legacy_name, _canon_name, code, unit_id, disp in MERGES:
        # 1) 重建 legacy parent_node（description 原為 NULL、prerequisites 原為空）
        conn.execute(
            text(
                "INSERT INTO parent_nodes (id, unit_id, code, name, display_order, prerequisites) "
                "VALUES (:id, :u, :code, :name, :ord, '{}') ON CONFLICT (id) DO NOTHING"
            ),
            {"id": legacy, "u": unit_id, "code": code, "name": legacy_name, "ord": disp},
        )
        # 2) knowledge_nodes 指回 legacy + 還原 parent_name（僅針對本次合併的這批：以 code 鎖定）
        conn.execute(
            text(
                "UPDATE knowledge_nodes SET parent_node_id = :l, parent_name = :n "
                "WHERE parent_node_id = :c AND parent_code = :code"
            ),
            {"l": legacy, "n": legacy_name, "c": canonical, "code": code},
        )
        # 3) unit_parent_nodes 指回 legacy（還原當初綁在 unit-water-solution 的那筆）
        conn.execute(
            text(
                "UPDATE unit_parent_nodes SET parent_node_id = :l "
                "WHERE parent_node_id = :c AND unit_id = :u"
            ),
            {"l": legacy, "c": canonical, "u": unit_id},
        )
