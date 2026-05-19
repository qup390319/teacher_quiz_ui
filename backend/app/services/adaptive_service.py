"""Adaptive dispatching service.

Computes per-student mastery by knowledge node and checks prerequisite
readiness so teachers can make informed dispatching decisions.
"""
from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.knowledge_graph import NODES, get_all_prerequisites, topo_sort
from app.db.models import (
    QuizQuestion,
    Student,
    StudentAnswer,
)

MASTERY_THRESHOLD = 70


async def _load_class_students(db: AsyncSession, class_id: str) -> list[Student]:
    res = await db.execute(
        select(Student).where(Student.class_id == class_id).order_by(Student.seat),
    )
    return list(res.scalars().all())


async def _student_node_mastery(
    db: AsyncSession, student_id: str,
) -> dict[str, dict[str, int]]:
    """Return {nodeId: {total, correct}} from all answers this student has."""
    res = await db.execute(
        select(
            QuizQuestion.knowledge_node_id,
            StudentAnswer.diagnosis,
        )
        .join(QuizQuestion, StudentAnswer.question_id == QuizQuestion.id)
        .where(StudentAnswer.student_id == student_id),
    )
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    for node_id, diagnosis in res.all():
        stats[node_id]["total"] += 1
        if diagnosis == "CORRECT":
            stats[node_id]["correct"] += 1
    return dict(stats)


async def get_class_prerequisite_status(
    db: AsyncSession,
    class_id: str,
    target_node_ids: list[str],
    threshold: int = MASTERY_THRESHOLD,
) -> dict[str, Any]:
    """For each student in the class, check prerequisite mastery for target nodes."""
    students = await _load_class_students(db, class_id)
    all_prereqs: set[str] = set()
    for nid in target_node_ids:
        all_prereqs.update(get_all_prerequisites(nid))
    all_prereqs -= set(target_node_ids)

    result: list[dict[str, Any]] = []
    for student in students:
        mastery = await _student_node_mastery(db, student.user_id)
        prereqs_report: list[dict[str, Any]] = []
        weak: list[str] = []
        all_ready = True

        for pre_id in topo_sort(list(all_prereqs)):
            node_info = NODES.get(pre_id, {})
            stats = mastery.get(pre_id, {"total": 0, "correct": 0})
            pct = round(stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
            is_missing = stats["total"] == 0
            is_mastered = pct >= threshold and not is_missing

            if not is_mastered:
                all_ready = False
                weak.append(pre_id)

            prereqs_report.append({
                "node_id": pre_id,
                "node_name": node_info.get("name", pre_id),
                "mastered": is_mastered,
                "mastery_pct": pct,
                "missing": is_missing,
            })

        result.append({
            "student_id": student.user_id,
            "student_name": student.name,
            "seat": student.seat,
            "ready": all_ready,
            "prerequisites": prereqs_report,
            "weak_nodes": weak,
        })

    return {
        "class_id": class_id,
        "target_node_ids": target_node_ids,
        "mastery_threshold": threshold,
        "students": result,
    }


async def get_adaptive_recommendations(
    db: AsyncSession,
    class_id: str,
    target_node_ids: list[str],
    mode: str = "diagnosis",
    threshold: int = MASTERY_THRESHOLD,
) -> dict[str, Any]:
    """Generate per-student adaptive dispatch recommendations.

    mode='diagnosis': start from target nodes; if failed, trace back to prereqs.
    mode='review': start from earliest prereqs, build up to target nodes.
    """
    students = await _load_class_students(db, class_id)
    sorted_targets = topo_sort(target_node_ids)

    result: list[dict[str, Any]] = []
    for student in students:
        mastery = await _student_node_mastery(db, student.user_id)

        recommended: list[str] = []
        skip: list[str] = []
        reason_parts: list[str] = []

        if mode == "review":
            all_chain: list[str] = []
            for nid in sorted_targets:
                for pre in get_all_prerequisites(nid):
                    if pre not in all_chain:
                        all_chain.append(pre)
                if nid not in all_chain:
                    all_chain.append(nid)
            for nid in all_chain:
                stats = mastery.get(nid, {"total": 0, "correct": 0})
                pct = round(stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
                if pct < threshold or stats["total"] == 0:
                    recommended.append(nid)
                else:
                    skip.append(nid)
            if not recommended:
                reason_parts.append("所有先備與目標節點均已達標")
            else:
                reason_parts.append(f"從最基礎的先備開始，共 {len(recommended)} 個節點需複習")

        else:
            prereq_failed = False
            for nid in sorted_targets:
                if prereq_failed:
                    skip.append(nid)
                    continue

                stats = mastery.get(nid, {"total": 0, "correct": 0})
                pct = round(stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0

                if stats["total"] == 0:
                    recommended.append(nid)
                elif pct < threshold:
                    recommended.append(nid)
                    for pre in reversed(get_all_prerequisites(nid)):
                        pre_stats = mastery.get(pre, {"total": 0, "correct": 0})
                        pre_pct = round(pre_stats["correct"] / pre_stats["total"] * 100) if pre_stats["total"] > 0 else 0
                        if pre_pct < threshold or pre_stats["total"] == 0:
                            if pre not in recommended:
                                recommended.insert(0, pre)
                            prereq_failed = True
                            reason_parts.append(f"{nid} 未達標，溯源至先備 {pre}")

            if not recommended:
                reason_parts.append("所有目標節點均已達標")
            elif not reason_parts:
                reason_parts.append(f"共 {len(recommended)} 個節點需診斷")

        result.append({
            "student_id": student.user_id,
            "student_name": student.name,
            "seat": student.seat,
            "recommended_node_ids": recommended,
            "skip_node_ids": skip,
            "reason": "；".join(reason_parts),
        })

    return {
        "class_id": class_id,
        "mode": mode,
        "sorted_node_ids": sorted_targets,
        "students": result,
    }
