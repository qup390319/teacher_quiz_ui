"""答錯方向（errorType）分類 via LLM。三類規則見 spec-09 §12.4a。

正式施測時 errorType 由追問 LLM 在 finalDiagnosis 直接輸出；本服務供「補分析」
既有 followup_results.error_type 為 NULL 的迷思紀錄（見 app.scripts.backfill_error_type）。
"""
import json
import logging

from app.schemas.llm import ChatMessage, ChatRequest
from app.services.llm_service import LlmServiceError, chat

logger = logging.getLogger(__name__)

VALID_ERROR_TYPES = {"EXPLANATION", "DEFINITION", "OBSERVATION"}

SYSTEM_PROMPT = """\
你是一位國小自然科學教育專家，專長是分析學生「答錯的主導方向」。

## 任務
根據學生與 AI 的追問對話紀錄與偵測到的迷思概念，判斷學生這題答錯**最主導的方向**，
從以下三類互斥類別中選 **一個**；若對話過短、學生整段「不知道」、線索不足無法判讀，回 null。

## 三類（互斥，只選一個主導）
- EXPLANATION 解釋型：對**現象的因果機制**解釋錯——學生講得出名詞、也描述得出現象，
  但「因為…所以…」的推因偏掉。例：「攪拌能溶更多糖→因為攪拌把糖打碎了」（把溶解當破壞）。
- DEFINITION 定義型：對**科學名詞／概念分類／判準**理解錯——用字面或日常語意詮釋名詞、
  混淆相近詞。例：「飽和＝很濃」「酸性＝嚐起來酸」「溶化＝融化」。
- OBSERVATION 觀察型：對**觀察到的現象／實驗結果**描述或判讀失準——用單一感官（眼/舌/鼻）
  下結論、看到/沒看到就判斷錯。例：「攪拌後看不到糖＝糖消失」「試紙沒變色＝中性」。

## 判讀優先序（同時有多類訊號時）
- OBSERVATION 優先於 EXPLANATION（觀察錯，後續解釋都建立在錯誤事實上）。
- DEFINITION 優先於 EXPLANATION（名詞理解錯時，無論怎麼解釋都偏）。
- 都無法判讀（整段「不知道」、對話過短）→ null。

## 回應格式
只回傳 JSON，不要有其他文字：
{"errorType": "EXPLANATION" | "DEFINITION" | "OBSERVATION" | null, "reasoning": "一句話依據"}
"""


def _build_user_prompt(
    conversation_log: list[dict],
    misconception_code: str | None,
    misconception_label: str | None,
    knowledge_node: str | None,
) -> str:
    dialogue = "\n".join(
        f"{'AI' if m.get('role') in ('ai', 'assistant') else '學生'}: {m.get('content', '')}"
        for m in conversation_log
    )
    parts = [f"## 對話紀錄\n{dialogue}"]
    if misconception_code or misconception_label:
        parts.append(
            f"## 偵測到的迷思概念\n代碼: {misconception_code or '未知'}\n名稱: {misconception_label or '未知'}",
        )
    if knowledge_node:
        parts.append(f"## 對應知識節點\n{knowledge_node}")
    parts.append("請判斷學生答錯的主導方向，回傳 JSON。")
    return "\n\n".join(parts)


async def analyze_error_type(
    conversation_log: list[dict],
    misconception_code: str | None = None,
    misconception_label: str | None = None,
    knowledge_node: str | None = None,
) -> str | None:
    """Classify the dominant error direction via LLM. Returns one of the 3 types or None."""
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
        logger.warning("LLM unavailable for errorType analysis, returning None")
        return None

    return _parse_response(resp.content)


def _parse_response(content: str) -> str | None:
    """Extract errorType from LLM JSON response. Gracefully handles malformed output."""
    text = content.strip()
    if text.startswith("```"):
        lines = [ln for ln in text.split("\n") if not ln.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse errorType response: %s", text[:200])
        return None

    raw = data.get("errorType")
    if isinstance(raw, str) and raw.strip().upper() in VALID_ERROR_TYPES:
        return raw.strip().upper()
    return None
