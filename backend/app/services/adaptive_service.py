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


def in_quiz_prerequisites(node_id: str, quiz_nodes: set[str]) -> list[str]:
    """該節點的遞移先備中，落在本題組節點集合內者（root→node 順序）。

    鏡射前端 src/utils/prerequisiteTrace.js 的「題組內先備」概念。
    """
    return [p for p in get_all_prerequisites(node_id) if p in quiz_nodes]


def next_adaptive_node(
    quiz_node_ids: list[str],
    answered: list[tuple[str, bool]],
) -> tuple[str | None, list[str]]:
    """施測中動態選題：依先備圖譜決定下一個要考的知識節點。

    純函數，可由已作答歷史完整重算（後端無需保存 session 狀態）。
    策略（spec-05 §2.2）——**限題組內既有先備**：
      - 過關（passed=True）→ 跳過該節點在題組內的先備（推論基礎已穩，省時）
      - 答錯（passed=False）→ 立刻退回最近的題組內先備（動態追溯）；
        續錯續退，直到過關或無更基礎的題組內先備
      - 先備不在題組內者不退回（交由報告端事後追溯）

    節點層級運作；題目對應由 router 負責（一節點多題時取尚未問過的）。

    Args:
        quiz_node_ids: 本題組涵蓋的知識節點（可含重複，內部去重）。
        answered: 已作答節點的 (node_id, passed) 序列，依實際作答順序。

    Returns:
        (next_node_id, skipped_node_ids)
        next_node_id 為 None 代表已無題可出（進入追問階段）；
        skipped_node_ids 為因過關而略過、且尚未作答的先備節點（供前端說明用）。
    """
    quiz_set = set(quiz_node_ids)
    answered_nodes = {n for n, _ in answered}
    skipped: set[str] = set()
    for node_id, passed in answered:
        if passed:
            skipped.update(in_quiz_prerequisites(node_id, quiz_set))

    def _pending_skipped() -> list[str]:
        return topo_sort(list(skipped - answered_nodes))

    # 1) 答錯 descent：上一題答錯 → 退回最近的未作答、未略過的題組內先備
    if answered and not answered[-1][1]:
        last_node = answered[-1][0]
        for pre in reversed(in_quiz_prerequisites(last_node, quiz_set)):  # nearest first
            if pre not in answered_nodes and pre not in skipped:
                return pre, _pending_skipped()

    # 2) 否則取下一個最進階（reverse topo）的未作答、未略過節點
    for node_id in reversed(topo_sort(list(quiz_set))):
        if node_id not in answered_nodes and node_id not in skipped:
            return node_id, _pending_skipped()

    return None, _pending_skipped()


def reconstruct_adaptive_path(
    quiz_node_ids: list[str],
    answered_by_node: dict[str, bool],
) -> dict[str, Any]:
    """重播適性引擎，還原「本次施測」的實際出題路徑（供診斷報告呈現）。

    以「第一層作答過關與否」逐步餵入 next_adaptive_node（即施測中動態選題當初
    依據的訊號），重現當初的出題順序並標註每一步的角色：
      - start：本次第一個節點（最進階）
      - retreat：上一題答錯 → 退回其題組內先備（動態追溯的證據）
      - advance：換到另一條鏈的下一個節點

    因引擎為確定性純函數，餵入相同的第一層判定即可精準重現當初路徑，
    不需在作答時額外保存 session 狀態。

    Args:
        quiz_node_ids: 題組涵蓋的知識節點（可含重複）。
        answered_by_node: {node_id: passed}，passed 以第一層 quadrant=='TT' 判定。

    Returns:
        {
            "steps": [{node_id, node_name, passed, kind}],  # 依實際出題順序
            "skipped_node_ids": [...],  # 因過關而略過、未作答的先備
            "consistent": bool,         # 重播消化的節點集是否 == 已作答節點集
                                        # （False 代表非適性 session 的舊資料，報告端可隱藏）
        }
    """
    quiz_set = set(quiz_node_ids)
    seq: list[tuple[str, bool]] = []
    steps: list[dict[str, Any]] = []
    # 防呆上界：最多走訪節點數次，避免資料異常造成無限迴圈。
    for _ in range(len(quiz_set) + 1):
        node, _skipped = next_adaptive_node(quiz_node_ids, seq)
        if node is None or node not in answered_by_node:
            break
        if not seq:
            kind = "start"
        elif not seq[-1][1] and node in in_quiz_prerequisites(seq[-1][0], quiz_set):
            kind = "retreat"
        else:
            kind = "advance"
        passed = answered_by_node[node]
        steps.append({
            "node_id": node,
            "node_name": NODES.get(node, {}).get("name", node),
            "passed": passed,
            "kind": kind,
        })
        seq.append((node, passed))

    _, skipped = next_adaptive_node(quiz_node_ids, seq)
    consistent = {s["node_id"] for s in steps} == set(answered_by_node)
    return {"steps": steps, "skipped_node_ids": skipped, "consistent": consistent}


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
