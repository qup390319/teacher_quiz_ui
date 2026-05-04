"""Scenario quiz CRUD with nested questions."""
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_teacher
from app.db.models import Assignment, ScenarioQuestion, ScenarioQuiz, Student, User
from app.db.session import get_db
from app.schemas.scenario import (
    ScenarioBrief,
    ScenarioDetail,
    ScenarioQuestionIO,
    ScenarioSaveRequest,
)

router = APIRouter()


def _to_brief(sq: ScenarioQuiz) -> ScenarioBrief:
    return ScenarioBrief(
        id=sq.id, title=sq.title, status=sq.status,
        target_node_id=sq.target_node_id,
        target_misconceptions=sq.target_misconceptions or [],
        question_count=len(sq.questions),
        created_at=sq.created_at.date().isoformat() if sq.created_at else "",
    )


def _to_detail(sq: ScenarioQuiz) -> ScenarioDetail:
    return ScenarioDetail(
        id=sq.id, title=sq.title, status=sq.status,
        target_node_id=sq.target_node_id,
        target_misconceptions=sq.target_misconceptions or [],
        question_count=len(sq.questions),
        created_at=sq.created_at.date().isoformat() if sq.created_at else "",
        questions=[
            ScenarioQuestionIO(
                index=q.order_index, title=q.title,
                scenario_text=q.scenario_text,
                scenario_images=q.scenario_images or [],
                scenario_image_zoomable=q.scenario_image_zoomable,
                initial_message=q.initial_message,
                expert_model=q.expert_model,
                target_misconceptions=q.target_misconceptions or [],
            )
            for q in sorted(sq.questions, key=lambda x: x.order_index)
        ],
    )


async def _replace_questions(db: AsyncSession, sq: ScenarioQuiz, payload_questions: list[ScenarioQuestionIO]) -> None:
    for q in list(sq.questions):
        await db.delete(q)
    await db.flush()
    for q_in in payload_questions:
        db.add(ScenarioQuestion(
            scenario_quiz_id=sq.id,
            order_index=q_in.index,
            title=q_in.title,
            scenario_text=q_in.scenario_text,
            scenario_images=q_in.scenario_images,
            scenario_image_zoomable=q_in.scenario_image_zoomable,
            initial_message=q_in.initial_message,
            expert_model=q_in.expert_model,
            target_misconceptions=q_in.target_misconceptions,
        ))


@router.get("", response_model=list[ScenarioBrief], response_model_by_alias=True)
async def list_scenarios(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ScenarioBrief]:
    """Teachers see all scenarios; students see only scenarios assigned to their class."""
    stmt = select(ScenarioQuiz).order_by(ScenarioQuiz.created_at.desc())
    if user.role == "student":
        student = await db.get(Student, user.id)
        if student is None:
            return []
        assigned_ids_res = await db.execute(
            select(Assignment.scenario_quiz_id).where(
                Assignment.class_id == student.class_id,
                Assignment.scenario_quiz_id.is_not(None),
            ),
        )
        assigned_ids = {sid for (sid,) in assigned_ids_res.all() if sid}
        if not assigned_ids:
            return []
        stmt = stmt.where(ScenarioQuiz.id.in_(assigned_ids))
    res = await db.execute(stmt)
    return [_to_brief(sq) for sq in res.scalars().all()]


@router.get("/{scenario_id}", response_model=ScenarioDetail, response_model_by_alias=True)
async def get_scenario(
    scenario_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScenarioDetail:
    sq = await db.get(ScenarioQuiz, scenario_id)
    if sq is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SCENARIO_NOT_FOUND")
    # Students may only fetch scenarios assigned to their class.
    if user.role == "student":
        student = await db.get(Student, user.id)
        if student is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "SCENARIO_NOT_ASSIGNED")
        res = await db.execute(
            select(Assignment.id).where(
                Assignment.scenario_quiz_id == scenario_id,
                Assignment.class_id == student.class_id,
            ).limit(1),
        )
        if res.scalar_one_or_none() is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "SCENARIO_NOT_ASSIGNED")
    return _to_detail(sq)


@router.post("", response_model=ScenarioDetail, status_code=status.HTTP_201_CREATED, response_model_by_alias=True)
async def create_scenario(
    payload: ScenarioSaveRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ScenarioDetail:
    sid = payload.id or f"scenario-{int(time.time() * 1000)}"
    if await db.get(ScenarioQuiz, sid):
        raise HTTPException(status.HTTP_409_CONFLICT, "SCENARIO_ID_EXISTS")
    sq = ScenarioQuiz(
        id=sid,
        title=payload.title,
        status=payload.status,
        target_node_id=payload.target_node_id,
        target_misconceptions=payload.target_misconceptions,
        created_by=teacher.id,
    )
    db.add(sq)
    await db.flush()
    await _replace_questions(db, sq, payload.questions)
    await db.commit()
    await db.refresh(sq)
    return _to_detail(sq)


@router.put("/{scenario_id}", response_model=ScenarioDetail, response_model_by_alias=True)
async def update_scenario(
    scenario_id: str,
    payload: ScenarioSaveRequest,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ScenarioDetail:
    sq = await db.get(ScenarioQuiz, scenario_id)
    if sq is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SCENARIO_NOT_FOUND")
    sq.title = payload.title
    sq.status = payload.status
    sq.target_node_id = payload.target_node_id
    sq.target_misconceptions = payload.target_misconceptions
    await _replace_questions(db, sq, payload.questions)
    await db.commit()
    await db.refresh(sq)
    return _to_detail(sq)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: str,
    _teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    sq = await db.get(ScenarioQuiz, scenario_id)
    if sq is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "SCENARIO_NOT_FOUND")
    await db.delete(sq)
    await db.commit()
