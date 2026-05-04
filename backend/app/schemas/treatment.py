"""Treatment session / message schemas."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TreatmentMessageIO(BaseModel):
    id: int
    session_id: str = Field(serialization_alias="sessionId")
    question_index: int = Field(serialization_alias="questionIndex")
    role: Literal["ai", "student"]
    text: str
    phase: Literal["diagnosis", "apprenticeship", "completed"] | None = None
    stage: Literal["claim", "evidence", "reasoning", "revise", "complete"] | None = None
    step: int | None = None
    hint_level: int | None = Field(default=None, serialization_alias="hintLevel")
    feedback: str | None = None
    requires_restatement: bool = Field(serialization_alias="requiresRestatement")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class TreatmentSessionBrief(BaseModel):
    id: str
    scenario_quiz_id: str = Field(serialization_alias="scenarioQuizId")
    student_id: str = Field(serialization_alias="studentId")
    status: Literal["active", "completed"]
    current_question_index: int = Field(serialization_alias="currentQuestionIndex")
    started_at: datetime = Field(serialization_alias="startedAt")
    completed_at: datetime | None = Field(serialization_alias="completedAt")

    model_config = ConfigDict(populate_by_name=True)


class TreatmentSessionDetail(TreatmentSessionBrief):
    messages: list[TreatmentMessageIO]


class StartSessionRequest(BaseModel):
    scenario_quiz_id: str = Field(alias="scenarioQuizId")

    model_config = ConfigDict(populate_by_name=True)


class AppendMessageRequest(BaseModel):
    question_index: int = Field(alias="questionIndex", ge=1)
    role: Literal["ai", "student"]
    text: str = Field(min_length=1)
    phase: Literal["diagnosis", "apprenticeship", "completed"] | None = None
    stage: Literal["claim", "evidence", "reasoning", "revise", "complete"] | None = None
    step: int | None = Field(default=None, ge=0, le=7)
    hint_level: int | None = Field(default=None, alias="hintLevel", ge=0, le=3)
    feedback: str | None = None
    requires_restatement: bool = Field(default=False, alias="requiresRestatement")

    model_config = ConfigDict(populate_by_name=True)


class AdvanceQuestionRequest(BaseModel):
    next_index: int = Field(alias="nextIndex", ge=1)

    model_config = ConfigDict(populate_by_name=True)


# ── teacher view ─────────────────────────────────────────────────────────
class TreatmentLogRow(BaseModel):
    """One row in the teacher TreatmentLogs list view."""
    session_id: str = Field(serialization_alias="sessionId")
    scenario_quiz_id: str = Field(serialization_alias="scenarioQuizId")
    scenario_title: str = Field(serialization_alias="scenarioTitle")
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    class_id: str | None = Field(serialization_alias="classId")
    class_name: str | None = Field(serialization_alias="className")
    status: Literal["active", "completed"]
    current_question_index: int = Field(serialization_alias="currentQuestionIndex")
    total_questions: int = Field(serialization_alias="totalQuestions")
    started_at: datetime = Field(serialization_alias="startedAt")
    completed_at: datetime | None = Field(serialization_alias="completedAt")

    model_config = ConfigDict(populate_by_name=True)
