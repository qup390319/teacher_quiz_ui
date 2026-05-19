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
    """AI-generate a full set of 4 options (1 correct + 3 distractors)."""
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
