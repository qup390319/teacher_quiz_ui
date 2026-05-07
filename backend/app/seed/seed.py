"""Seed mock data into the database.

P1: teacher (aaa001) + 3 classes + ~60 students with accounts.
P3: quizzes / scenarios / assignments (loaded from app/seed/data/*.json).
P4: student_answers (~280 rows) so the dashboard demo has data without manual quiz-taking.

Run:
    uv run python -m app.seed.seed              # seed (idempotent: skips existing rows)
    uv run python -m app.seed.seed --if-empty   # only when DB has no users
    uv run python -m app.seed.seed --reset      # truncate then re-seed (DEV ONLY)
"""
import argparse
import asyncio
import json
from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Assignment,
    AssignmentStudent,
    Class,
    FollowupResult,
    Quiz,
    QuizOption,
    QuizQuestion,
    ScenarioQuestion,
    ScenarioQuiz,
    Student,
    StudentAnswer,
    Teacher,
    User,
)
from app.db.session import AsyncSessionLocal, engine

DATA_DIR = Path(__file__).parent / "data"

# --- Static seed data -------------------------------------------------------
TEACHER_ACCOUNT = "aaa001"
TEACHER_NAME = "示範老師"
# Production launch teacher: starts with no classes/students/assignments. Sees
# only the system-shared quizzes + scenarios so they can run the system for
# real. See spec-13 §6.1.
PROD_TEACHER_ACCOUNT = "bbb001"
PROD_TEACHER_NAME = "黃老師"

CLASSES = [
    {
        "id": "class-A", "name": "五年甲班", "grade": "五年級", "subject": "自然科學",
        "color": "#C8EAAE", "text_color": "#3D5A3E",
        "account_prefix": "115", "account_seat_offset": 0,  # 115001~115020
        "students": [
            "王小明", "李美玲", "張志豪", "陳佳慧", "林俊傑",
            "黃雅婷", "吳建宏", "劉淑芬", "蔡宗翰", "鄭雨晴",
            "許文彬", "謝欣妤", "楊偉誠", "賴芷瑄", "蕭明哲",
            "周怡君", "江柏宇", "洪佩珊", "邱振源", "盧雅文",
        ],
    },
    {
        "id": "class-B", "name": "五年乙班", "grade": "五年級", "subject": "自然科學",
        "color": "#BADDF4", "text_color": "#2E86C1",
        "account_prefix": "115", "account_seat_offset": 100,  # 115101~115118
        "students": [
            "陳大同", "林小花", "黃建民", "吳美華", "張偉強",
            "李淑貞", "王志明", "陳雅琪", "林宗翰", "劉怡君",
            "蔡明哲", "鄭佩珊", "許俊傑", "謝芷瑄", "楊雅婷",
            "賴文彬", "江柏宇", "洪振源",
        ],
    },
    {
        "id": "class-C", "name": "五年丙班", "grade": "五年級", "subject": "自然科學",
        "color": "#FCF0C2", "text_color": "#B7950B",
        "account_prefix": "115", "account_seat_offset": 200,  # 115201~115222
        "students": [
            "周明德", "吳珊珊", "林志成", "陳雅雯", "張文昌",
            "黃淑惠", "王建華", "李秀英", "蔡志遠", "鄭美玲",
            "許家豪", "謝宜庭", "楊承翰", "賴佳蓉", "蕭宗霖",
            "周欣怡", "江育誠", "洪雅萍", "邱冠廷", "盧亭妤",
            "方俊霖", "施雅筑",
        ],
    },
]


# --- Seed routines ----------------------------------------------------------
async def db_is_empty(db: AsyncSession) -> bool:
    res = await db.execute(select(User).limit(1))
    return res.scalar_one_or_none() is None


async def _seed_one_teacher(db: AsyncSession, account: str, name: str) -> None:
    if await db.get(User, account):
        return
    db.add(User(
        id=account, account=account, password=account,
        role="teacher", password_was_default=True,
    ))
    db.add(Teacher(user_id=account, name=name))


async def seed_teacher(db: AsyncSession) -> None:
    await _seed_one_teacher(db, TEACHER_ACCOUNT, TEACHER_NAME)
    await _seed_one_teacher(db, PROD_TEACHER_ACCOUNT, PROD_TEACHER_NAME)


async def seed_classes_and_students(db: AsyncSession) -> None:
    for cls in CLASSES:
        existing_class = await db.get(Class, cls["id"])
        if not existing_class:
            db.add(Class(
                id=cls["id"], name=cls["name"], grade=cls["grade"],
                subject=cls["subject"], color=cls["color"], text_color=cls["text_color"],
                teacher_id=TEACHER_ACCOUNT,
            ))
        elif existing_class.teacher_id is None:
            # Older DB rows from before per-teacher isolation — claim for demo teacher.
            existing_class.teacher_id = TEACHER_ACCOUNT
        prefix = cls["account_prefix"]
        offset = cls["account_seat_offset"]
        for seat, name in enumerate(cls["students"], start=1):
            account = f"{prefix}{offset + seat:03d}"
            existing = await db.get(User, account)
            if existing:
                continue
            db.add(User(
                id=account, account=account, password=account,
                role="student", password_was_default=True,
            ))
            db.add(Student(
                user_id=account, name=name, seat=seat, class_id=cls["id"],
            ))


async def seed_quizzes(db: AsyncSession) -> int:
    """Load quizzes (with nested questions + options) from JSON."""
    payload = json.loads((DATA_DIR / "quizzes.json").read_text(encoding="utf-8"))
    inserted = 0
    for q in payload:
        if await db.get(Quiz, q["id"]):
            continue
        db.add(Quiz(
            id=q["id"],
            title=q["title"],
            status=q.get("status", "draft"),
            knowledge_node_ids=q.get("knowledgeNodeIds", []),
            created_by=TEACHER_ACCOUNT,
        ))
        await db.flush()
        for question in q["questions"]:
            qq = QuizQuestion(
                quiz_id=q["id"],
                order_index=question["id"],
                stem=question["stem"],
                knowledge_node_id=question["knowledgeNodeId"],
            )
            db.add(qq)
            await db.flush()
            for opt in question["options"]:
                db.add(QuizOption(
                    question_id=qq.id,
                    tag=opt["tag"],
                    content=opt["content"],
                    diagnosis=opt["diagnosis"],
                ))
        inserted += 1
    return inserted


async def seed_scenarios(db: AsyncSession) -> int:
    """Load scenario quizzes (with nested questions) from JSON."""
    payload = json.loads((DATA_DIR / "scenarios.json").read_text(encoding="utf-8"))
    inserted = 0
    for sq in payload:
        if await db.get(ScenarioQuiz, sq["id"]):
            continue
        db.add(ScenarioQuiz(
            id=sq["id"],
            title=sq["title"],
            status=sq.get("status", "draft"),
            target_node_id=sq["targetNodeId"],
            target_misconceptions=sq.get("targetMisconceptions", []),
            created_by=TEACHER_ACCOUNT,
        ))
        await db.flush()
        for question in sq["questions"]:
            db.add(ScenarioQuestion(
                scenario_quiz_id=sq["id"],
                order_index=question["index"],
                title=question["title"],
                scenario_text=question["scenarioText"],
                scenario_images=question.get("scenarioImages", []),
                scenario_image_zoomable=question.get("scenarioImageZoomable", False),
                initial_message=question["initialMessage"],
                expert_model=question["expertModel"],
                target_misconceptions=question.get("targetMisconceptions", []),
            ))
        inserted += 1
    return inserted


async def seed_assignments(db: AsyncSession) -> int:
    """Load assignments from JSON."""
    payload = json.loads((DATA_DIR / "assignments.json").read_text(encoding="utf-8"))
    inserted = 0
    for a in payload:
        if await db.get(Assignment, a["id"]):
            continue
        target_type = a.get("targetType", "class")
        student_ids = a.get("studentIds", []) or []
        db.add(Assignment(
            id=a["id"],
            type=a.get("type", "diagnosis"),
            quiz_id=a.get("quizId"),
            scenario_quiz_id=a.get("scenarioQuizId"),
            class_id=a["classId"],
            target_type=target_type,
            assigned_at=date.fromisoformat(a["assignedAt"]),
            due_date=date.fromisoformat(a["dueDate"]),
            status=a.get("status", "active"),
        ))
        for sid in student_ids:
            db.add(AssignmentStudent(assignment_id=a["id"], student_id=sid))
        inserted += 1
    return inserted


async def seed_student_answers(db: AsyncSession) -> int:
    """Insert one student_answer row per (assignment, student, question) using the mock distribution.

    P4: replaces the front-end ANSWER_DISTRIBUTIONS_MAP. Skip if any answer already exists
    for the assignment to avoid double-seeding.
    """
    payload = json.loads((DATA_DIR / "answer_distributions.json").read_text(encoding="utf-8"))
    inserted = 0

    for entry in payload["distributions"]:
        assignment_id = entry["assignmentId"]
        quiz_id = entry["quizId"]
        class_id = entry["classId"]

        # Skip if any answer already exists for this assignment
        existing = await db.execute(
            select(StudentAnswer).where(StudentAnswer.assignment_id == assignment_id).limit(1),
        )
        if existing.scalar_one_or_none() is not None:
            continue

        # Load all quiz questions ordered by order_index, with options
        from sqlalchemy.orm import selectinload
        q_res = await db.execute(
            select(QuizQuestion)
            .where(QuizQuestion.quiz_id == quiz_id)
            .order_by(QuizQuestion.order_index)
            .options(selectinload(QuizQuestion.options)),
        )
        questions = list(q_res.scalars().all())

        # Load all students for this class ordered by seat
        s_res = await db.execute(
            select(Student).where(Student.class_id == class_id).order_by(Student.seat),
        )
        students = list(s_res.scalars().all())

        per_q = entry["perQuestion"]  # [Q][studentIdx] = 'A'|'B'|'C'|'D'

        for q_idx, question in enumerate(questions):
            tag_for_idx = per_q[q_idx] if q_idx < len(per_q) else None
            if not tag_for_idx:
                continue
            opt_by_tag = {opt.tag: opt for opt in question.options}
            for s_idx, student in enumerate(students):
                if s_idx >= len(tag_for_idx):
                    break  # distribution shorter than student list
                tag = tag_for_idx[s_idx]
                opt = opt_by_tag.get(tag)
                if opt is None:
                    continue
                db.add(StudentAnswer(
                    assignment_id=assignment_id,
                    student_id=student.user_id,
                    question_id=question.id,
                    selected_tag=tag,
                    diagnosis=opt.diagnosis,
                ))
                inserted += 1
    return inserted


async def seed_followups(db: AsyncSession) -> int:
    """Mock N3 follow-up dialogues for non-CORRECT answers.

    Each StudentAnswer whose diagnosis is a misconception code (M??-?) gets a
    FollowupResult with a 4-message conversation_log so the dashboard shows
    something when teachers click into followup conversations and so the
    student's own report has chat content.

    Idempotent: skips any answer that already has a follow-up.
    """
    res = await db.execute(
        select(StudentAnswer).where(StudentAnswer.diagnosis != "CORRECT"),
    )
    answers = list(res.scalars().all())
    if not answers:
        return 0

    have_res = await db.execute(
        select(FollowupResult.student_answer_id)
        .where(FollowupResult.student_answer_id.in_([a.id for a in answers])),
    )
    have = {row[0] for row in have_res.all()}

    inserted = 0
    for a in answers:
        if a.id in have:
            continue
        m = a.diagnosis  # e.g. "M02-4"
        convo = [
            {"role": "assistant", "content": f"我注意到你選了 {a.selected_tag}。可以說說你為什麼這樣想嗎？"},
            {"role": "student",   "content": f"我覺得這選項看起來最合理，所以選 {a.selected_tag}。"},
            {"role": "assistant", "content": "很好，那我們來想想看：如果把溶液繼續加水稀釋，那些溶質會發生什麼變化？"},
            {"role": "student",   "content": "嗯…我想可能會慢慢消失，因為溶解就是不見了。"},
        ]
        db.add(FollowupResult(
            student_answer_id=a.id,
            conversation_log=convo,
            final_status="MISCONCEPTION",
            misconception_code=m,
            reasoning_quality="WEAK",
            status_change={},
            ai_summary=f"學生對 {m} 的概念仍有迷思，傾向把溶解視為物質消失。建議從重量守恆切入再次討論。",
        ))
        inserted += 1
    return inserted


async def run_seed(*, if_empty: bool, reset: bool) -> None:
    async with AsyncSessionLocal() as db:
        if reset:
            print("[seed] --reset: truncating all tables")
            await _truncate_all(db)
        if if_empty and not await db_is_empty(db):
            print("[seed] --if-empty: DB already has users, skipping")
            return
        await seed_teacher(db)
        await seed_classes_and_students(db)
        n_quiz = await seed_quizzes(db)
        n_scen = await seed_scenarios(db)
        n_asg = await seed_assignments(db)
        await db.commit()  # commit so seed_student_answers can query above rows
        n_ans = await seed_student_answers(db)
        await db.commit()
        n_fup = await seed_followups(db)
        await db.commit()
        print(
            f"[seed] done — teachers {TEACHER_ACCOUNT} (demo) + {PROD_TEACHER_ACCOUNT} ({PROD_TEACHER_NAME}, empty), "
            f"{sum(len(c['students']) for c in CLASSES)} students across {len(CLASSES)} classes, "
            f"{n_quiz} quizzes, {n_scen} scenarios, {n_asg} assignments, "
            f"{n_ans} student answers, {n_fup} follow-up conversations.",
        )


async def _truncate_all(db: AsyncSession) -> None:
    """Dev-only: clear data tables (cascading FKs)."""
    from sqlalchemy import text
    tables = [
        "ai_summary_cache", "treatment_messages", "treatment_sessions",
        "followup_results", "student_answers",
        "assignment_students", "assignments",
        "scenario_questions", "scenario_quizzes",
        "quiz_options", "quiz_questions", "quizzes",
        "students", "teachers", "classes", "users",
    ]
    await db.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
    await db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed SciLens DB.")
    parser.add_argument("--if-empty", action="store_true",
                        help="Only seed when DB has no users.")
    parser.add_argument("--reset", action="store_true",
                        help="DEV ONLY: truncate all tables first.")
    args = parser.parse_args()

    async def _main() -> None:
        try:
            await run_seed(if_empty=args.if_empty, reset=args.reset)
        finally:
            await engine.dispose()

    asyncio.run(_main())


if __name__ == "__main__":
    main()
