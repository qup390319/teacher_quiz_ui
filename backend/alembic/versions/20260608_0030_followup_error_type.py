"""Add error_type column to followup_results.

持久化追問診斷的「答錯主導方向」（spec-09 §12.4a：EXPLANATION / DEFINITION /
OBSERVATION / NULL）。先前 errorType 只存在於前端 in-memory 快照，重新登入/重整/切換
分頁後就遺失，報告會顯示「未分類」。加上此欄位讓報告能從 DB 還原分類標籤。

新增為 nullable 欄位，對既有資料無影響（舊 followup 維持 NULL = 未分類）。

Revision ID: 0030_followup_error_type
Revises: 0029_literature_misconceptions
Create Date: 2026-06-08
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0030_followup_error_type"
down_revision: str | None = "0029_literature_misconceptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "followup_results",
        sa.Column("error_type", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("followup_results", "error_type")
