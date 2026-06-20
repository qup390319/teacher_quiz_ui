"""Seed mock data into the database.

P1: teacher (aaa001) + 3 classes + ~60 students with accounts.
P3: quizzes / scenarios / assignments (loaded from app/seed/data/*.json).
P4: student_answers (~280 rows) so the dashboard demo has data without manual quiz-taking.
P4b: treatment sessions (5 sessions × ~22 messages) so 概念釐清結果 / 釐清對話紀錄 have data.

Run:
    uv run python -m app.seed.seed              # seed (idempotent: skips existing rows)
    uv run python -m app.seed.seed --if-empty   # only when DB has no users
    uv run python -m app.seed.seed --reset      # truncate then re-seed (DEV ONLY)
"""
import argparse
import asyncio
import json
from datetime import date, datetime, timedelta
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
    TreatmentMessage,
    TreatmentSession,
    User,
)
from app.db.session import AsyncSessionLocal, engine

DATA_DIR = Path(__file__).parent / "data"

# --- Static seed data -------------------------------------------------------
TEACHER_ACCOUNT = "aaa001"
TEACHER_NAME = "黃老師(demo)"
# Production launch teacher: starts with no classes/students/assignments. Sees
# only the system-shared quizzes + scenarios so they can run the system for
# real. See spec-13 §6.1.
PROD_TEACHER_ACCOUNT = "bbb001"
PROD_TEACHER_NAME = "黃老師"
# Additional teacher accounts
USER001_ACCOUNT = "user001"
USER001_NAME = "施老師"
# System administrator (see spec-13 §2.1 and migration 0012).
ADMIN_ACCOUNT = "admin001"

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
    await _seed_one_teacher(db, USER001_ACCOUNT, USER001_NAME)


async def seed_admin(db: AsyncSession) -> None:
    """Seed the default system administrator (admin001 / admin001).

    Idempotent. The migration 0012 also inserts this row, but seeding makes
    the dependency explicit and survives --reset.
    """
    if await db.get(User, ADMIN_ACCOUNT):
        return
    db.add(User(
        id=ADMIN_ACCOUNT, account=ADMIN_ACCOUNT, password=ADMIN_ACCOUNT,
        role="admin", password_was_default=True,
    ))


async def seed_classes_and_students(db: AsyncSession) -> None:
    for cls in CLASSES:
        existing_class = await db.get(Class, cls["id"])
        if not existing_class:
            db.add(Class(
                id=cls["id"], name=cls["name"], grade=cls["grade"],
                subject=cls["subject"], color=cls["color"], text_color=cls["text_color"],
                teacher_id=TEACHER_ACCOUNT,
                school_year=2025, semester="second", status="active", archived_at=None,
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
            mode=q.get("mode", "single"),
            is_sample=q.get("isSample", False),
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
                # two-tier 第二層理由選項（JSONB）；single 題無此欄。
                reason_options=question.get("reasonOptions"),
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
    """Load assignments from JSON.

    Idempotent on the assignment row itself, AND reconciles missing
    AssignmentStudent rows for student-targeted assignments so that
    expanding studentIds in assignments.json picks up on re-seed.
    """
    payload = json.loads((DATA_DIR / "assignments.json").read_text(encoding="utf-8"))
    inserted = 0
    for a in payload:
        target_type = a.get("targetType", "class")
        student_ids = a.get("studentIds", []) or []
        if await db.get(Assignment, a["id"]):
            # Reconcile missing student rows so JSON edits propagate
            if target_type == "students" and student_ids:
                existing_res = await db.execute(
                    select(AssignmentStudent.student_id)
                    .where(AssignmentStudent.assignment_id == a["id"]),
                )
                existing_set = {row[0] for row in existing_res.all()}
                for sid in student_ids:
                    if sid not in existing_set:
                        db.add(AssignmentStudent(assignment_id=a["id"], student_id=sid))
            continue
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
        cause_map = {
            "M02-1": [2, 5], "M02-2": [6], "M02-3": [3, 5], "M02-4": [2, 6],
            "M03-1": [3, 5], "M03-2": [4, 5], "M03-3": [3], "M03-4": [1],
            "M05-1": [3], "M05-2": [5], "M05-3": [3, 4], "M05-4": [2],
            "M09-1": [2, 6], "M09-2": [4], "M09-3": [5], "M09-4": [1, 4],
            "M12-1": [5, 6], "M12-2": [3], "M12-3": [4], "M12-4": [4, 6],
        }
        db.add(FollowupResult(
            student_answer_id=a.id,
            conversation_log=convo,
            final_status="MISCONCEPTION",
            misconception_code=m,
            reasoning_quality="WEAK",
            status_change={},
            ai_summary=f"學生對 {m} 的概念仍有迷思，傾向把溶解視為物質消失。建議從重量守恆切入再次討論。",
            cause_ids=cause_map.get(m, [4]),
        ))
        inserted += 1
    return inserted


# --- Treatment session demo data -------------------------------------------
# Hand-crafted Cognitive-Apprenticeship dialogues for the demo teacher. Each
# (scenarioQuizId, studentId) gets one TreatmentSession; the outcome label
# below maps to the (stage, hintLevel) shape that deriveSessionOutcome expects
# (see src/lib/treatmentOutcomes.js).
#
# Outcomes per question:
#   "mastered"   — student walks through claim → evidence → reasoning → complete with hintLevel=0
#   "light"      — like mastered but the reasoning step bumps hintLevel to 1
#   "moderate"   — full mock flow including modeling (hintLevel peaks at 2) then complete
#   "heavy"      — modeling + strong coaching (hintLevel peaks at 3)
#   "unresolved" — never reaches stage='complete' (session ends mid-flow)

Q1_CONTEXT = {  # scenario-002 / Q1 — A vs B 杯甜度
    "step1_text": (
        "主張，就是你對這個問題的看法和想法。\n\n"
        "請先說說你的主張：你覺得 A 杯（上層）和 B 杯（下層）哪一杯比較甜？"
    ),
    "step2_text": (
        "證據，就是支持你主張的線索，讓你的想法更有說服力。\n\n"
        "你的證據是什麼呢？你可以從題目資訊或生活經驗中找線索喔。"
    ),
    "modeling_text": (
        "如果是我，我會先比較兩杯糖水的顏色。"
        "題目說 A 杯和 B 杯看起來顏色一樣，這個線索代表什麼呢？\n\n"
        "你覺得，如果兩杯糖的濃度不同，顏色會一樣嗎？"
    ),
    "coaching_text": "把你剛剛說的「下面有糖」跟「兩杯顏色一樣」這兩件事一起想，你覺得會發現什麼呢？",
    "coaching_strong_text": "你可以這樣想：杯底的固體砂糖沒有溶進水裡，這些糖會讓上面的糖水變甜嗎？",
    "scaffolding_text": (
        "我先幫你整理一下：你已經注意到「兩杯顏色一樣」這個線索。"
        "糖溶在水裡會均勻分散，所以沉澱在底部的固體糖，不會讓上面的水變甜。"
        "你覺得這樣是不是比較清楚呢？"
    ),
    "cer_template_text": (
        "你剛剛已經提到兩杯顏色一樣這個重點。你可以用這個方式整理成一段話：\n\n"
        "我覺得 A 杯和 B 杯＿＿＿＿。因為我看到＿＿＿＿。這表示＿＿＿＿。所以我覺得＿＿＿＿。"
    ),
    "claim_student": "B 比較甜吧",
    "evidence_student": "下面有糖啊",
    "reasoning_student": "嗯…顏色一樣耶",
    "coaching_student": "喔…那是不是糖都散開了？",
    "coaching_student_struggle": "嗯…我不太會講",
    "scaffolding_student": "嗯，比較清楚了",
    "cer_student": "兩杯一樣甜 顏色一樣 糖會散開",
}
Q2_CONTEXT = {  # scenario-002 / Q2 — 飽和後再加糖
    "step1_text": (
        "主張，就是你對這個問題的看法和想法。\n\n"
        "請先說說你的主張：你同不同意小明說『再加 3 匙糖後，這杯糖水一定會更甜』？"
    ),
    "step2_text": (
        "證據，就是支持你主張的線索，讓你的想法更有說服力。\n\n"
        "你的證據是什麼呢？你可以從題目資訊、圖表、紀錄表，或生活經驗中找線索喔。"
    ),
    "modeling_text": (
        "如果是我，我會先看甜度變化圖。"
        "前面加糖時甜度一直上升，那到了第 7 匙之後，甜度有沒有繼續上升呢？\n\n"
        "你看圖表，到第 7 匙後，甜度有繼續增加嗎？"
    ),
    "coaching_text": "你看到圖上第 7 匙後，甜度線還有繼續往上嗎？",
    "coaching_strong_text": "你可以這樣想：多加進去的糖如果沒有再溶解，會算進糖水的甜度嗎？",
    "scaffolding_text": (
        "我先幫你整理一下：你已經注意到「第 7 匙後甜度不再上升」和「開始出現沉澱」這兩個線索。"
        "甜度看的是已經溶解的糖，沒溶解的就只會沉在底下。"
        "你覺得這樣是不是比較清楚呢？"
    ),
    "cer_template_text": (
        "你剛剛已經提到第 7 匙後甜度不再增加、也開始出現沉澱。你可以用這個方式整理成一段話：\n\n"
        "我＿＿＿＿小明的想法。因為我看到＿＿＿＿。這表示＿＿＿＿。所以我覺得＿＿＿＿。"
    ),
    "claim_student": "會更甜啊",
    "evidence_student": "因為多加 3 匙糖",
    "reasoning_student": "嗯…好像沒有耶",
    "coaching_student": "對啊，圖上後面是平的",
    "coaching_student_struggle": "嗯…我不太會講",
    "scaffolding_student": "嗯，比較清楚了",
    "cer_student": "不會更甜 因為糖溶不下去了 都沉在底下",
}


SCENARIO_002_TOTAL_QUESTIONS = 2  # keep aligned with scenarios.json


def _complete_text(is_last_question: bool) -> str:
    """Mirrors PROMPTS_BY_STAGE.complete in src/data/treatmentBot.js."""
    if is_last_question:
        return "太棒了！你已經能用主張、證據、推理把整個想法說清楚了。整份概念釐清題組到這裡就完成了，辛苦你了！"
    return "太棒了！你已經能用主張、證據、推理把整個想法說清楚了。這題我們先到這裡，準備進入下一題！"


def _question_messages(
    question_index: int,
    outcome: str,
    ctx: dict,
) -> list[dict]:
    """Build the AI/student message sequence for one question of one session.

    對齊原系統 prompt【新版狀態機】：
      step1 claim → step2 evidence → step3 modeling → step4 coaching
      → step5 scaffolding → step6 CER restatement → step7 complete

    Outcome → hintLevel 對照（影響教師端「概念釐清結果」的三色階）：
      mastered   全程 hint=0 — 學生表現好，AI 從未加碼提示
      light      step6 CER template hint=1 — 模板給得很輕
      moderate   step4/5 hint=1、step6 hint=2 — 預設完整鷹架
      heavy      step4 多停一輪 hint=2、step6 hint=3 — 強鷹架
      unresolved 走到 step3 modeling 後就卡住（沒有 step6 complete）
    """
    msgs: list[dict] = []
    is_last = question_index >= SCENARIO_002_TOTAL_QUESTIONS

    # step 1 — claim（介紹「主張」+ 提問）
    msgs.append({
        "role": "ai", "step": 1, "stage": "claim", "phase": "diagnosis",
        "hint_level": 0,
        "text": ctx["step1_text"],
        "feedback": "試著說說你的看法吧！",
    })
    msgs.append({"role": "student", "text": ctx["claim_student"]})

    # step 2 — evidence（介紹「證據」+ 提問）
    msgs.append({
        "role": "ai", "step": 2, "stage": "evidence", "phase": "diagnosis",
        "hint_level": 0,
        "text": ctx["step2_text"],
        "feedback": "你做得很棒，繼續！",
    })
    msgs.append({"role": "student", "text": ctx["evidence_student"]})

    if outcome == "unresolved":
        # 走到 step3 modeling 後學生卡住、session 仍 active、未到達 complete
        msgs.append({
            "role": "ai", "step": 3, "stage": "reasoning", "phase": "apprenticeship",
            "hint_level": 0,
            "text": ctx["modeling_text"],
            "feedback": "認真想想看！",
        })
        msgs.append({"role": "student", "text": "嗯…我不太懂"})
        return msgs

    # step 3 — Modeling（專家示範切入點，不公開答案）
    msgs.append({
        "role": "ai", "step": 3, "stage": "reasoning", "phase": "apprenticeship",
        "hint_level": 0,
        "text": ctx["modeling_text"],
        "feedback": "認真想想看！",
    })
    msgs.append({"role": "student", "text": ctx["reasoning_student"]})

    # step 4 — Coaching（依學生狀況做認知衝突 / 概念驗證）
    coaching_hint = 1 if outcome in {"moderate", "heavy"} else 0
    msgs.append({
        "role": "ai", "step": 4, "stage": "reasoning", "phase": "apprenticeship",
        "hint_level": coaching_hint,
        "text": ctx["coaching_text"],
        "feedback": "好線索！",
    })
    msgs.append({"role": "student", "text": ctx["coaching_student"]})

    if outcome == "heavy":
        # heavy：coaching 再停一輪、升到 mechanism hint
        msgs.append({
            "role": "ai", "step": 4, "stage": "reasoning", "phase": "apprenticeship",
            "hint_level": 2,
            "text": ctx["coaching_strong_text"],
            "feedback": "再試一次就更穩了！",
        })
        msgs.append({"role": "student", "text": ctx["coaching_student_struggle"]})

    # step 5 — Scaffolding（AI 統整 + 確認）
    scaffolding_hint = 1 if outcome in {"moderate", "heavy"} else 0
    msgs.append({
        "role": "ai", "step": 5, "stage": "reasoning", "phase": "apprenticeship",
        "hint_level": scaffolding_hint,
        "text": ctx["scaffolding_text"],
        "feedback": "論證越來越完整了！",
    })
    msgs.append({"role": "student", "text": ctx["scaffolding_student"]})

    # step 6 — CER restatement（提供模板、requiresRestatement=true）
    cer_hint = {
        "mastered": 0,
        "light": 1,
        "moderate": 2,
        "heavy": 3,
    }[outcome]
    msgs.append({
        "role": "ai", "step": 6, "stage": "revise", "phase": "cer",
        "hint_level": cer_hint,
        "text": ctx["cer_template_text"],
        "feedback": "你做得很棒，繼續！",
        "requires_restatement": True,
    })
    msgs.append({"role": "student", "text": ctx["cer_student"]})

    # step 7 — 收束（先鼓勵、不問新問題）
    msgs.append({
        "role": "ai", "step": 7, "stage": "complete", "phase": "completed",
        "hint_level": 0,
        "text": _complete_text(is_last),
        "feedback": "完成這一題！",
    })
    return msgs


# scenarioQuizId + (per-question outcome) plan. Order of students matters
# only because started_at is staggered for prettier sort order.
TREATMENT_PLAN = [
    # (student_id, [outcome_q1, outcome_q2], final_status)
    ("115001", ["mastered", "mastered"], "completed"),
    ("115002", ["moderate", "moderate"], "completed"),
    ("115003", ["light", "unresolved"], "active"),   # Q2 沒完成 → session 仍為 active
    ("115004", ["heavy", "heavy"], "completed"),
    ("115007", ["unresolved", "unresolved"], "active"),  # 學生只走到 Q1 一半
]


async def seed_treatment_sessions(db: AsyncSession) -> int:
    """Seed scenario-002 treatment sessions for class-A demo students.

    Idempotent: skip if a (scenario_quiz_id, student_id) pair already exists.
    Each session gets ~6-12 messages spread across the 2 questions so the
    teacher dashboard for 概念釐清結果 / 概念釐清對話紀錄 has data.
    """
    scenario_id = "scenario-002"
    sq = await db.get(ScenarioQuiz, scenario_id)
    if sq is None:
        return 0  # nothing to seed against

    inserted = 0
    base_started = datetime.utcnow() - timedelta(days=3)
    for idx, (sid, outcomes, final_status) in enumerate(TREATMENT_PLAN):
        # Skip if session already exists (idempotent)
        existing = await db.execute(
            select(TreatmentSession).where(
                TreatmentSession.scenario_quiz_id == scenario_id,
                TreatmentSession.student_id == sid,
            ),
        )
        if existing.scalar_one_or_none() is not None:
            continue
        if await db.get(User, sid) is None:
            continue  # student missing — can't FK

        started_at = base_started + timedelta(hours=idx * 2)
        last_outcome_q1_complete = outcomes[0] != "unresolved"
        last_outcome_q2_complete = outcomes[1] != "unresolved"
        current_q = 2 if last_outcome_q1_complete else 1
        completed_at = (
            started_at + timedelta(minutes=18 + idx * 3)
            if final_status == "completed"
            else None
        )

        session_id = f"seed-treatment-{scenario_id}-{sid}"
        db.add(TreatmentSession(
            id=session_id,
            scenario_quiz_id=scenario_id,
            student_id=sid,
            status=final_status,
            current_question_index=current_q if final_status == "active" else 2,
            started_at=started_at,
            completed_at=completed_at,
        ))

        # Build messages for both questions, staggering created_at by ~30s
        msg_offset = timedelta(seconds=0)
        for q_idx, q_outcome in enumerate(outcomes, start=1):
            ctx = Q1_CONTEXT if q_idx == 1 else Q2_CONTEXT
            # Only emit Q2 messages if Q1 completed (mirrors UI flow)
            if q_idx == 2 and not last_outcome_q1_complete:
                continue
            if q_idx == 2 and not last_outcome_q2_complete and q_outcome == "unresolved":
                # We DO want some Q2 messages to appear (so the row shows
                # progress) — just don't include the complete bubble.
                pass
            msgs = _question_messages(q_idx, q_outcome, ctx)
            for m in msgs:
                msg_offset += timedelta(seconds=45)
                db.add(TreatmentMessage(
                    session_id=session_id,
                    question_index=q_idx,
                    role=m["role"],
                    text=m["text"],
                    phase=m.get("phase"),
                    stage=m.get("stage"),
                    step=m.get("step"),
                    hint_level=m.get("hint_level"),
                    feedback=m.get("feedback"),
                    requires_restatement=m.get("requires_restatement", False),
                    created_at=started_at + msg_offset,
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
        await seed_admin(db)
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
        n_tx = await seed_treatment_sessions(db)
        await db.commit()
        print(
            f"[seed] done — admin {ADMIN_ACCOUNT}, "
            f"teachers {TEACHER_ACCOUNT} (demo) + {PROD_TEACHER_ACCOUNT} ({PROD_TEACHER_NAME}, empty) + {USER001_ACCOUNT} ({USER001_NAME}), "
            f"{sum(len(c['students']) for c in CLASSES)} students across {len(CLASSES)} classes, "
            f"{n_quiz} quizzes, {n_scen} scenarios, {n_asg} assignments, "
            f"{n_ans} student answers, {n_fup} follow-up conversations, "
            f"{n_tx} treatment sessions.",
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
