"""Misconception cause analysis via LLM. See spec-09, 功能修改文件 v1."""
import json
import logging

from app.schemas.llm import ChatMessage, ChatRequest
from app.services.llm_service import LlmServiceError, chat

logger = logging.getLogger(__name__)

CAUSE_CATEGORIES = [
    {"id": 1, "name": "學科知識不足或缺乏"},
    {"id": 2, "name": "概念不清楚或混淆"},
    {"id": 3, "name": "不正確的推論或運算過程"},
    {"id": 4, "name": "單憑個人直覺或關鍵字反應"},
    {"id": 5, "name": "來自日常的經驗和生活中的觀察"},
    {"id": 6, "name": "日常生活用語與科學用語的混淆"},
    {"id": 7, "name": "教師的教學過程不當"},
    {"id": 8, "name": "實驗操作不當"},
]

SYSTEM_PROMPT = """\
你是一位國小自然科學教育專家，專長是分析學生迷思概念的成因。

## 任務
根據學生與 AI 的追問對話紀錄，判斷該學生持有此迷思概念最可能的成因。
從以下 8 大成因類別中選出 1-2 個最相關的（大多數情況選 1 個即可，除非有明確證據指向兩個不同成因）。

## 成因類別
1. 學科知識不足或缺乏 — 學生缺乏相關先備知識，無法建構正確概念
2. 概念不清楚或混淆 — 學生將相似但不同的概念混為一談
3. 不正確的推論或運算過程 — 學生的觀察或定義大致正確，但推理邏輯有誤
4. 單憑個人直覺或關鍵字反應 — 學生未經思考，憑直覺或題目關鍵字反射性作答
5. 來自日常的經驗和生活中的觀察 — 學生將日常生活經驗直接套用到科學情境
6. 日常生活用語與科學用語的混淆 — 科學名詞與日常用語含義不同，學生用日常理解詮釋
7. 教師的教學過程不當 — 學生提及老師說過的簡化說法或錯誤類比
8. 實驗操作不當 — 學生提及實驗經驗中的操作錯誤導致錯誤結論

## 判斷依據
- 學生在對話中使用的詞彙（日常語言 vs 科學語言）
- 學生的推理邏輯（因果關係是否正確）
- 學生提及的經驗來源（生活經驗、課堂、實驗）
- 學生的信心程度和回答模式

## 回應格式
只回傳 JSON，不要有其他文字：
{"causeIds": [數字], "reasoning": "一句話說明判斷依據"}
"""


def _build_user_prompt(
    conversation_log: list[dict],
    misconception_code: str | None,
    misconception_label: str | None,
    knowledge_node: str | None,
) -> str:
    dialogue = "\n".join(
        f"{'AI' if m.get('role') == 'ai' else '學生'}: {m.get('content', '')}"
        for m in conversation_log
    )
    parts = [f"## 對話紀錄\n{dialogue}"]
    if misconception_code or misconception_label:
        parts.append(f"## 偵測到的迷思概念\n代碼: {misconception_code or '未知'}\n名稱: {misconception_label or '未知'}")
    if knowledge_node:
        parts.append(f"## 對應知識節點\n{knowledge_node}")
    parts.append("請分析此學生持有該迷思概念的成因，回傳 JSON。")
    return "\n\n".join(parts)


async def analyze_cause(
    conversation_log: list[dict],
    misconception_code: str | None = None,
    misconception_label: str | None = None,
    knowledge_node: str | None = None,
) -> list[int]:
    """Analyze misconception cause via LLM. Returns list of cause IDs (1-8)."""
    user_content = _build_user_prompt(
        conversation_log, misconception_code, misconception_label, knowledge_node,
    )
    req = ChatRequest(
        messages=[
            ChatMessage(role="system", content=SYSTEM_PROMPT),
            ChatMessage(role="user", content=user_content),
        ],
        temperature=0.3,
        max_tokens=256,
    )

    try:
        resp = await chat(req)
    except LlmServiceError:
        logger.warning("LLM unavailable for cause analysis, returning empty causeIds")
        return []

    return _parse_response(resp.content)


def _parse_response(content: str) -> list[int]:
    """Extract causeIds from LLM JSON response. Gracefully handles malformed output."""
    text = content.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse cause analysis response: %s", text[:200])
        return []

    raw_ids = data.get("causeIds", [])
    if not isinstance(raw_ids, list):
        return []

    valid = [i for i in raw_ids if isinstance(i, int) and 1 <= i <= 8]
    return valid[:2]
