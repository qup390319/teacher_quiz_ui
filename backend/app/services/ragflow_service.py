"""RAGFlow service — wraps the converse-with-agent HTTP API.

See spec-12 §4 / §5.

⚠️  Mock mode (settings.RAGFLOW_MOCK = true)
    The system can run without a working RAGFlow backend by returning
    deterministic fake answers. Real RAGFlow is called when:
        RAGFLOW_MOCK=false
        RAGFLOW_ENDPOINT=...
        RAGFLOW_AGENT_ID=...
        RAGFLOW_API_KEY=...
    are all set in .env.

    The mock keeps the SAME RagflowAnswer / RagflowCitation shape so the
    rest of the service / router code is identical between mock and real.
"""
import asyncio
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.config import settings


class RagflowError(Exception):
    """Raised when RAGFlow upstream fails. Router maps to HTTP 502."""

    def __init__(self, message: str, *, status: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status = status
        self.body = body


@dataclass
class RagflowCitation:
    document_name: str
    snippet: str | None = None
    document_id: str | None = None


@dataclass
class RagflowAnswer:
    answer: str
    citations: list[RagflowCitation] = field(default_factory=list)
    session_id: str | None = None
    raw: dict[str, Any] | None = None


def _ensure_configured() -> tuple[str, str, str]:
    base = settings.RAGFLOW_ENDPOINT.rstrip("/")
    agent = settings.RAGFLOW_AGENT_ID
    key = settings.RAGFLOW_API_KEY
    if not base or not agent or not key:
        raise RagflowError(
            "RAGFlow not configured (set RAGFLOW_ENDPOINT / RAGFLOW_AGENT_ID / RAGFLOW_API_KEY)",
        )
    return base, agent, key


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0))


# ═══════════════════════════════════════════════════════════════════════════
# Mock mode (demo without real RAGFlow)
# ═══════════════════════════════════════════════════════════════════════════
_MOCK_CITATIONS = [
    RagflowCitation(
        document_name="水溶液迷思概念整理_國小學童研究.docx",
        snippet="第41頁，一、（一）「2. 溶解的過程，物質會消失不見」段落 — Prieto et al. (1989); 黃寶鈿 (1990)",
    ),
    RagflowCitation(
        document_name="水溶液迷思概念整理_後設研究.docx",
        snippet="表四-3「水與水溶液」項下，第1點 — 盛承堯 (1982); 簡美容 (2001); 陳淮璋 (2002)",
    ),
    RagflowCitation(
        document_name="水溶液迷思概念整理.docx",
        snippet="表 2-2-2 第28-29頁；經驗誤用 / 直接臆測類迷思（陳姍姍 1993; Slone & Bokhurst 1992）",
    ),
]


def _mock_distractor_answer(misconception_id: str, misconception_label: str) -> str:
    """Return 3 plausible student-voice distractor candidates + citations block."""
    samples_by_prefix = {
        "M02-1": ["糖加進去之後就消失了，水裡什麼都沒有", "看不到糖了所以糖不見了", "糖溶在水裡之後就完全不在了"],
        "M02-2": ["糖像冰塊一樣融化掉了", "糖在水裡會融化，跟冰一樣", "糖跟冰塊一樣會融化變成水的一部分"],
        "M02-3": ["糖是蒸發到空氣裡所以不見了", "糖變成蒸氣飛走了", "我覺得糖跟水一起變成蒸氣了"],
        "M02-4": ["糖溶完之後就不是糖了，變成另一種東西", "糖跟水反應變成新的物質了", "我覺得糖溶在水裡之後就變成水了"],
        "M03-1": ["攪拌很久就可以多溶一點糖進去", "用力攪拌就能讓更多糖溶解", "只要攪久一點糖就會全部溶完"],
        "M03-2": ["不攪拌的話糖根本不會溶解", "糖一定要攪拌才會溶", "沒攪拌糖會一直留在底部"],
        "M03-3": ["持續攪拌可以讓底部的糖也溶上來", "如果一直攪拌沉澱的糖會再溶解", "攪拌久一點杯底的糖也會不見"],
        "M03-4": ["攪不攪拌結果都一樣，溶解量沒差", "攪拌跟不攪拌效果完全一樣", "攪拌只是好玩的，跟溶解沒關係"],
        "M05-1": ["加熱可以讓糖暫時溶完，但放久了糖又會出來", "加熱溶完的糖過一陣子又會沉澱", "熱的時候溶完，冷掉就沉澱"],
        "M05-2": ["糖沉到底是因為糖比水重", "糖比較重所以才沉下去，跟溶解上限沒關係", "重的東西就會沉到底"],
        "M05-3": ["只要再加水或再加熱，糖一定可以全部溶完", "水其實可以無限地溶解糖", "加更多水就能溶更多糖，沒有極限"],
        "M05-4": ["糖很輕所以浮在水面，看不見就是溶完了", "看不見糖就是已經溶光了", "糖會浮起來，浮上來就是溶解了"],
        "M09-1": ["鹹的味道就是鹼性", "嚐起來鹹的就是鹼性", "鹼性物質的味道就是鹹的"],
        "M09-2": ["沒有刺鼻味的就是中性", "聞起來沒味道就是中性", "刺鼻的就是酸性，不刺鼻就是中性"],
        "M09-3": ["名字裡沒有「酸」就一定不是酸性", "看名字有沒有酸字就知道", "名字沒酸的東西不會是酸性"],
        "M09-4": ["不是酸的也不是鹹的就是鹼性", "甜甜的東西是鹼性", "沒有特殊味道的東西就是鹼性"],
        "M12-1": ["所有酸鹼物質都很危險都不能碰", "鹼性的東西絕對有毒不能碰", "酸鹼類的東西都有毒"],
        "M12-2": ["酸越濃就越強酸，稀就是弱酸", "鹼越濃強度就越強，越稀就越弱", "濃度高就是強酸強鹼，濃度低就是弱酸弱鹼"],
        "M12-3": ["酸跟鹼遇到會把彼此完全消滅變成虛無", "酸鹼碰在一起就互相消失", "酸跟酸碰在一起就互相消滅"],
        "M12-4": ["皮膚碰到酸性東西一定會被腐蝕到壞死", "只要是酸的碰到皮膚就會立刻燒爛", "酸性碰皮膚一定要立刻送醫"],
    }
    samples = samples_by_prefix.get(
        misconception_id,
        [
            f"我覺得{misconception_label}就是這樣沒錯",
            f"很多同學都這樣認為（{misconception_label}）",
            f"我也是這樣想的（{misconception_label}）",
        ],
    )
    body = "\n".join(samples[:3])
    refs = (
        "\n\n[REF]\n"
        "水溶液迷思概念整理_國小學童研究.docx p.41-43\n"
        "水溶液迷思概念整理_後設研究.docx 表四-3\n"
    )
    return body + refs


def _mock_summary_answer(question_text: str) -> str:
    """Generic mock for grade / class summary."""
    is_grade = "本年級" in question_text
    if is_grade:
        body = (
            "本年級在本次水溶液迷思概念診斷中，整體掌握率約落在 35~45%，屬於需要持續介入的範圍。"
            "三個班級中，五年甲班表現最佳，五年丙班高頻迷思持有率最高（特別是 M09-3 與 M02-1）。\n\n"
            "跨班共同弱點集中在「溶解現象與守恆」（INe-II-3-02）以及「酸鹼判斷方法」（INe-Ⅲ-5-4）這兩個節點，"
            "建議優先安排補救教學。\n\n"
            "從文獻角度，這些迷思的根源往往來自學生「以視覺判斷物質存在」與「以日常感官經驗判斷酸鹼」兩種認知偏好"
            "（陳淑筠, 2003；Driver, 1985；Prieto et al., 1989）。\n\n"
            "優先介入順序：五年丙班 → 五年乙班 → 五年甲班。\n\n"
            "行動建議：\n"
            "1. 對五年丙班派發 scenario-001（溶解現象判斷）治療迷思 M02-1\n"
            "2. 對五年乙班派發 scenario-004（酸鹼中和與生活應用）處理 M09-* 系列\n"
            "3. 五年甲班可派 scenario-005 進行進階挑戰（水在酸鹼反應的角色）\n"
            "4. 對全年級播放「砂糖溶解後重量守恆」實驗影片，建立守恆概念\n\n"
            "[REF]\n"
            "水溶液迷思概念整理_後設研究.docx 表四-3\n"
            "水溶液迷思概念整理_國小學童研究.docx p.41-47\n"
        )
    else:
        body = (
            "本班在本次測驗中整體掌握率約 40%，「溶解後物質消失」（M02-1）為最高頻迷思（持有率 30%+）。"
            "另有約 25% 的學生在酸鹼判斷上呈現「以味覺經驗推論」的現象（M09-1）。\n\n"
            "本班學生在 INe-II-3-02 節點通過率僅 40%，明顯低於該節點的 70% 掌握門檻。"
            "對照文獻，這是國小學童典型的守恆認知缺陷（陳淮璋, 2002；Slone & Bokhurst, 1992）。\n\n"
            "高頻迷思優先順序：M02-1 → M09-1 → M03-1。\n\n"
            "行動建議：\n"
            "1. 派發 scenario-001 處理 M02-1（溶解後物質消失）\n"
            "2. 派發 scenario-004 處理 M09-1（味覺判斷酸鹼）\n"
            "3. 對 M02-1 持有者單獨補強「物質守恆」實驗活動\n"
            "4. 下週複測時加入「攪拌與溶解量」的對比題以追蹤改善\n\n"
            "[REF]\n"
            "水溶液迷思概念整理_國小學童研究.docx p.41-47\n"
            "水溶液迷思概念整理_後設研究.docx 表四-3\n"
        )
    return body


async def create_session() -> str:
    """Create a new agent session, return session_id."""
    if settings.RAGFLOW_MOCK:
        return f"mock-session-{int(time.time() * 1000)}"

    base, agent, key = _ensure_configured()
    url = f"{base}/api/v1/agents/{agent}/sessions"

    async with _client() as client:
        try:
            r = await client.post(
                url, json={}, headers={"Authorization": f"Bearer {key}"},
            )
        except httpx.HTTPError as exc:
            raise RagflowError(f"RAGFlow connection failed: {exc}") from exc

    if r.status_code >= 400:
        raise RagflowError(
            f"RAGFlow create_session HTTP {r.status_code}",
            status=r.status_code,
            body=r.text[:500],
        )
    data = r.json()
    if data.get("code") != 0:
        raise RagflowError(f"RAGFlow create_session: {data.get('message') or data}")
    sid = (data.get("data") or {}).get("id")
    if not sid:
        raise RagflowError("RAGFlow create_session returned no session id")
    return sid


async def converse(session_id: str, question: str) -> RagflowAnswer:
    """Send a question to an existing session, return parsed answer + citations."""
    if settings.RAGFLOW_MOCK:
        # Pretend a 1-second RAGFlow round trip so the UX feels real
        await asyncio.sleep(1.0)

        # Detect intent via question content
        is_distractor = "請以「國小五年級學生」的口吻" in question
        if is_distractor:
            # Pull misconception_id from the prompt: "目標迷思：M02-1（label）"
            import re as _re
            m = _re.search(r"目標迷思：([A-Z0-9-]+)（([^）]+)）", question)
            mid = m.group(1) if m else ""
            label = m.group(2) if m else ""
            answer_text = _mock_distractor_answer(mid, label)
        else:
            answer_text = _mock_summary_answer(question)

        return RagflowAnswer(
            answer=answer_text,
            citations=list(_MOCK_CITATIONS),
            session_id=session_id,
            raw={"_mock": True},
        )

    base, agent, key = _ensure_configured()
    url = f"{base}/api/v1/agents/{agent}/completions"

    async with _client() as client:
        try:
            r = await client.post(
                url,
                json={"session_id": session_id, "question": question, "stream": False},
                headers={"Authorization": f"Bearer {key}"},
            )
        except httpx.HTTPError as exc:
            raise RagflowError(f"RAGFlow connection failed: {exc}") from exc

    if r.status_code >= 400:
        raise RagflowError(
            f"RAGFlow completions HTTP {r.status_code}",
            status=r.status_code,
            body=r.text[:500],
        )
    body = r.json()
    if body.get("code") != 0:
        raise RagflowError(f"RAGFlow completions: {body.get('message') or body}")

    data = body.get("data") or {}
    answer_text = data.get("answer") or ""
    sid = data.get("session_id") or session_id
    citations = _parse_citations(data.get("reference") or {})
    return RagflowAnswer(answer=answer_text, citations=citations, session_id=sid, raw=body)


def _parse_citations(ref: dict[str, Any]) -> list[RagflowCitation]:
    """Best-effort: pull document name + snippet from RAGFlow's reference block."""
    out: list[RagflowCitation] = []

    # Prefer chunks (per-snippet) when available
    for ch in ref.get("chunks") or []:
        doc = ch.get("document_name") or ch.get("doc_name") or "(unknown document)"
        snippet = ch.get("content")
        if isinstance(snippet, str):
            snippet = snippet.strip()
            if len(snippet) > 200:
                snippet = snippet[:200] + "…"
        out.append(RagflowCitation(
            document_name=doc,
            snippet=snippet,
            document_id=ch.get("document_id"),
        ))

    # Fall back to doc_aggs (per-document count) if no chunks
    if not out:
        for agg in ref.get("doc_aggs") or []:
            out.append(RagflowCitation(
                document_name=agg.get("doc_name") or agg.get("document_name") or "(unknown document)",
                snippet=None,
            ))

    return out
