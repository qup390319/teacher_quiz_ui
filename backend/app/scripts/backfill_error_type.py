"""One-time script: backfill error_type for existing MISCONCEPTION followup results.

正式施測時 errorType 由追問 LLM 直接輸出；此腳本補分析既有資料中 error_type 為 NULL
的迷思紀錄（多為當時 LLM 未輸出或走 rule-based fallback）。

Usage (inside backend container):
    python -m app.scripts.backfill_error_type [--dry-run] [--concurrency 3]
"""
import argparse
import asyncio
import json
import logging

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.scripts.backfill_cause_ids import MISCONCEPTION_LABELS, NODE_BY_MISCONCEPTION
from app.services.error_type_analysis_service import analyze_error_type

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def backfill(dry_run: bool = False, concurrency: int = 3, limit: int = 0):
    sem = asyncio.Semaphore(concurrency)
    updated = 0
    failed = 0
    skipped = 0

    async with AsyncSessionLocal() as db:
        # 目標：報告會以「答錯」呈現的卡片（finalStatus 非 CORRECT）。CORRECT 依
        # spec-09 §12.4a 規則 errorType 必為 null，不在補分析範圍。
        result = await db.execute(text(
            "SELECT id, misconception_code, conversation_log "
            "FROM followup_results "
            "WHERE error_type IS NULL AND final_status IN ('MISCONCEPTION', 'UNCERTAIN') "
            "ORDER BY id",
        ))
        rows = result.all()

    if limit > 0:
        rows = rows[:limit]
    logger.info("Found %d rows to backfill (dry_run=%s, limit=%s)", len(rows), dry_run, limit or "all")

    async def process_row(row_id: int, code: str | None, conv_log):
        nonlocal updated, failed, skipped
        async with sem:
            log_data = conv_log if isinstance(conv_log, list) else json.loads(conv_log) if conv_log else []
            if not log_data:
                skipped += 1
                return

            label = MISCONCEPTION_LABELS.get(code)
            node = NODE_BY_MISCONCEPTION.get(code)

            try:
                error_type = await analyze_error_type(
                    conversation_log=log_data,
                    misconception_code=code,
                    misconception_label=label,
                    knowledge_node=node,
                )
            except Exception as exc:
                logger.warning("Row %d failed: %s", row_id, exc)
                failed += 1
                return

            if not error_type:
                logger.info("Row %d: LLM returned null errorType (line不足/無法判讀)", row_id)
                skipped += 1
                return

            logger.info("Row %d (%s): errorType=%s", row_id, code, error_type)

            if not dry_run:
                async with AsyncSessionLocal() as db:
                    await db.execute(
                        text("UPDATE followup_results SET error_type = :et WHERE id = :rid"),
                        {"et": error_type, "rid": row_id},
                    )
                    await db.commit()
            updated += 1

    tasks = [process_row(r[0], r[1], r[2]) for r in rows]
    await asyncio.gather(*tasks)

    logger.info("Done. updated=%d failed=%d skipped=%d total=%d", updated, failed, skipped, len(rows))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print without writing to DB")
    parser.add_argument("--concurrency", type=int, default=3, help="Max concurrent LLM calls")
    parser.add_argument("--limit", type=int, default=0, help="Only process first N rows (0 = all)")
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run, concurrency=args.concurrency, limit=args.limit))


if __name__ == "__main__":
    main()
