"""Student answers / followup schemas. See spec-04 §1.4 P4 hooks."""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AnswerInput(BaseModel):
    assignment_id: str = Field(alias="assignmentId")
    question_id: int = Field(alias="questionId")
    selected_tag: Literal["A", "B", "C", "D"] = Field(alias="selectedTag")
    # two-tier 第二層理由 tag；single 題傳 None。
    reason_tag: str | None = Field(default=None, alias="reasonTag")
    # 四象限 TT/TF/FT/FF；single 題傳 None（後端不強制，向下相容）。
    quadrant: Literal["TT", "TF", "FT", "FF"] | None = Field(default=None)
    diagnosis: str  # 'CORRECT' or M-code

    model_config = ConfigDict(populate_by_name=True)


class RecordAnswersRequest(BaseModel):
    """Batch insert: student submits all answers at once."""
    answers: list[AnswerInput] = Field(min_length=1)


class AnswerOut(BaseModel):
    id: int
    assignment_id: str = Field(serialization_alias="assignmentId")
    student_id: str = Field(serialization_alias="studentId")
    question_id: int | None = Field(serialization_alias="questionId")
    selected_tag: str = Field(serialization_alias="selectedTag")
    reason_tag: str | None = Field(default=None, serialization_alias="reasonTag")
    quadrant: str | None = None
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
    cause_ids: list[int] | None = Field(default=None, alias="causeIds")
    # 答錯主導方向（spec-09 §12.4a）：EXPLANATION / DEFINITION / OBSERVATION / null
    error_type: str | None = Field(default=None, alias="errorType")

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
    mode: str = "single"

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
    # two-tier 四象限分佈 {questionId: {TT, TF, FT, FF}}；single 卷以 TT/FF 映射。
    quadrant_stats: dict[int, dict[str, int]] = Field(
        default_factory=dict, serialization_alias="quadrantStats",
    )
    mode: str = "single"
    per_class: list[PerClassStatsRow] = Field(
        default_factory=list, serialization_alias="perClass",
    )

    model_config = ConfigDict(populate_by_name=True)


class StudentQuestionResult(BaseModel):
    """單一題目的對錯結果，供學生報告「每一題的結果」逐題呈現。

    自帶題幹與所選選項內容，讓前端**不依賴 mock getQuizQuestions** 即可渲染任何題組
    （真實教師題組的 quizId / 題目 id 前端 mock 並不認得）。`question_id` 為卷內題序。
    """
    question_id: int = Field(serialization_alias="questionId")
    node_id: str | None = Field(default=None, serialization_alias="nodeId")
    stem: str | None = Field(default=None)
    selected_option_content: str | None = Field(default=None, serialization_alias="selectedOptionContent")
    selected_tag: str | None = Field(serialization_alias="selectedTag")
    # two-tier：學生所選理由內容與四象限；single 題為 None。
    selected_reason_content: str | None = Field(default=None, serialization_alias="selectedReasonContent")
    quadrant: str | None = None
    diagnosis: str  # 'CORRECT' 或 M-code（已含 followup statusChange 調整後的值）
    is_correct: bool = Field(serialization_alias="isCorrect")

    model_config = ConfigDict(populate_by_name=True)


class StudentHistoryRow(BaseModel):
    quiz_id: str = Field(serialization_alias="quizId")
    quiz_title: str = Field(serialization_alias="quizTitle")
    answered_at: datetime = Field(serialization_alias="answeredAt")
    correct_count: int = Field(serialization_alias="correctCount")
    total_questions: int = Field(serialization_alias="totalQuestions")
    misconceptions: list[str]
    # {misconceptionCode: sorted unique causeIds} aggregated across this quiz's
    # follow-up results. Lets the student "學習體檢表" render cause badges after
    # the in-memory snapshot is gone (e.g. after re-login).
    cause_ids_by_misconception: dict[str, list[int]] = Field(
        default_factory=dict, serialization_alias="causeIdsByMisconception",
    )
    # {misconceptionCode: errorType} aggregated across follow-up results, so the
    # report can still render 解釋型/定義型/觀察型 after the in-memory snapshot is
    # gone (e.g. re-login / reload / tab remount). spec-09 §12.4a.
    error_type_by_misconception: dict[str, str] = Field(
        default_factory=dict, serialization_alias="errorTypeByMisconception",
    )
    # {misconceptionCode: aiSummary} —— 追問對話針對該迷思產出的個人化回饋
    # （「給你的話」）。in-memory 快照消失後（re-login / reload）報告仍能還原此區塊。
    ai_summary_by_misconception: dict[str, str] = Field(
        default_factory=dict, serialization_alias="aiSummaryByMisconception",
    )
    # {misconceptionCode: statusChange dict} —— 想法轉變（CONFIRMED/UPGRADED/DOWNGRADED），
    # 讓報告在歷史檢視時仍能標示「作答選對、深談後確認迷思」等情境。
    status_change_by_misconception: dict[str, dict[str, Any]] = Field(
        default_factory=dict, serialization_alias="statusChangeByMisconception",
    )
    # {misconceptionCode: 最具診斷性的學生原話} —— 由後端從 conversation_log 依
    # 與前端 getStudentQuote 相同規則挑出，供歷史檢視時還原「你在對話中提到」引用。
    quote_by_misconception: dict[str, str] = Field(
        default_factory=dict, serialization_alias="quoteByMisconception",
    )
    # 逐題對錯結果，供學生報告「每一題的結果」區塊（in-memory 快照失效後仍能還原）。
    question_results: list[StudentQuestionResult] = Field(
        default_factory=list, serialization_alias="questionResults",
    )

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
    cause_ids: list[int] | None = Field(default=None, serialization_alias="causeIds")
    error_type: str | None = Field(default=None, serialization_alias="errorType")
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


class DiagnosisLogRow(BaseModel):
    """One follow-up dialogue row for the teacher diagnosis-logs overview."""
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    seat: int | None = None
    class_id: str | None = Field(default=None, serialization_alias="classId")
    class_name: str | None = Field(default=None, serialization_alias="className")
    quiz_id: str = Field(serialization_alias="quizId")
    quiz_title: str = Field(serialization_alias="quizTitle")
    question_id: int = Field(serialization_alias="questionId")
    final_status: str = Field(serialization_alias="finalStatus")
    misconception_code: str | None = Field(serialization_alias="misconceptionCode")
    reasoning_quality: str = Field(serialization_alias="reasoningQuality")
    ai_summary: str | None = Field(serialization_alias="aiSummary")
    cause_ids: list[int] | None = Field(default=None, serialization_alias="causeIds")
    error_type: str | None = Field(default=None, serialization_alias="errorType")
    status_change: dict[str, Any] = Field(serialization_alias="statusChange")
    conversation_log: list[dict[str, Any]] = Field(serialization_alias="conversationLog")
    answered_at: datetime = Field(serialization_alias="answeredAt")

    model_config = ConfigDict(populate_by_name=True)
