"""One-time script: patch quiz-001 options (Q3 C/D + Q4 A) to match revised content.

Usage (inside backend container):
    python -m app.scripts.patch_quiz001_options [--dry-run]
"""
import argparse
import asyncio
import logging

from sqlalchemy import select

from app.db.models.quiz import QuizOption, QuizQuestion
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

QUIZ_ID = "quiz-001"

PATCHES = [
    {
        "order_index": 3, "tag": "C",
        "content": "不管加多少鹽進去，只要持續加熱或攪拌，水都能把鹽全部溶光，不會有溶不下的問題。",
        "diagnosis": "M05-3",
    },
    {
        "order_index": 3, "tag": "D",
        "content": "就算用加熱讓鹽全部溶開，放一陣子後鹽還是會自己跑回杯底，所以最後一定會有溶不掉的鹽。",
        "diagnosis": "M05-1",
    },
    {
        "order_index": 4, "tag": "A",
        "content": "用嘴巴嚐嚐看味道。",
        "diagnosis": "M09-4",
    },
]


async def run(dry_run: bool) -> None:
    async with AsyncSessionLocal() as db:
        for p in PATCHES:
            row = await db.execute(
                select(QuizOption)
                .join(QuizQuestion, QuizOption.question_id == QuizQuestion.id)
                .where(QuizQuestion.quiz_id == QUIZ_ID)
                .where(QuizQuestion.order_index == p["order_index"])
                .where(QuizOption.tag == p["tag"])
            )
            opt = row.scalar_one_or_none()
            if opt is None:
                logger.warning("Q%d %s not found — skipped", p["order_index"], p["tag"])
                continue
            before = (opt.content, opt.diagnosis)
            after = (p["content"], p["diagnosis"])
            if before == after:
                logger.info("Q%d %s already up-to-date", p["order_index"], p["tag"])
                continue
            logger.info("Q%d %s: %s → %s", p["order_index"], p["tag"], before, after)
            if not dry_run:
                opt.content = p["content"]
                opt.diagnosis = p["diagnosis"]
        if dry_run:
            logger.info("--dry-run: no changes committed")
        else:
            await db.commit()
            logger.info("committed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
