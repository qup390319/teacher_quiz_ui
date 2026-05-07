"""Student answers / followup schemas. See spec-04 §1.4 P4 hooks."""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AnswerInput(BaseModel):
    assignment_id: str = Field(alias="assignmentId")
    question_id: int = Field(alias="questionId")
    selected_tag: Literal["A", "B", "C", "D"] = Field(alias="selectedTag")
    diagnosis: str  # 'CORRECT' or M-code

    model_config = ConfigDict(populate_by_name=True)


class RecordAnswersRequest(BaseModel):
    """Batch insert: student submits all answers at once."""
    answers: list[AnswerInput] = Field(min_length=1)


class AnswerOut(BaseModel):
    id: int
    assignment_id: str = Field(serialization_alias="assignmentId")
    student_id: str = Field(serialization_alias="studentId")
    question_id: int = Field(serialization_alias="questionId")
    selected_tag: str = Field(serialization_alias="selectedTag")
    diagnosis: str
    answered_at: datetime = Field(serialization_alias="answeredAt")

    model_config = ConfigDict(populate_by_name=True)


class FollowupInput(BaseModel):
    """Per-question followup result (driven by N3 dialogue)."""
    student_answer_id: int = Field(alias="studentAnswerId")
    conversation_log: list[dict[str, Any]] = Field(default_factory=list, alias="conversationLog")
    final_status: Literal["CORRECT", "MISCONCEPTION", "UNCERTAIN"] = Field(alias="finalStatus")
    misconception_code: str | None = Field(default=None, alias="misconceptionCode")
    reasoning_quality: Literal["SOLID", "PARTIAL", "WEAK", "GUESSING"] = Field(alias="reasoningQuality")
    status_change: dict[str, Any] = Field(default_factory=dict, alias="statusChange")
    ai_summary: str | None = Field(default=None, alias="aiSummary")

    model_config = ConfigDict(populate_by_name=True)


class RecordFollowupsRequest(BaseModel):
    followups: list[FollowupInput] = Field(min_length=1)


# ── Aggregations for teacher dashboard ────────────────────────────────────
class StudentAnswerRow(BaseModel):
    """One question slot for one student in the class roster view."""
    question_id: int = Field(serialization_alias="questionId")
    selected_tag: str | None = Field(serialization_alias="selectedTag")  # None = not yet answered

    model_config = ConfigDict(populate_by_name=True)


class StudentAnswersRow(BaseModel):
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    seat: int
    answers: list[StudentAnswerRow]

    model_config = ConfigDict(populate_by_name=True)


class QuizClassAnswersResponse(BaseModel):
    """GET /api/quizzes/{quiz_id}/answers?classId="""
    quiz_id: str = Field(serialization_alias="quizId")
    class_id: str = Field(serialization_alias="classId")
    rows: list[StudentAnswersRow]

    model_config = ConfigDict(populate_by_name=True)


class MisconceptionTopRow(BaseModel):
    misconception_id: str = Field(serialization_alias="id")
    label: str
    count: int
    student_ids: list[str] = Field(serialization_alias="studentIds")

    model_config = ConfigDict(populate_by_name=True)


class PerClassStatsRow(BaseModel):
    """Single-class stats nested in grade-wide response."""
    class_id: str = Field(serialization_alias="classId")
    class_name: str = Field(serialization_alias="className")
    student_count: int = Field(serialization_alias="studentCount")
    submitted_count: int = Field(serialization_alias="submittedCount")
    completion_rate: int = Field(serialization_alias="completionRate")
    average_mastery: int = Field(serialization_alias="averageMastery")
    node_pass_rates: dict[str, int] = Field(serialization_alias="nodePassRates")
    top_misconceptions: list[MisconceptionTopRow] = Field(serialization_alias="topMisconceptions")

    model_config = ConfigDict(populate_by_name=True)


class QuizStatsResponse(BaseModel):
    """GET /api/quizzes/{quiz_id}/stats?classId=

    For grade-wide stats (no classId), `perClass` is populated with each class's
    stats so the frontend can render cross-class comparison without N round-trips.
    For single-class stats, `perClass` is empty.
    """
    quiz_id: str = Field(serialization_alias="quizId")
    class_id: str | None = Field(default=None, serialization_alias="classId")
    student_count: int = Field(serialization_alias="studentCount")
    submitted_count: int = Field(serialization_alias="submittedCount")
    completion_rate: int = Field(serialization_alias="completionRate")
    average_mastery: int = Field(serialization_alias="averageMastery")
    node_pass_rates: dict[str, int] = Field(serialization_alias="nodePassRates")
    top_misconceptions: list[MisconceptionTopRow] = Field(serialization_alias="topMisconceptions")
    question_stats: dict[int, dict[str, int]] = Field(
        default_factory=dict, serialization_alias="questionStats",
    )  # {questionId: {A: n, B: n, C: n, D: n}}
    per_class: list[PerClassStatsRow] = Field(
        default_factory=list, serialization_alias="perClass",
    )

    model_config = ConfigDict(populate_by_name=True)


class StudentHistoryRow(BaseModel):
    quiz_id: str = Field(serialization_alias="quizId")
    quiz_title: str = Field(serialization_alias="quizTitle")
    answered_at: datetime = Field(serialization_alias="answeredAt")
    correct_count: int = Field(serialization_alias="correctCount")
    total_questions: int = Field(serialization_alias="totalQuestions")
    misconceptions: list[str]

    model_config = ConfigDict(populate_by_name=True)


# ── Teacher-facing: per-question follow-up dialogue logs ─────────────────
class FollowupConversationRow(BaseModel):
    """One follow-up dialogue log for one student-question pair."""
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    seat: int | None = None
    question_id: int = Field(serialization_alias="questionId")
    selected_tag: str | None = Field(serialization_alias="selectedTag")
    diagnosis: str  # current StudentAnswer.diagnosis (after followup statusChange)
    answered_at: datetime = Field(serialization_alias="answeredAt")
    final_status: str = Field(serialization_alias="finalStatus")
    misconception_code: str | None = Field(serialization_alias="misconceptionCode")
    reasoning_quality: str = Field(serialization_alias="reasoningQuality")
    ai_summary: str | None = Field(serialization_alias="aiSummary")
    status_change: dict[str, Any] = Field(serialization_alias="statusChange")
    conversation_log: list[dict[str, Any]] = Field(serialization_alias="conversationLog")

    model_config = ConfigDict(populate_by_name=True)


class QuizClassFollowupsResponse(BaseModel):
    """GET /api/quizzes/{quiz_id}/followups?classId=

    Returns follow-up dialogue logs for every (student, question) that has one.
    Only follow-ups; questions with no follow-up are omitted.
    """
    quiz_id: str = Field(serialization_alias="quizId")
    class_id: str = Field(serialization_alias="classId")
    rows: list[FollowupConversationRow]

    model_config = ConfigDict(populate_by_name=True)
