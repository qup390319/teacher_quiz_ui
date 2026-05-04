"""AI / RAGFlow Pydantic schemas. See spec-12 §7 / §8."""
from pydantic import BaseModel, ConfigDict, Field


# ── N6: distractor suggestion ───────────────────────────────────────────
class DistractorSuggestRequest(BaseModel):
    node_id: str = Field(alias="nodeId", min_length=1, max_length=32)
    node_name: str = Field(alias="nodeName", min_length=1, max_length=128)
    misconception_id: str = Field(alias="misconceptionId", min_length=1, max_length=16)
    misconception_label: str = Field(alias="misconceptionLabel", min_length=1, max_length=128)
    misconception_detail: str = Field(alias="misconceptionDetail", min_length=1, max_length=1024)
    current_text: str = Field(default="", alias="currentText", max_length=512)
    ragflow_session_id: str | None = Field(default=None, alias="ragflowSessionId")

    model_config = ConfigDict(populate_by_name=True)


class CitationOut(BaseModel):
    document_name: str = Field(serialization_alias="documentName")
    snippet: str | None = None
    document_id: str | None = Field(default=None, serialization_alias="documentId")

    model_config = ConfigDict(populate_by_name=True)


class DistractorSuggestResponse(BaseModel):
    suggestions: list[str]
    citations: list[CitationOut]
    ragflow_session_id: str | None = Field(serialization_alias="ragflowSessionId")

    model_config = ConfigDict(populate_by_name=True)


# ── N1 / N2: summary inputs ──────────────────────────────────────────────
class TopMisconception(BaseModel):
    id: str
    label: str
    count: int = Field(ge=0)


class KnowledgeNodeBrief(BaseModel):
    id: str
    name: str


class ClassStatsInput(BaseModel):
    class_id: str = Field(alias="classId")
    class_name: str = Field(alias="className")
    student_count: int = Field(alias="studentCount", ge=0)
    submitted_count: int = Field(alias="submittedCount", ge=0)
    completion_rate: int = Field(alias="completionRate", ge=0, le=100)
    average_mastery: int = Field(alias="averageMastery", ge=0, le=100)
    node_pass_rates: dict[str, int] = Field(alias="nodePassRates")  # nodeId → pct
    top_misconceptions: list[TopMisconception] = Field(alias="topMisconceptions")

    model_config = ConfigDict(populate_by_name=True)


class GradeSummaryRequest(BaseModel):
    """P4: only quizId is required. Backend computes the rest from DB.

    Old fields (perClass / knowledgeNodes / quizTitle) are accepted but ignored
    (extra fields allowed) for backwards compat with P3 frontend.
    """
    quiz_id: str = Field(alias="quizId")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class ClassSummaryRequest(BaseModel):
    """P4: only quizId + classId required."""
    quiz_id: str = Field(alias="quizId")
    class_id: str = Field(alias="classId")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class SummaryResponse(BaseModel):
    summary: str
    actions: list[str]
    citations: list[CitationOut]
    ragflow_session_id: str | None = Field(serialization_alias="ragflowSessionId")

    model_config = ConfigDict(populate_by_name=True)
