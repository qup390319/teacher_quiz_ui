"""Stats aggregations driven by student_answers in the DB.

Replaces the front-end mock helpers (getNodePassRates / getMisconceptionStudents
/ getQuestionStats / getClassAnswers) so the dashboard can derive everything
from real DB rows.
"""
from collections import defaultdict
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    Assignment,
    Class,
    Quiz,
    QuizQuestion,
    Student,
    StudentAnswer,
)


async def _load_quiz_with_questions(db: AsyncSession, quiz_id: str) -> Quiz | None:
    res = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions).selectinload(QuizQuestion.options)),
    )
    return res.scalar_one_or_none()


async def _load_class_students(db: AsyncSession, class_id: str) -> list[Student]:
    res = await db.execute(
        select(Student).where(Student.class_id == class_id).order_by(Student.seat),
    )
    return list(res.scalars().all())


async def _load_assignment(db: AsyncSession, quiz_id: str, class_id: str) -> Assignment | None:
    res = await db.execute(
        select(Assignment).where(
            and_(Assignment.quiz_id == quiz_id, Assignment.class_id == class_id),
        ),
    )
    return res.scalar_one_or_none()


async def _load_answers_for_assignment(
    db: AsyncSession, assignment_id: str,
) -> list[StudentAnswer]:
    res = await db.execute(
        select(StudentAnswer).where(StudentAnswer.assignment_id == assignment_id),
    )
    return list(res.scalars().all())


async def get_class_answers(db: AsyncSession, quiz_id: str, class_id: str) -> dict[str, Any]:
    """Return the per-student × per-question grid of selected_tag for one class."""
    quiz = await _load_quiz_with_questions(db, quiz_id)
    if quiz is None:
        return {"quiz_id": quiz_id, "class_id": class_id, "rows": []}

    assignment = await _load_assignment(db, quiz_id, class_id)
    students = await _load_class_students(db, class_id)
    answer_lookup: dict[tuple[str, int], str] = {}
    if assignment:
        for ans in await _load_answers_for_assignment(db, assignment.id):
            answer_lookup[(ans.student_id, ans.question_id)] = ans.selected_tag

    questions = sorted(quiz.questions, key=lambda q: q.order_index)
    rows = []
    for stu in students:
        rows.append({
            "student_id": stu.user_id,
            "student_name": stu.name,
            "seat": stu.seat,
            "answers": [
                {
                    "question_id": q.id,
                    "selected_tag": answer_lookup.get((stu.user_id, q.id)),
                }
                for q in questions
            ],
        })
    return {"quiz_id": quiz_id, "class_id": class_id, "rows": rows}


async def get_class_stats(db: AsyncSession, quiz_id: str, class_id: str) -> dict[str, Any]:
    """Compute completion / mastery / per-node pass rate / top misconceptions / question stats
    for one (quiz, class) pair.
    """
    quiz = await _load_quiz_with_questions(db, quiz_id)
    if quiz is None:
        return _empty_stats(quiz_id, class_id)

    questions = sorted(quiz.questions, key=lambda q: q.order_index)
    students = await _load_class_students(db, class_id)
    student_count = len(students)

    assignment = await _load_assignment(db, quiz_id, class_id)
    answers = await _load_answers_for_assignment(db, assignment.id) if assignment else []

    # Submitted students = distinct student_ids in answers (assume a student who answered any
    # question is counted as submitted; could refine to "answered all questions")
    submitted_students = {a.student_id for a in answers}
    submitted_count = len(submitted_students)
    completion_rate = round(submitted_count * 100 / student_count) if student_count else 0

    # Per node + per question stats
    node_correct: dict[str, int] = defaultdict(int)
    node_total: dict[str, int] = defaultdict(int)
    question_stats: dict[int, dict[str, int]] = {}
    misconception_students: dict[str, set[str]] = defaultdict(set)

    answer_by_qid: dict[int, list[StudentAnswer]] = defaultdict(list)
    for a in answers:
        answer_by_qid[a.question_id].append(a)

    for q in questions:
        # tally per option
        counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        for a in answer_by_qid.get(q.id, []):
            counts[a.selected_tag] = counts.get(a.selected_tag, 0) + 1
            node_total[q.knowledge_node_id] += 1
            if a.diagnosis == "CORRECT":
                node_correct[q.knowledge_node_id] += 1
            else:
                misconception_students[a.diagnosis].add(a.student_id)
        question_stats[q.id] = counts

    node_pass_rates: dict[str, int] = {}
    for node_id in {q.knowledge_node_id for q in questions}:
        total = node_total.get(node_id, 0)
        correct = node_correct.get(node_id, 0)
        node_pass_rates[node_id] = round(correct * 100 / total) if total else 0

    rates = list(node_pass_rates.values())
    average_mastery = round(sum(rates) / len(rates)) if rates else 0

    # Top misconceptions need labels — look them up via quiz options
    label_map: dict[str, str] = {}
    for q in questions:
        for opt in q.options:
            if opt.diagnosis != "CORRECT":
                # Use the option content as a fallback label; real label is in knowledgeGraph
                label_map.setdefault(opt.diagnosis, "")

    top_misconceptions = sorted(
        [
            {
                "misconception_id": mid,
                "label": label_map.get(mid, ""),
                "count": len(stu_set),
                "student_ids": sorted(stu_set),
            }
            for mid, stu_set in misconception_students.items()
        ],
        key=lambda r: r["count"],
        reverse=True,
    )[:10]

    return {
        "quiz_id": quiz_id,
        "class_id": class_id,
        "student_count": student_count,
        "submitted_count": submitted_count,
        "completion_rate": completion_rate,
        "average_mastery": average_mastery,
        "node_pass_rates": node_pass_rates,
        "top_misconceptions": top_misconceptions,
        "question_stats": question_stats,
    }


async def get_grade_stats(db: AsyncSession, quiz_id: str) -> dict[str, Any]:
    """Aggregate stats across all classes that have an assignment for this quiz."""
    quiz = await _load_quiz_with_questions(db, quiz_id)
    if quiz is None:
        return _empty_stats(quiz_id, None)

    asg_res = await db.execute(
        select(Assignment).where(Assignment.quiz_id == quiz_id),
    )
    assignments = list(asg_res.scalars().all())
    class_ids = sorted({a.class_id for a in assignments})

    classes_res = await db.execute(select(Class).where(Class.id.in_(class_ids)))
    classes = {c.id: c for c in classes_res.scalars().all()}

    # Per-class stats (re-use get_class_stats)
    per_class = []
    for cid in class_ids:
        stats = await get_class_stats(db, quiz_id, cid)
        per_class.append({
            "class_id": cid,
            "class_name": classes[cid].name if cid in classes else cid,
            **stats,
        })

    # Collapse aggregates
    total_students = sum(c["student_count"] for c in per_class)
    total_submitted = sum(c["submitted_count"] for c in per_class)
    completion_rate = round(total_submitted * 100 / total_students) if total_students else 0

    if per_class:
        average_mastery = round(sum(c["average_mastery"] for c in per_class) / len(per_class))
    else:
        average_mastery = 0

    # Aggregate node pass rates as average
    node_ids = {nid for c in per_class for nid in c["node_pass_rates"]}
    node_pass_rates: dict[str, int] = {}
    for nid in node_ids:
        rates = [c["node_pass_rates"].get(nid, 0) for c in per_class if nid in c["node_pass_rates"]]
        node_pass_rates[nid] = round(sum(rates) / len(rates)) if rates else 0

    # Aggregate top misconceptions across classes
    misc_total: dict[str, dict[str, Any]] = {}
    for c in per_class:
        for m in c["top_misconceptions"]:
            mid = m["misconception_id"]
            if mid not in misc_total:
                misc_total[mid] = {
                    "misconception_id": mid, "label": m["label"], "count": 0, "student_ids": [],
                }
            misc_total[mid]["count"] += m["count"]
            misc_total[mid]["student_ids"] = list(
                set(misc_total[mid]["student_ids"]) | set(m["student_ids"]),
            )
    top_misconceptions = sorted(misc_total.values(), key=lambda r: r["count"], reverse=True)[:10]

    return {
        "quiz_id": quiz_id,
        "class_id": None,
        "student_count": total_students,
        "submitted_count": total_submitted,
        "completion_rate": completion_rate,
        "average_mastery": average_mastery,
        "node_pass_rates": node_pass_rates,
        "top_misconceptions": top_misconceptions,
        "question_stats": {},
        "per_class": per_class,
    }


def _empty_stats(quiz_id: str, class_id: str | None) -> dict[str, Any]:
    return {
        "quiz_id": quiz_id,
        "class_id": class_id,
        "student_count": 0,
        "submitted_count": 0,
        "completion_rate": 0,
        "average_mastery": 0,
        "node_pass_rates": {},
        "top_misconceptions": [],
        "question_stats": {},
    }
