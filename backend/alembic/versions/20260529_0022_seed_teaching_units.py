"""Seed 14 國小高年級教學單元（type='unit'）並 attach 既有 parent_nodes (W4 final).

依康軒出版社的高年級單元結構為靈感、避開其專有修辭命名 14 個教學單元，
利用 unit_parent_nodes M:N 把現有的次主題大節點 attach 進對應的教學單元。

display_order 規劃：
  五上 1-4 / 五下 5-8 / 六上 9-12（水溶液調為 11）/ 六下 13-15

對 parent_nodes 的歸屬：
  - 一般情況：把整個次主題（type='subtheme'）下的所有 parent_nodes attach 過來
  - 拆分：Ka 波動、光及聲音 → 太陽與光的探究 (INe-Ⅲ-7/8 色光與折射) +
          聲音與樂器 (INe-Ⅲ-6 聲音)
          Db 動植物體的構造與功能 → 動物的世界 (INb-Ⅲ-6)；
          植物的世界：Db 次主題下實際只有動物節點，故先建單元，parent_nodes
                      後續再手動指派
  - 合併：地表的變化 = Ia + Hb + Fa；物質的變化 = Ja + Jc；生物與環境 = Bd + Fc + Lb
  - 簡單機械：課綱中無直接對應的大節點，先建單元、parent_nodes 後續再手動掛

不動 knowledge_nodes.unit_id（仍指向原次主題）；教師端 unit 透過 unit_parent_nodes 串。

Revision ID: 0022_seed_teaching_units
Revises: 0021_unit_parent_nodes
Create Date: 2026-05-29
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0022_seed_teaching_units"
down_revision: str | None = "0021_unit_parent_nodes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (code, name, display_order, subtheme_codes, parent_codes_filter)
#   subtheme_codes: 次主題 code 清單（小寫，對應 units.code where type='subtheme'）
#   parent_codes_filter: None = 全收，set/frozenset = 只收這些 code 的大節點
UNITS: list[tuple[str, str, int, list[str], frozenset[str] | None]] = [
    # 五上 1-4
    ("sun-and-light",          "太陽與光的探究", 1,
     ["ka"], frozenset({"INe-Ⅲ-7", "INe-Ⅲ-8"})),
    ("plant-world",            "植物的世界",     2,
     [], None),  # Db 次主題下僅有動物節點，植物相關 parent 後續再手動指派
    ("air-and-combustion",     "空氣與燃燒",     3,
     ["ec"], None),
    ("force-and-motion",       "力與運動",       4,
     ["eb"], None),
    # 五下 5-8
    ("astronomy",              "觀測星空",       5,
     ["fb"], None),
    ("animal-world",           "動物的世界",     6,
     ["db"], frozenset({"INb-Ⅲ-6"})),
    ("heat-and-insulation",    "熱與保溫",       7,
     ["bb"], None),
    ("sound-and-instruments",  "聲音與樂器",     8,
     ["ka"], frozenset({"INe-Ⅲ-6"})),
    # 六上 9-12（水溶液既有，由本 migration 調為 display_order=11）
    ("weather",                "天氣的變化",     9,
     ["ib"], None),
    ("earth-changes",          "地表的變化",     10,
     ["ia", "hb", "fa"], None),
    # display_order=11 留給 unit-water-solution
    ("electromagnetism",       "電磁作用",       12,
     ["kc"], None),
    # 六下 13-15
    ("simple-machine",         "簡單機械",       13,
     [], None),  # 課綱無直接對應，先建空殼，後續手動掛
    ("matter-changes",         "物質的變化",     14,
     ["ja", "jc"], None),
    ("life-and-environment",   "生物與環境",     15,
     ["bd", "fc", "lb"], None),
]


def upgrade() -> None:
    bind = op.get_bind()

    # 1) 把既有水溶液的 display_order 推到 11（六上區段第 3 個）
    bind.execute(sa.text(
        "UPDATE units SET display_order = 11 "
        "WHERE id = 'unit-water-solution'",
    ))

    # 2) 插入 14 個新教學單元
    insert_unit_sql = sa.text("""
        INSERT INTO units (
            id, code, name, grade_band, display_order,
            status, type, is_system_current
        )
        VALUES (
            :id, :code, :name, 'upper', :display_order,
            'active', 'unit', FALSE
        )
        ON CONFLICT (id) DO NOTHING
    """)
    for code, name, display_order, _, _ in UNITS:
        bind.execute(insert_unit_sql, {
            "id": f"unit-{code}",
            "code": code,
            "name": name,
            "display_order": display_order,
        })

    # 3) 為每個新單元 attach 對應的 parent_nodes
    insert_upn_sql = sa.text("""
        INSERT INTO unit_parent_nodes (unit_id, parent_node_id, sort_order)
        VALUES (:unit_id, :parent_node_id, :sort_order)
        ON CONFLICT (unit_id, parent_node_id) DO NOTHING
    """)
    for code, _, _, subtheme_codes, parent_filter in UNITS:
        if not subtheme_codes:
            continue
        unit_id = f"unit-{code}"

        # 取出這些次主題下的所有大節點（依 display_order）
        subtheme_unit_ids = [f"unit-{s}" for s in subtheme_codes]
        # 用 IN(...) 字串嵌入 — 全部是內部常量、無 SQLi 風險
        in_clause = ",".join(f"'{u}'" for u in subtheme_unit_ids)
        rows = bind.execute(sa.text(
            f"SELECT id, code FROM parent_nodes "
            f"WHERE unit_id IN ({in_clause}) "
            f"ORDER BY unit_id, display_order, code",
        )).all()

        if parent_filter is not None:
            rows = [r for r in rows if r[1] in parent_filter]

        for sort_order, row in enumerate(rows):
            bind.execute(insert_upn_sql, {
                "unit_id": unit_id,
                "parent_node_id": row[0],
                "sort_order": sort_order,
            })


def downgrade() -> None:
    bind = op.get_bind()
    new_ids = [f"unit-{code}" for code, _, _, _, _ in UNITS]
    in_clause = ",".join(f"'{u}'" for u in new_ids)

    # 先解除 M:N
    bind.execute(sa.text(
        f"DELETE FROM unit_parent_nodes WHERE unit_id IN ({in_clause})",
    ))
    # 再刪 unit
    bind.execute(sa.text(
        f"DELETE FROM units WHERE id IN ({in_clause})",
    ))
    # 回復水溶液 display_order
    bind.execute(sa.text(
        "UPDATE units SET display_order = 6 "
        "WHERE id = 'unit-water-solution'",
    ))
