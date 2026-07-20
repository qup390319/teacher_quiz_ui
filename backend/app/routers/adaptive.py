"""Adaptive dispatching endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_student, require_teacher
from app.data.knowledge_graph import NODES, topo_sort
from app.db.models import Class, Quiz, User
from app.db.session import get_db
from app.schemas.adaptive import (
    AdaptivePathStep,
    AdaptiveRecommendResponse,
    ClassPrerequisiteResponse,
    NextQuestionRequest,
    NextQuestionResponse,
    PolishStemRequest,
    PolishStemResponse,
    SuggestedOption,
    SuggestedReasonOption,
    SuggestOptionsRequest,
    SuggestOptionsResponse,
    TracePathRequest,
    TracePathResponse,
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


@router.post(
    "/next-question",
    response_model=NextQuestionResponse,
    response_model_by_alias=True,
)
async def next_question(
    payload: NextQuestionRequest,
    _student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
) -> NextQuestionResponse:
    """施測中動態選題：依先備圖譜決定學生的下一題（spec-10 §10.4）。

    僅回傳題組內下一題的 order-index，不含任何個資，故開放給作答學生角色。
    後端由 answered 歷史完整重算，無 session 狀態。
    """
    quiz = await db.get(Quiz, payload.quiz_id)
    if quiz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QUIZ_NOT_FOUND")

    # 題組節點順序（依 order_index）＋ 節點 → 該節點題目的 order_index 清單
    quiz_node_ids: list[str] = []
    questions_by_node: dict[str, list[int]] = {}
    for q in quiz.questions:  # 已依 order_index 排序
        quiz_node_ids.append(q.knowledge_node_id)
        questions_by_node.setdefault(q.knowledge_node_id, []).append(q.order_index)

    answered_pairs = [(a.node_id, a.passed) for a in payload.answered]
    asked_qids = {a.question_id for a in payload.answered}

    next_node, skipped = adaptive_service.next_adaptive_node(quiz_node_ids, answered_pairs)

    if next_node is None:
        return NextQuestionResponse(
            done=True, skipped_node_ids=skipped,
            reason="所有應診斷的節點已完成" + (f"（略過 {len(skipped)} 個先備）" if skipped else ""),
        )

    # 取該節點尚未問過的第一題（示範題組為 1 節點 1 題）
    candidates = [oi for oi in questions_by_node.get(next_node, []) if oi not in asked_qids]
    next_qid = candidates[0] if candidates else (questions_by_node.get(next_node) or [None])[0]

    # 僅當下一題確實是「上一題（答錯）的題組內先備」才是 descent；
    # 否則是 fall-through 到另一條鏈的下一個節點（不宜稱「退回先備」）。
    node_name = NODES.get(next_node, {}).get("name", next_node)
    is_descent = (
        bool(answered_pairs)
        and not answered_pairs[-1][1]
        and next_node in adaptive_service.in_quiz_prerequisites(
            answered_pairs[-1][0], set(quiz_node_ids),
        )
    )
    reason = (
        f"上一題未通過，退回先備節點「{node_name}」追溯"
        if is_descent else "進入下一個診斷節點"
    )

    return NextQuestionResponse(
        done=False,
        next_question_id=next_qid,
        next_node_id=next_node,
        skipped_node_ids=skipped,
        reason=reason,
    )


@router.post(
    "/trace-path",
    response_model=TracePathResponse,
    response_model_by_alias=True,
)
async def trace_path(
    payload: TracePathRequest,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TracePathResponse:
    """重播本次施測的適性出題路徑（供學生／教師診斷報告呈現，spec-10 §10.6）。

    僅回傳題組內的節點順序與退回/前進標註，不含任何個資，故開放給已登入者
    （學生看自己的報告、教師看學生報告）。後端由 answered 完整重播。
    """
    quiz = await db.get(Quiz, payload.quiz_id)
    if quiz is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "QUIZ_NOT_FOUND")

    quiz_node_ids: list[str] = []
    node_to_qid: dict[str, int] = {}
    for q in quiz.questions:  # 已依 order_index 排序
        quiz_node_ids.append(q.knowledge_node_id)
        node_to_qid.setdefault(q.knowledge_node_id, q.order_index)

    answered_by_node = {a.node_id: a.passed for a in payload.answered}
    result = adaptive_service.reconstruct_adaptive_path(quiz_node_ids, answered_by_node)

    steps = [
        AdaptivePathStep(
            node_id=s["node_id"],
            node_name=s["node_name"],
            question_id=node_to_qid.get(s["node_id"]),
            passed=s["passed"],
            kind=s["kind"],
        )
        for s in result["steps"]
    ]
    return TracePathResponse(
        steps=steps,
        skipped_node_ids=result["skipped_node_ids"],
        consistent=result["consistent"],
    )


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
