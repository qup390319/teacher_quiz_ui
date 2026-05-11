"""LLM proxy endpoints. See spec-09 §7."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.auth.deps import get_current_user
from app.db.models import User
from app.schemas.llm import CauseAnalysisRequest, CauseAnalysisResponse, ChatRequest, ChatResponse
from app.services import cause_analysis_service
from app.services.llm_service import LlmServiceError, chat, chat_stream

router = APIRouter()


@router.post("/chat", response_model=ChatResponse, response_model_by_alias=True)
async def llm_chat(
    payload: ChatRequest,
    include_raw: bool = Query(default=False, alias="includeRaw"),
    _user: User = Depends(get_current_user),
) -> ChatResponse:
    """One-shot LLM completion. Requires login (any role)."""
    try:
        return await chat(payload, include_raw=include_raw)
    except LlmServiceError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "LLM_UPSTREAM_ERROR") from exc


@router.post("/chat/stream")
async def llm_chat_stream(
    payload: ChatRequest,
    _user: User = Depends(get_current_user),
) -> StreamingResponse:
    """SSE streaming LLM completion."""

    async def _gen():
        try:
            async for sse in chat_stream(payload):
                yield sse
        except LlmServiceError as exc:
            # surface error inside the stream so clients can show it
            import json as _json
            yield "data: " + _json.dumps(
                {"error": "LLM_UPSTREAM_ERROR", "message": str(exc)},
                ensure_ascii=False,
            ) + "\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/analyze-cause", response_model=CauseAnalysisResponse, response_model_by_alias=True)
async def analyze_misconception_cause(
    payload: CauseAnalysisRequest,
    _user: User = Depends(get_current_user),
) -> CauseAnalysisResponse:
    """Analyze misconception cause from follow-up dialogue via LLM."""
    try:
        cause_ids = await cause_analysis_service.analyze_cause(
            conversation_log=payload.conversation_log,
            misconception_code=payload.misconception_code,
            misconception_label=payload.misconception_label,
            knowledge_node=payload.knowledge_node,
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "CAUSE_ANALYSIS_FAILED") from exc
    return CauseAnalysisResponse(cause_ids=cause_ids)
