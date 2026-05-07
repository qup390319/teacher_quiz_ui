"""AI / RAGFlow endpoints. See spec-12."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.db.models import Class, User
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


@router.post(
    "/grade-summary",
    response_model=SummaryResponse,
    response_model_by_alias=True,
)
async def grade_summary(
    payload: GradeSummaryRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    """N1 — grade-level summary across all classes (P4: stats from DB)."""
    prompt = await build_grade_summary_query_from_db(
        db, payload.quiz_id, teacher_id=teacher.id,
    )
    if not prompt:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "NO_DATA_FOR_QUIZ")
    try:
        summary, actions, answer = await build_summary(prompt=prompt)
    except RagflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_UNAVAILABLE") from exc
    if not summary:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_EMPTY")
    return SummaryResponse(
        summary=summary, actions=actions,
        citations=_to_citations(answer), ragflow_session_id=answer.session_id,
    )


@router.post(
    "/class-summary",
    response_model=SummaryResponse,
    response_model_by_alias=True,
)
async def class_summary(
    payload: ClassSummaryRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    """N2 — single-class summary (P4: stats from DB)."""
    cls = await db.get(Class, payload.class_id)
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CLASS_NOT_FOUND")
    prompt = await build_class_summary_query_from_db(db, payload.quiz_id, payload.class_id)
    if not prompt:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "NO_DATA_FOR_CLASS")
    try:
        summary, actions, answer = await build_summary(prompt=prompt)
    except RagflowError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_UNAVAILABLE") from exc
    if not summary:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "RAGFLOW_EMPTY")
    return SummaryResponse(
        summary=summary, actions=actions,
        citations=_to_citations(answer), ragflow_session_id=answer.session_id,
    )
