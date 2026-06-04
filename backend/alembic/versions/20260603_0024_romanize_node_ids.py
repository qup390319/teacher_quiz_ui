"""Romanize english II/III knowledge_node ids → Unicode Ⅱ/Ⅲ (+ typo fix).

統一 24 個仍使用英文 II/III 的知識節點編號為 Unicode 羅馬數字（Ⅱ=U+2161 / Ⅲ=U+2162），
與其餘節點寫法一致。並修正一筆匯入手誤 INc-II-2-1-2 → INc-Ⅱ-2-2。

⚠️ 本 migration 明確覆蓋 CLAUDE.md「禁止修改知識節點 ID 格式」鐵律，
   經使用者於 2026-06-03 明示授權（含接受動到示範題組 quiz-001/002）。
   執行前已 pg_dump 全庫備份至 backend/backups/pre_romanize_*.sql。
   詳見 docs/deviations.md [2026-06-03]。

連帶更新（misconceptions.node_id 有 FK，需先卸後掛；其餘為純字串欄/陣列）：
  - knowledge_nodes.id          (24 筆主鍵)
  - misconceptions.node_id      (FK → knowledge_nodes.id, ON UPDATE NO ACTION)
  - quiz_questions.knowledge_node_id
  - quizzes.knowledge_node_ids  (text[])
  - knowledge_nodes.prerequisites (text[])
  - custom_misconceptions.node_id (保險，目前 0 筆)

附帶清理（同屬 Ⅲ/III 同類錯字，使用者已於計畫 step 5 授權）：
  - INe-Ⅲ-10-08.prerequisites 的英文 III 殘留 → 羅馬
  - INc-Ⅲ-15-1.name 開頭重複編號 → 去除

Revision ID: 0024_romanize_node_ids
Revises: 0023_unit_code_per_grade
Create Date: 2026-06-03
"""
from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0024_romanize_node_ids"
down_revision: str | None = "0023_unit_code_per_grade"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# old_id -> new_id（24 筆；含 typo 修正 INc-II-2-1-2 -> INc-Ⅱ-2-2）
RENAMES: list[tuple[str, str]] = [
    ("INc-II-1-1", "INc-Ⅱ-1-1"),
    ("INc-II-1-2", "INc-Ⅱ-1-2"),
    ("INc-II-2-1", "INc-Ⅱ-2-1"),
    ("INc-II-2-1-2", "INc-Ⅱ-2-2"),  # ← 匯入手誤修正
    ("INc-II-7-1", "INc-Ⅱ-7-1"),
    ("INc-II-7-2", "INc-Ⅱ-7-2"),
    ("INc-II-7-3", "INc-Ⅱ-7-3"),
    ("INc-II-7-4", "INc-Ⅱ-7-4"),
    ("INc-II-10-1", "INc-Ⅱ-10-1"),
    ("INc-II-10-2", "INc-Ⅱ-10-2"),
    ("INc-II-10-3", "INc-Ⅱ-10-3"),
    ("INc-II-10-4", "INc-Ⅱ-10-4"),
    ("INc-II-10-5", "INc-Ⅱ-10-5"),
    ("INc-III-15-1", "INc-Ⅲ-15-1"),
    ("INd-II-2-1", "INd-Ⅱ-2-1"),
    ("INd-II-2-2", "INd-Ⅱ-2-2"),
    ("INd-II-2-3", "INd-Ⅱ-2-3"),
    ("INe-II-3-01", "INe-Ⅱ-3-01"),
    ("INe-II-3-02", "INe-Ⅱ-3-02"),
    ("INe-II-3-03", "INe-Ⅱ-3-03"),
    ("INe-II-3-04", "INe-Ⅱ-3-04"),
    ("INe-II-3-05", "INe-Ⅱ-3-05"),
    ("INe-III-9-1", "INe-Ⅲ-9-1"),
    ("INe-III-9-2", "INe-Ⅲ-9-2"),
]

# 額外只在 prerequisites 陣列裡出現的 Ⅲ/III 錯字（節點本身已是羅馬，不在 RENAMES）
PREREQ_EXTRA: list[tuple[str, str]] = [
    ("INe-III-10-06", "INe-Ⅲ-10-06"),
    ("INe-III-10-07", "INe-Ⅲ-10-07"),
]

FK = "misconceptions_node_id_fkey"
NAME_OLD = "INc-Ⅲ-15-1  認識天體的分類"
NAME_NEW = "認識天體的分類"


def _apply(mapping: list[tuple[str, str]], prereq_extra: list[tuple[str, str]]) -> None:
    conn = op.get_bind()
    # 1) 卸下 misconceptions 對 knowledge_nodes 的 FK（ON UPDATE NO ACTION，否則改 id 會被擋）
    op.drop_constraint(FK, "misconceptions", type_="foreignkey")

    # 2) 逐筆改主鍵與所有純字串引用欄
    for old, new in mapping:
        conn.execute(
            text("UPDATE knowledge_nodes SET id = :new WHERE id = :old"),
            {"old": old, "new": new},
        )
        conn.execute(
            text("UPDATE misconceptions SET node_id = :new WHERE node_id = :old"),
            {"old": old, "new": new},
        )
        conn.execute(
            text(
                "UPDATE quiz_questions SET knowledge_node_id = :new "
                "WHERE knowledge_node_id = :old"
            ),
            {"old": old, "new": new},
        )
        conn.execute(
            text(
                "UPDATE custom_misconceptions SET node_id = :new WHERE node_id = :old"
            ),
            {"old": old, "new": new},
        )
        # 陣列欄：quizzes.knowledge_node_ids
        conn.execute(
            text(
                "UPDATE quizzes SET knowledge_node_ids = "
                "array_replace(knowledge_node_ids, :old, :new) "
                "WHERE :old = ANY(knowledge_node_ids)"
            ),
            {"old": old, "new": new},
        )
        # 陣列欄：knowledge_nodes.prerequisites
        conn.execute(
            text(
                "UPDATE knowledge_nodes SET prerequisites = "
                "array_replace(prerequisites, :old, :new) "
                "WHERE :old = ANY(prerequisites)"
            ),
            {"old": old, "new": new},
        )

    # 3) prerequisites 內的額外 Ⅲ/III 錯字
    for old, new in prereq_extra:
        conn.execute(
            text(
                "UPDATE knowledge_nodes SET prerequisites = "
                "array_replace(prerequisites, :old, :new) "
                "WHERE :old = ANY(prerequisites)"
            ),
            {"old": old, "new": new},
        )

    # 4) 重新掛回 FK
    op.create_foreign_key(
        FK, "misconceptions", "knowledge_nodes",
        ["node_id"], ["id"], ondelete="CASCADE",
    )


def upgrade() -> None:
    _apply(RENAMES, PREREQ_EXTRA)
    # 名稱去重（INc-Ⅲ-15-1 名稱開頭重複編號）
    op.get_bind().execute(
        text("UPDATE knowledge_nodes SET name = :new WHERE id = :id AND name = :old"),
        {"id": "INc-Ⅲ-15-1", "old": NAME_OLD, "new": NAME_NEW},
    )


def downgrade() -> None:
    reverse = [(new, old) for old, new in RENAMES]
    reverse_prereq = [(new, old) for old, new in PREREQ_EXTRA]
    # 還原名稱
    op.get_bind().execute(
        text("UPDATE knowledge_nodes SET name = :old WHERE id = :id AND name = :new"),
        {"id": "INc-Ⅲ-15-1", "old": NAME_OLD, "new": NAME_NEW},
    )
    _apply(reverse, reverse_prereq)
