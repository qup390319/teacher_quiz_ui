"""Two-tier diagnostic test support.

新增雙層次測驗（Treagust two-tier）所需欄位，全部 nullable / 有 default，向下相容：
  - quizzes.mode：題型 single / two-tier（舊卷預設 single）
  - quiz_questions.reason_options：第二層理由選項 JSONB（single 題為 NULL）
  - student_answers.reason_tag：第二層所選理由 tag（single 題為 NULL）
  - student_answers.quadrant：四象限判定 TT/TF/FT/FF（舊作答為 NULL）

詳見 docs/spec-04、docs/spec-11、docs/deviations.md。

Revision ID: 0032_two_tier_diagnostic
Revises: 0031_drop_sa_question_fk
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0032_two_tier_diagnostic"
down_revision = "0031_drop_sa_question_fk"


def upgrade() -> None:
    op.add_column(
        "quizzes",
        sa.Column("mode", sa.String(16), nullable=False, server_default="single"),
    )
    op.create_check_constraint(
        "quizzes_mode_chk", "quizzes", "mode IN ('single','two-tier')",
    )
    op.add_column(
        "quiz_questions",
        sa.Column("reason_options", JSONB, nullable=True),
    )
    op.add_column(
        "student_answers",
        sa.Column("reason_tag", sa.String(8), nullable=True),
    )
    op.add_column(
        "student_answers",
        sa.Column("quadrant", sa.String(2), nullable=True),
    )
    op.create_check_constraint(
        "student_answers_quadrant_chk", "student_answers",
        "quadrant IS NULL OR quadrant IN ('TT','TF','FT','FF')",
    )


def downgrade() -> None:
    op.drop_constraint("student_answers_quadrant_chk", "student_answers", type_="check")
    op.drop_column("student_answers", "quadrant")
    op.drop_column("student_answers", "reason_tag")
    op.drop_column("quiz_questions", "reason_options")
    op.drop_constraint("quizzes_mode_chk", "quizzes", type_="check")
    op.drop_column("quizzes", "mode")
