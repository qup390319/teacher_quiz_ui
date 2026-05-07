"""AI service — composes prompts for RAGFlow and parses results.

For workflow.md N1 / N2 (summaries) and N6 (distractor suggestions).
See spec-12 §7 / §8.
"""
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Quiz, QuizQuestion
from app.services import stats_service
from app.services.ragflow_service import (
    RagflowAnswer,
    converse,
    create_session,
)


def build_distractor_query(
    *,
    node_id: str,
    node_name: str,
    misconception_id: str,
    misconception_label: str,
    misconception_detail: str,
    current_text: str = "",
) -> str:
    """Compose the question we send to RAGFlow agent for N6."""
    base = (
        "請以「國小五年級學生」的口吻，列出 3 條符合下列迷思的真實學生說法（每條一行，不要編號）：\n"
        f"\n知識節點：{node_id}（{node_name}）"
        f"\n目標迷思：{misconception_id}（{misconception_label}）"
        f"\n迷思詳細描述：{misconception_detail}"
        "\n\n要求："
        "\n1. 必須以學生第一人稱口語撰寫，避免學術用語。"
        "\n2. 三條應呈現不同表達方式，但都對應同一個迷思。"
        "\n3. 不要附編號或前綴（例如 1. / -）。"
        "\n4. 末尾請用 [REF] 標籤列出引用來源（文件名 + 頁碼或段落），不在三條句子內。"
        "\n5. 每條長度控制在 25 字以內。"
    )
    if current_text and current_text.strip():
        base += (
            f"\n\n教師目前已輸入「{current_text.strip()}」，"
            "請避免雷同並提供其他角度。"
        )
    return base


_REF_LINE = re.compile(r"^\s*\[ref\]", re.IGNORECASE)
_BULLET_PREFIX = re.compile(r"^[\s　]*[-*•·\d]+[.\s、)）]+\s*")


def parse_distractor_suggestions(answer_text: str, *, max_count: int = 3) -> list[str]:
    """Extract up to `max_count` clean suggestion lines from RAGFlow's answer."""
    out: list[str] = []
    for raw_line in answer_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _REF_LINE.match(line):
            break  # everything after [REF] is citation block
        cleaned = _BULLET_PREFIX.sub("", line).strip()
        # remove leading/trailing quotes
        cleaned = cleaned.strip("「」\"'")
        if not cleaned:
            continue
        out.append(cleaned)
        if len(out) >= max_count:
            break
    return out


async def suggest_distractors(
    *,
    session_id: str | None,
    node_id: str,
    node_name: str,
    misconception_id: str,
    misconception_label: str,
    misconception_detail: str,
    current_text: str = "",
) -> tuple[list[str], RagflowAnswer]:
    """Call RAGFlow → parse → return (suggestions, raw answer for citations)."""
    sid = session_id or await create_session()
    question = build_distractor_query(
        node_id=node_id,
        node_name=node_name,
        misconception_id=misconception_id,
        misconception_label=misconception_label,
        misconception_detail=misconception_detail,
        current_text=current_text,
    )
    answer = await converse(sid, question)
    suggestions = parse_distractor_suggestions(answer.answer, max_count=3)
    return suggestions, answer


# ── N1 / N2 summary helpers ─────────────────────────────────────────────
def _format_class_block(cls: dict) -> str:
    """Format one class's stats as a multi-line block for the RAGFlow prompt."""
    lines = [
        f"  • {cls['className']}（{cls['classId']}）",
        f"      完成率 {cls['completionRate']}% "
        f"({cls['submittedCount']}/{cls['studentCount']})、"
        f"平均掌握率 {cls['averageMastery']}%",
    ]
    if cls.get("nodePassRates"):
        rates = "、".join(f"{k}:{v}%" for k, v in cls["nodePassRates"].items())
        lines.append(f"      各節點通過率：{rates}")
    if cls.get("topMisconceptions"):
        tops = "、".join(
            f"{m['id']}（{m['label']}）×{m['count']}" for m in cls["topMisconceptions"][:5]
        )
        lines.append(f"      高頻迷思：{tops}")
    return "\n".join(lines)


def _common_summary_instructions() -> str:
    return (
        "請依以下要求回覆（使用中文，給教師閱讀）：\n"
        "1. 第一段：整體狀態描述（2~3 句）。\n"
        "2. 第二段：跨班觀察 / 個別班級重點。\n"
        "3. 第三段：優先介入順序（點名最該先處理的迷思代碼或班級）。\n"
        "4. 「行動建議：」標頭下，條列 3~5 條具體可採行動，"
        "若知識節點 INe-II-3-03（攪拌與溶解）有迷思 M03-*，請建議派發 scenario-002（飽和糖水甜度）。\n"
        "5. 末尾以 [REF] 標籤列出本次引用的文獻，每條一行。\n"
        "請務必引用文獻，避免空泛論述。"
    )


async def _quiz_title_and_nodes(db: AsyncSession, quiz_id: str) -> tuple[str, list[dict]]:
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    title = quiz.title if quiz else quiz_id
    nodes_res = await db.execute(
        select(QuizQuestion.knowledge_node_id).where(QuizQuestion.quiz_id == quiz_id),
    )
    node_ids = sorted({row[0] for row in nodes_res.all()})
    # Without a knowledge graph in DB we can only return IDs as names; the prompt
    # is robust to that (just shows the ID).
    return title, [{"id": nid, "name": nid} for nid in node_ids]


async def build_grade_summary_query_from_db(
    db: AsyncSession, quiz_id: str, *, teacher_id: str | None = None,
) -> str:
    """N1 (P4): pull stats from DB then assemble prompt.

    `teacher_id` scopes the per-class aggregation to that teacher's classes.
    """
    title, nodes = await _quiz_title_and_nodes(db, quiz_id)
    grade = await stats_service.get_grade_stats(db, quiz_id, teacher_id=teacher_id)
    per_class = grade.get("per_class") or []
    if not per_class:
        return ""  # signal "no data"; router will return 502 RAGFLOW_EMPTY
    blocks = "\n".join(_format_class_block({
        "classId": c["class_id"],
        "className": c["class_name"],
        "studentCount": c["student_count"],
        "submittedCount": c["submitted_count"],
        "completionRate": c["completion_rate"],
        "averageMastery": c["average_mastery"],
        "nodePassRates": c["node_pass_rates"],
        "topMisconceptions": [
            {"id": m["misconception_id"], "label": m["label"], "count": m["count"]}
            for m in c["top_misconceptions"][:5]
        ],
    }) for c in per_class)
    nodes_str = "、".join(f"{n['id']}（{n['name']}）" for n in nodes)
    return (
        f"以下是「{title}」({quiz_id}) "
        f"在本年級各班的測驗結果：\n\n{blocks}\n\n"
        f"本考卷涵蓋的知識節點：{nodes_str}\n\n"
        + _common_summary_instructions()
    )


async def build_class_summary_query_from_db(
    db: AsyncSession, quiz_id: str, class_id: str,
) -> str:
    """N2 (P4): pull stats from DB then assemble prompt."""
    from app.db.models import Class
    title, nodes = await _quiz_title_and_nodes(db, quiz_id)
    cls = await db.get(Class, class_id)
    cls_name = cls.name if cls else class_id
    cs = await stats_service.get_class_stats(db, quiz_id, class_id)
    if cs["student_count"] == 0:
        return ""
    cls_block = _format_class_block({
        "classId": class_id,
        "className": cls_name,
        "studentCount": cs["student_count"],
        "submittedCount": cs["submitted_count"],
        "completionRate": cs["completion_rate"],
        "averageMastery": cs["average_mastery"],
        "nodePassRates": cs["node_pass_rates"],
        "topMisconceptions": [
            {"id": m["misconception_id"], "label": m["label"], "count": m["count"]}
            for m in cs["top_misconceptions"][:5]
        ],
    })
    nodes_str = "、".join(f"{n['id']}（{n['name']}）" for n in nodes)
    return (
        f"以下是「{title}」({quiz_id}) "
        f"在 {cls_name}（{class_id}）的測驗結果：\n\n{cls_block}\n\n"
        f"本考卷涵蓋的知識節點：{nodes_str}\n\n"
        + _common_summary_instructions()
    )


_ACTIONS_HEADER = re.compile(r"^\s*(行動建議[:：])\s*$", re.MULTILINE)
_REF_HEADER = re.compile(r"^\s*\[ref\]", re.IGNORECASE | re.MULTILINE)


def parse_summary_answer(text: str) -> tuple[str, list[str]]:
    """Split RAGFlow answer into (summary_markdown, actions[]).

    Strategy:
      - Strip [REF] section.
      - Find '行動建議：' header. Everything before = summary; everything after = actions.
      - Each action line: strip bullet prefix (1. / - / •).
    """
    body = text
    ref_match = _REF_HEADER.search(body)
    if ref_match:
        body = body[: ref_match.start()].rstrip()

    actions_match = _ACTIONS_HEADER.search(body)
    actions: list[str] = []
    if actions_match:
        summary = body[: actions_match.start()].rstrip()
        actions_block = body[actions_match.end():].strip()
        for raw in actions_block.splitlines():
            line = _BULLET_PREFIX.sub("", raw.strip()).strip()
            line = line.strip("「」\"'")
            if line:
                actions.append(line)
    else:
        summary = body.strip()

    return summary, actions


async def build_summary(*, prompt: str) -> tuple[str, list[str], RagflowAnswer]:
    """Common path: create session → converse → parse → return."""
    sid = await create_session()
    answer = await converse(sid, prompt)
    summary, actions = parse_summary_answer(answer.answer)
    return summary, actions, answer
