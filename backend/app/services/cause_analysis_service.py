"""Misconception cause analysis via LLM. See spec-09, 功能修改文件 v1."""
import json
import logging

from app.schemas.llm import ChatMessage, ChatRequest
from app.services.llm_service import LlmServiceError, chat

logger = logging.getLogger(__name__)

CAUSE_CATEGORIES = [
    {"id": 1, "name": "概念缺失"},
    {"id": 2, "name": "概念混淆"},
    {"id": 3, "name": "日常經驗的直觀建構"},
    {"id": 4, "name": "日常語言的字面干擾"},
    {"id": 5, "name": "直覺反應"},
    {"id": 6, "name": "推理謬誤（含因果倒置）"},
    {"id": 7, "name": "過度類推"},
    {"id": 8, "name": "教學與教材因素"},
    {"id": 9, "name": "實驗操作不當"},
]

SYSTEM_PROMPT = """\
你是一位國小自然科學教育專家，專長是分析學生迷思概念的成因。

## 任務
根據學生與 AI 的追問對話紀錄，判斷該學生持有此迷思概念最可能的成因。
從以下 9 大成因類別中選出 1-2 個最相關的（大多數情況選 1 個即可，除非有明確證據指向兩個不同成因）。

## 成因類別
1. 概念缺失 — 回答中找不到任何可辨識的相關科學詞彙或想法；出現「不知道／沒學過／忘記了」或答非所問，追問仍給不出內容
2. 概念混淆 — 有用到相關概念，但把概念 A 講成概念 B、張冠李戴、互相替換（溶解↔融化、溶質↔溶劑、酸↔鹼）
3. 日常經驗的直觀建構 — 理由句明確以個人生活經驗為證據（「我在家／平常／每次…」「我泡過…」），並以此當判斷依據
4. 日常語言的字面干擾 — 錯誤鎖定在某個科學名詞，用該詞的日常字面意思解釋它（「中和=兩個抵消不見」「鹹=鹼」）；拿掉那個詞迷思就不存在
5. 直覺反應 — 幾乎沒有推理過程、沒有因果說明，由題目單一字詞或第一印象直接觸發結論；問「為什麼」答不出步驟，只說「感覺／應該是」
6. 推理謬誤（含因果倒置） — 有講出推理／計算步驟但邏輯或運算錯誤，包括跳步、算錯，以及因果倒置（把「A→B」說成「B→A」、由「常一起出現」推出因果）；先排除第 7 類後其餘推理錯誤皆歸此類
7. 過度類推 — 出現「…所以…也都…／任何…都…／既然 A 會，那 B、C 也會」式的無條件推廣，把成立的規則套到不適用對象上，忽略前提或反例
8. 教學與教材因素 — 【情境條件成因】僅在學生明確提及來源（「老師說…／課本（書上）寫…／上課教的是…」）才歸類；沒有這類陳述不可歸此類
9. 實驗操作不當 — 【情境條件成因】僅在學生明確描述自己的操作步驟且該步驟有誤（「我把試紙泡了三分鐘」「同一張試紙連測三杯」）才歸類；沒有操作描述不可歸此類

## 判定優先序（一個回答同時符合多類時，取最先符合者為主要成因）
1. 先看有無明確來源陳述 → 提到老師/課本 → 第 8 類；描述錯誤的實驗操作 → 第 9 類
2. 再看有無可辨識的概念內容 → 完全沒有 → 第 1 類
3. 有概念但搞混 A/B → 第 2 類；用日常字面解釋某科學名詞 → 第 4 類；以個人生活經驗為證據 → 第 3 類
4. 有推理但錯 → 先判是否為「無條件推廣」（第 7 類）；若非，再看是否跳步／算錯或因果顛倒 → 第 6 類
5. 完全沒有推理、只憑感覺或關鍵字 → 第 5 類；連結論都給不出 → 第 1 類

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
    """Analyze misconception cause via LLM. Returns list of cause IDs (1-9)."""
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

    valid = [i for i in raw_ids if isinstance(i, int) and 1 <= i <= 9]
    return valid[:2]
