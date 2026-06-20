"""Adaptive dispatching endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.data.knowledge_graph import NODES, topo_sort
from app.db.models import Class, User
from app.db.session import get_db
from app.schemas.adaptive import (
    AdaptiveRecommendResponse,
    ClassPrerequisiteResponse,
    PolishStemRequest,
    PolishStemResponse,
    SuggestedOption,
    SuggestedReasonOption,
    SuggestOptionsRequest,
    SuggestOptionsResponse,
)
from app.schemas.llm import ChatMessage, ChatRequest, ChatResponse
from app.services import adaptive_service
from app.services.llm_service import LlmServiceError, chat

router = APIRouter()


@router.get(
    "/prerequisite-status",
    response_model=ClassPrerequisiteResponse,
    response_model_by_alias=True,
)
async def prerequisite_status(
    class_id: str = Query(alias="classId"),
    node_ids: str = Query(alias="nodeIds"),
    threshold: int = Query(default=70, ge=0, le=100),
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassPrerequisiteResponse:
    cls = await db.get(Class, class_id)
    if cls is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    target_ids = [n.strip() for n in node_ids.split(",") if n.strip()]
    if not target_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "NO_NODE_IDS")
    data = await adaptive_service.get_class_prerequisite_status(
        db, class_id, target_ids, threshold,
    )
    return ClassPrerequisiteResponse(**data)


@router.get(
    "/recommend",
    response_model=AdaptiveRecommendResponse,
    response_model_by_alias=True,
)
async def adaptive_recommend(
    class_id: str = Query(alias="classId"),
    node_ids: str = Query(alias="nodeIds"),
    mode: str = Query(default="diagnosis"),
    threshold: int = Query(default=70, ge=0, le=100),
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> AdaptiveRecommendResponse:
    cls = await db.get(Class, class_id)
    if cls is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    if mode not in ("review", "diagnosis"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "INVALID_MODE")
    target_ids = [n.strip() for n in node_ids.split(",") if n.strip()]
    if not target_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "NO_NODE_IDS")
    data = await adaptive_service.get_adaptive_recommendations(
        db, class_id, target_ids, mode, threshold,
    )
    return AdaptiveRecommendResponse(**data)


@router.get("/sorted-nodes")
async def sorted_nodes(
    node_ids: str = Query(alias="nodeIds"),
    _teacher: User = Depends(require_teacher),
) -> dict:
    ids = [n.strip() for n in node_ids.split(",") if n.strip()]
    return {
        "sortedNodeIds": topo_sort(ids),
        "nodes": {
            nid: {"name": NODES[nid]["name"], "level": NODES[nid]["level"]}
            for nid in ids if nid in NODES
        },
    }


@router.post(
    "/polish-stem",
    response_model=PolishStemResponse,
    response_model_by_alias=True,
)
async def polish_stem(
    payload: PolishStemRequest,
    _teacher: User = Depends(require_teacher),
) -> PolishStemResponse:
    """AI-polish a question stem for better student comprehension."""
    system_prompt = (
        "你是國小自然科學教師的出題助手。你的任務是幫老師「潤飾題目」，"
        "讓國小五年級學生能清楚看懂題目在問什麼。\n\n"
        "要求：\n"
        "1. 保留原意和科學正確性\n"
        "2. 使用國小五年級學生能理解的用詞\n"
        "3. 句子簡潔，避免過長複合句\n"
        "4. 如果題目有情境描述，讓情境更生動具體\n"
        "5. 只回傳潤飾後的題幹文字，不要附加說明"
    )
    user_prompt = (
        f"知識節點：{payload.node_id}（{payload.node_name}）\n\n"
        f"原始題幹：\n{payload.stem}\n\n"
        "請潤飾上述題幹，讓國小五年級學生更容易理解。只回傳潤飾後的文字。"
    )
    try:
        resp: ChatResponse = await chat(ChatRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            temperature=0.7,
            max_tokens=512,
        ))
    except LlmServiceError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_UPSTREAM_ERROR") from exc
    return PolishStemResponse(polished=resp.content.strip())


@router.post(
    "/suggest-options",
    response_model=SuggestOptionsResponse,
    response_model_by_alias=True,
)
async def suggest_options(
    payload: SuggestOptionsRequest,
    _teacher: User = Depends(require_teacher),
) -> SuggestOptionsResponse:
    """AI-generate options. single：一組 4 選項；two-tier：答案層 + 理由層各 3。"""
    if payload.mode == "two-tier":
        return await _suggest_two_tier(payload)

    misconceptions_text = "\n".join(
        f"- {m.get('id', '?')}: {m.get('label', '')}（{m.get('detail', '')}）"
        for m in payload.misconceptions[:4]
    )
    system_prompt = (
        "你是國小自然科學教師的出題助手。根據題幹和知識節點的迷思概念，"
        "設計一組四個選項（A/B/C/D），其中一個是正確答案，"
        "另外三個分別對應不同的迷思概念。\n\n"
        "要求：\n"
        "1. 正確答案必須科學正確且清楚\n"
        "2. 干擾選項要貼近國小學生常見的錯誤想法\n"
        "3. 每個選項 15-30 字\n"
        "4. 選項之間不要有明顯的長度差異（避免最長的就是正確答案）\n"
        "5. 以 JSON 陣列回傳，格式：\n"
        '[{"tag":"A","content":"...","diagnosis":"CORRECT"},'
        '{"tag":"B","content":"...","diagnosis":"M02-1"},'
        '{"tag":"C","content":"...","diagnosis":"M02-2"},'
        '{"tag":"D","content":"...","diagnosis":"M02-3"}]\n'
        "6. diagnosis 欄位：正確選項填 CORRECT，干擾選項填對應的迷思編號\n"
        "7. 正確答案隨機放在 A~D 的任一位置"
    )
    user_prompt = (
        f"知識節點：{payload.node_id}（{payload.node_name}）\n\n"
        f"該節點的迷思概念：\n{misconceptions_text}\n\n"
        f"題幹：\n{payload.stem}\n\n"
        "請產生四個選項（JSON 陣列）。"
    )
    try:
        resp: ChatResponse = await chat(ChatRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            temperature=0.8,
            max_tokens=1024,
        ))
    except LlmServiceError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_UPSTREAM_ERROR") from exc

    import json
    import re
    text = resp.content.strip()
    json_match = re.search(r"\[.*\]", text, re.DOTALL)
    if not json_match:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_PARSE_ERROR")
    try:
        raw = json.loads(json_match.group())
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_PARSE_ERROR") from exc

    options = []
    for item in raw[:4]:
        options.append(SuggestedOption(
            tag=item.get("tag", "A"),
            content=item.get("content", ""),
            diagnosis=item.get("diagnosis", "CORRECT"),
        ))
    return SuggestOptionsResponse(options=options)


_ANSWER_TAGS = ["A", "B", "C"]
_REASON_TAGS = ["甲", "乙", "丙"]


async def _suggest_two_tier(payload: SuggestOptionsRequest) -> SuggestOptionsResponse:
    """two-tier：產生答案層（3，標一個正解）+ 理由層（3，1 正確理由 + 2 迷思理由）。

    答案層 tag 由後端依序指派 A/B/C、理由層指派 甲/乙/丙（不信任 LLM 的 tag）。
    """
    import json
    import re

    misconceptions_text = "\n".join(
        f"- {m.get('id', '?')}: {m.get('label', '')}（{m.get('detail', '')}）"
        for m in payload.misconceptions[:4]
    )
    system_prompt = (
        "你是國小自然科學教師的出題助手，正在設計「雙層次診斷題」。\n"
        "第一層問『是什麼／會怎樣』（答案），第二層問『為什麼這樣選』（理由）。\n\n"
        "請產生：\n"
        "1. 答案層 answerOptions：3 個，恰一個 correct=true（科學正確），其餘 false。\n"
        "2. 理由層 reasonOptions：3 個，恰一個 diagnosis='CORRECT'（正確理由），"
        "另兩個各對應一條提供的迷思概念（diagnosis 填該迷思編號）。\n\n"
        "要求：\n"
        "- 用國小五年級學生能懂的用詞，每項 15-35 字。\n"
        "- 理由要貼近學生真實想法；錯誤理由要能反映該迷思的因果推理。\n"
        "- 只以 JSON 物件回傳，格式：\n"
        '{"answerOptions":[{"content":"...","correct":true},{"content":"...","correct":false},'
        '{"content":"...","correct":false}],'
        '"reasonOptions":[{"content":"...","diagnosis":"CORRECT"},'
        '{"content":"...","diagnosis":"M02-1"},{"content":"...","diagnosis":"M02-2"}]}'
    )
    user_prompt = (
        f"知識節點：{payload.node_id}（{payload.node_name}）\n\n"
        f"該節點的迷思概念：\n{misconceptions_text}\n\n"
        f"題幹：\n{payload.stem}\n\n"
        "請產生答案層與理由層（JSON 物件）。"
    )
    try:
        resp: ChatResponse = await chat(ChatRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            temperature=0.8,
            max_tokens=1200,
        ))
    except LlmServiceError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_UPSTREAM_ERROR") from exc

    obj_match = re.search(r"\{.*\}", resp.content.strip(), re.DOTALL)
    if not obj_match:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_PARSE_ERROR")
    try:
        raw = json.loads(obj_match.group())
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_PARSE_ERROR") from exc

    answers = []
    for i, item in enumerate((raw.get("answerOptions") or [])[:3]):
        answers.append(SuggestedOption(
            tag=_ANSWER_TAGS[i],
            content=item.get("content", ""),
            diagnosis="CORRECT" if item.get("correct") else "WRONG",
        ))
    # 指派每個理由「對應第一層哪個答案」：正確理由→正解答案；錯誤理由→錯誤答案（輪流）。
    correct_answer_tag = next((a.tag for a in answers if a.diagnosis == "CORRECT"), "A")
    wrong_answer_tags = [a.tag for a in answers if a.diagnosis != "CORRECT"]
    reasons = []
    wi = 0
    for i, item in enumerate((raw.get("reasonOptions") or [])[:3]):
        diag = item.get("diagnosis", "CORRECT")
        if diag == "CORRECT":
            answer_tag = correct_answer_tag
        elif wrong_answer_tags:
            answer_tag = wrong_answer_tags[wi % len(wrong_answer_tags)]
            wi += 1
        else:
            answer_tag = correct_answer_tag
        reasons.append(SuggestedReasonOption(
            tag=_REASON_TAGS[i],
            content=item.get("content", ""),
            diagnosis=diag,
            answer_tag=answer_tag,
        ))
    if not answers or not reasons:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_PARSE_ERROR")
    return SuggestOptionsResponse(options=answers, reason_options=reasons)
