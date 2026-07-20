"""One-time script: backfill cause_ids for existing MISCONCEPTION followup results.

Usage (inside backend container):
    python -m app.scripts.backfill_cause_ids [--dry-run] [--concurrency 3]
"""
import argparse
import asyncio
import json
import logging

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.services.cause_analysis_service import analyze_cause

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MISCONCEPTION_LABELS = {
    "M02-1": "溶解即消失",
    "M02-2": "溶解與融化混淆",
    "M02-3": "溶解後性質改變",
    "M02-4": "溶解不可逆",
    "M03-1": "攪拌增加溶解量",
    "M03-2": "不攪拌就不溶解",
    "M03-3": "沉澱物可被攪拌溶解",
    "M03-4": "攪拌不影響溶解速率",
    "M05-1": "溫度升高可無限溶解",
    "M05-2": "沉澱是因為太重",
    "M05-3": "飽和後仍可加入更多",
    "M05-4": "溶質浮在水面",
    "M09-1": "味覺判斷酸鹼",
    "M09-2": "無味等於中性",
    "M09-3": "名稱判斷酸鹼",
    "M09-4": "嘗味道是安全的判斷法",
    "M12-1": "酸鹼都危險",
    "M12-2": "濃度等於酸鹼強度",
    "M12-3": "中和後物質消失",
    "M12-4": "名字有酸就危險",
}

NODE_BY_MISCONCEPTION = {
    "M02-1": "溶解現象", "M02-2": "溶解現象", "M02-3": "溶解現象", "M02-4": "溶解現象",
    "M03-1": "影響溶解速率的因素", "M03-2": "影響溶解速率的因素",
    "M03-3": "影響溶解速率的因素", "M03-4": "影響溶解速率的因素",
    "M05-1": "飽和溶液", "M05-2": "飽和溶液", "M05-3": "飽和溶液", "M05-4": "飽和溶液",
    "M09-1": "酸鹼指示劑", "M09-2": "酸鹼指示劑", "M09-3": "酸鹼指示劑", "M09-4": "酸鹼指示劑",
    "M12-1": "酸鹼在生活中的應用", "M12-2": "酸鹼在生活中的應用",
    "M12-3": "酸鹼在生活中的應用", "M12-4": "酸鹼在生活中的應用",
}


async def backfill(dry_run: bool = False, concurrency: int = 3):
    sem = asyncio.Semaphore(concurrency)
    updated = 0
    failed = 0
    skipped = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(text(
            "SELECT id, misconception_code, conversation_log "
            "FROM followup_results "
            "WHERE cause_ids IS NULL AND final_status = 'MISCONCEPTION'"
        ))
        rows = result.all()

    logger.info("Found %d rows to backfill (dry_run=%s)", len(rows), dry_run)

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
                cause_ids = await analyze_cause(
                    conversation_log=log_data,
                    misconception_code=code,
                    misconception_label=label,
                    knowledge_node=node,
                )
            except Exception as exc:
                logger.warning("Row %d failed: %s", row_id, exc)
                failed += 1
                return

            if not cause_ids:
                logger.info("Row %d: LLM returned empty causeIds", row_id)
                skipped += 1
                return

            logger.info("Row %d (%s): causeIds=%s", row_id, code, cause_ids)

            if not dry_run:
                async with AsyncSessionLocal() as db:
                    await db.execute(
                        text("UPDATE followup_results SET cause_ids = :ids WHERE id = :rid"),
                        {"ids": json.dumps(cause_ids), "rid": row_id},
                    )
                    await db.commit()
                updated += 1
            else:
                updated += 1

    tasks = [process_row(r[0], r[1], r[2]) for r in rows]
    await asyncio.gather(*tasks)

    logger.info("Done. updated=%d failed=%d skipped=%d total=%d", updated, failed, skipped, len(rows))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without writing to DB")
    parser.add_argument("--concurrency", type=int, default=3, help="Max concurrent LLM calls")
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run, concurrency=args.concurrency))


if __name__ == "__main__":
    main()
