"""AI / RAGFlow endpoints. See spec-12."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.deps import require_teacher
from app.db.models import AiSummaryCache, Class, User
from app.db.session import get_db
from app.schemas.ai import (
    CitationOut,
    ClassSummaryRequest,
    DistractorSuggestRequest,
    DistractorSuggestResponse,
    GradeSummaryRequest,
    SummaryResponse,
)
from app.services.ai_service import (
    build_class_summary_query_from_db,
    build_grade_summary_query_from_db,
    build_summary,
    suggest_distractors,
)
from app.services.ragflow_service import RagflowError

router = APIRouter()

CACHE_TTL_HOURS = 24


@router.post(
    "/distractor-suggest",
    response_model=DistractorSuggestResponse,
    response_model_by_alias=True,
)
async def distractor_suggest(
    payload: DistractorSuggestRequest,
    _teacher: User = Depends(require_teacher),
) -> DistractorSuggestResponse:
    """N6 — generate evidence-based distractor candidates from RAGFlow."""
    try:
        suggestions, answer = await suggest_distractors(
            session_id=payload.ragflow_session_id,
            node_id=payload.node_id,
            node_name=payload.node_name,
            misconception_id=payload.misconception_id,
            misconception_label=payload.misconception_label,
            misconception_detail=payload.misconception_detail,
            current_text=payload.current_text,
            stem=payload.stem,
        )
    except RagflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_UNAVAILABLE") from exc

    if not suggestions:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_EMPTY")

    return DistractorSuggestResponse(
        suggestions=suggestions,
        citations=[
            CitationOut(
                document_name=c.document_name,
                snippet=c.snippet,
                document_id=c.document_id,
            )
            for c in answer.citations
        ],
        ragflow_session_id=answer.session_id,
    )


def _to_citations(answer) -> list[CitationOut]:
    return [
        CitationOut(document_name=c.document_name, snippet=c.snippet, document_id=c.document_id)
        for c in answer.citations
    ]


async def _get_cache(
    db: AsyncSession, scope: str, scope_id: str, quiz_id: str,
) -> AiSummaryCache | None:
    now = datetime.utcnow()
    result = await db.execute(
        select(AiSummaryCache).where(
            and_(
                AiSummaryCache.scope == scope,
                AiSummaryCache.scope_id == scope_id,
                AiSummaryCache.quiz_id == quiz_id,
                AiSummaryCache.expires_at > now,
            ),
        ),
    )
    return result.scalar_one_or_none()


async def _save_cache(
    db: AsyncSession,
    scope: str,
    scope_id: str,
    quiz_id: str,
    summary: str,
    actions: list[str],
    citations: list[dict],
) -> AiSummaryCache:
    now = datetime.utcnow()
    result = await db.execute(
        select(AiSummaryCache).where(
            and_(
                AiSummaryCache.scope == scope,
                AiSummaryCache.scope_id == scope_id,
                AiSummaryCache.quiz_id == quiz_id,
            ),
        ),
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.payload = {"summary": summary, "actions": actions}
        existing.citations = citations
        existing.generated_at = now
        existing.expires_at = now + timedelta(hours=CACHE_TTL_HOURS)
    else:
        existing = AiSummaryCache(
            scope=scope,
            scope_id=scope_id,
            quiz_id=quiz_id,
            payload={"summary": summary, "actions": actions},
            citations=citations,
            generated_at=now,
            expires_at=now + timedelta(hours=CACHE_TTL_HOURS),
        )
        db.add(existing)
    await db.commit()
    await db.refresh(existing)
    return existing


def _cache_to_response(cache: AiSummaryCache) -> SummaryResponse:
    return SummaryResponse(
        summary=cache.payload["summary"],
        actions=cache.payload.get("actions", []),
        citations=[
            CitationOut(
                document_name=c.get("documentName", c.get("document_name", "")),
                snippet=c.get("snippet"),
                document_id=c.get("documentId", c.get("document_id")),
            )
            for c in (cache.citations or [])
        ],
        ragflow_session_id=None,
        generated_at=cache.generated_at.isoformat(),
        cached=True,
    )


@router.get(
    "/grade-summary",
    response_model=SummaryResponse,
    response_model_by_alias=True,
)
async def get_grade_summary(
    quiz_id: str = Query(alias="quizId"),
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    """Return cached grade summary if available."""
    cache = await _get_cache(db, "grade", teacher.id, quiz_id)
    if not cache:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "NO_CACHE")
    return _cache_to_response(cache)


@router.post(
    "/grade-summary",
    response_model=SummaryResponse,
    response_model_by_alias=True,
)
async def grade_summary(
    payload: GradeSummaryRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
    force: bool = Query(default=False),
) -> SummaryResponse:
    """N1 — grade-level summary. Returns cache unless force=true."""
    if not force:
        cache = await _get_cache(db, "grade", teacher.id, payload.quiz_id)
        if cache:
            return _cache_to_response(cache)

    prompt = await build_grade_summary_query_from_db(
        db, payload.quiz_id, teacher_id=teacher.id,
    )
    if not prompt:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "NO_DATA_FOR_QUIZ")
    try:
        summary_text, actions, answer = await build_summary(prompt=prompt)
    except RagflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_UNAVAILABLE") from exc
    if not summary_text:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_EMPTY")

    citations_dicts = [
        {"documentName": c.document_name, "snippet": c.snippet, "documentId": c.document_id}
        for c in answer.citations
    ]
    cache = await _save_cache(
        db, "grade", teacher.id, payload.quiz_id,
        summary_text, actions, citations_dicts,
    )
    resp = _cache_to_response(cache)
    resp.cached = False
    resp.ragflow_session_id = answer.session_id
    return resp


@router.get(
    "/class-summary",
    response_model=SummaryResponse,
    response_model_by_alias=True,
)
async def get_class_summary(
    quiz_id: str = Query(alias="quizId"),
    class_id: str = Query(alias="classId"),
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    """Return cached class summary if available."""
    cls = await db.get(Class, class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    cache = await _get_cache(db, "class", class_id, quiz_id)
    if not cache:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "NO_CACHE")
    return _cache_to_response(cache)


@router.post(
    "/class-summary",
    response_model=SummaryResponse,
    response_model_by_alias=True,
)
async def class_summary(
    payload: ClassSummaryRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
    force: bool = Query(default=False),
) -> SummaryResponse:
    """N2 — single-class summary. Returns cache unless force=true."""
    cls = await db.get(Class, payload.class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")

    if not force:
        cache = await _get_cache(db, "class", payload.class_id, payload.quiz_id)
        if cache:
            return _cache_to_response(cache)

    prompt = await build_class_summary_query_from_db(db, payload.quiz_id, payload.class_id)
    if not prompt:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "NO_DATA_FOR_CLASS")
    try:
        summary_text, actions, answer = await build_summary(prompt=prompt)
    except RagflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_UNAVAILABLE") from exc
    if not summary_text:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_EMPTY")

    citations_dicts = [
        {"documentName": c.document_name, "snippet": c.snippet, "documentId": c.document_id}
        for c in answer.citations
    ]
    cache = await _save_cache(
        db, "class", payload.class_id, payload.quiz_id,
        summary_text, actions, citations_dicts,
    )
    resp = _cache_to_response(cache)
    resp.cached = False
    resp.ragflow_session_id = answer.session_id
    return resp
