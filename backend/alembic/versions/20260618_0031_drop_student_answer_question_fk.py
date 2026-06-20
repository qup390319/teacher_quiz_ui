"""Drop student_answers.question_id → quiz_questions.id FK.

student_answers.question_id 存的是「卷內題序 order_index」(1..N)，不是
quiz_questions 全域 PK。原本的外鍵語意已錯（題序值剛好命中 quiz-001 題目 PK
而沒報錯，卻讓教師端統計／追問用 PK 對位時全部對不到 → 儀表板空白）。
本系統改以 (assignment.quiz_id, order_index) 反查題目，故移除此外鍵，
連帶消除 ON DELETE SET NULL 把歷史作答題序清空的隱患。
詳見 docs/deviations.md、spec-11 §3.11。

Revision ID: 0031_drop_sa_question_fk
Revises: 0030_followup_error_type
"""

from alembic import op

revision = "0031_drop_sa_question_fk"
down_revision = "0030_followup_error_type"

_FK = "student_answers_question_id_fkey"


def upgrade() -> None:
    op.drop_constraint(_FK, "student_answers", type_="foreignkey")


def downgrade() -> None:
    op.create_foreign_key(
        _FK, "student_answers", "quiz_questions",
        ["question_id"], ["id"],
        ondelete="SET NULL",
    )
