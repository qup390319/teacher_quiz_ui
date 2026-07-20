"""Adaptive dispatching Pydantic schemas."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class NodeMastery(BaseModel):
    node_id: str = Field(serialization_alias="nodeId")
    node_name: str = Field(serialization_alias="nodeName")
    level: int
    total_questions: int = Field(serialization_alias="totalQuestions")
    correct_count: int = Field(serialization_alias="correctCount")
    mastery_pct: int = Field(serialization_alias="masteryPct")

    model_config = ConfigDict(populate_by_name=True)


class PrerequisiteStatus(BaseModel):
    node_id: str = Field(serialization_alias="nodeId")
    node_name: str = Field(serialization_alias="nodeName")
    mastered: bool
    mastery_pct: int = Field(serialization_alias="masteryPct")
    missing: bool

    model_config = ConfigDict(populate_by_name=True)


class StudentPrerequisiteReport(BaseModel):
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    seat: int | None = None
    ready: bool
    prerequisites: list[PrerequisiteStatus]
    weak_nodes: list[str] = Field(serialization_alias="weakNodes")

    model_config = ConfigDict(populate_by_name=True)


class ClassPrerequisiteResponse(BaseModel):
    class_id: str = Field(serialization_alias="classId")
    target_node_ids: list[str] = Field(serialization_alias="targetNodeIds")
    mastery_threshold: int = Field(serialization_alias="masteryThreshold")
    students: list[StudentPrerequisiteReport]

    model_config = ConfigDict(populate_by_name=True)


class AdaptiveRecommendation(BaseModel):
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    seat: int | None = None
    recommended_node_ids: list[str] = Field(serialization_alias="recommendedNodeIds")
    skip_node_ids: list[str] = Field(serialization_alias="skipNodeIds")
    reason: str

    model_config = ConfigDict(populate_by_name=True)


class AdaptiveRecommendResponse(BaseModel):
    class_id: str = Field(serialization_alias="classId")
    mode: Literal["review", "diagnosis"] = "diagnosis"
    sorted_node_ids: list[str] = Field(serialization_alias="sortedNodeIds")
    students: list[AdaptiveRecommendation]

    model_config = ConfigDict(populate_by_name=True)


class AnsweredNode(BaseModel):
    """學生已作答一題的最小資訊（施測中動態選題用）。"""

    question_id: int = Field(alias="questionId")
    node_id: str = Field(alias="nodeId", min_length=1, max_length=32)
    # 是否通過該節點：single 為 diagnosis==='CORRECT'；two-tier 為 quadrant==='TT'。
    passed: bool

    model_config = ConfigDict(populate_by_name=True)


class NextQuestionRequest(BaseModel):
    quiz_id: str = Field(alias="quizId", min_length=1, max_length=32)
    # 依實際作答順序排列；後端由此完整重算下一題（無 session 狀態）。
    answered: list[AnsweredNode] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class NextQuestionResponse(BaseModel):
    done: bool
    next_question_id: int | None = Field(default=None, serialization_alias="nextQuestionId")
    next_node_id: str | None = Field(default=None, serialization_alias="nextNodeId")
    # 因過關而略過、尚未作答的先備節點（前端可據此說明「已跳過的基礎」）。
    skipped_node_ids: list[str] = Field(
        default_factory=list, serialization_alias="skippedNodeIds",
    )
    reason: str = ""

    model_config = ConfigDict(populate_by_name=True)


class TraceAnsweredNode(BaseModel):
    """報告端重播用：一個已作答節點的最小資訊。"""

    node_id: str = Field(alias="nodeId", min_length=1, max_length=32)
    # 第一層是否通過：single 為 diagnosis==='CORRECT'；two-tier 為 quadrant==='TT'。
    passed: bool

    model_config = ConfigDict(populate_by_name=True)


class TracePathRequest(BaseModel):
    quiz_id: str = Field(alias="quizId", min_length=1, max_length=32)
    # 本次施測已作答的節點（順序不拘，後端由引擎重播還原出題順序）。
    answered: list[TraceAnsweredNode] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class AdaptivePathStep(BaseModel):
    node_id: str = Field(serialization_alias="nodeId")
    node_name: str = Field(serialization_alias="nodeName")
    question_id: int | None = Field(default=None, serialization_alias="questionId")
    passed: bool
    # 'start'（起始最進階）/ 'retreat'（答錯退回先備）/ 'advance'（換下一條鏈）。
    kind: Literal["start", "retreat", "advance"]

    model_config = ConfigDict(populate_by_name=True)


class TracePathResponse(BaseModel):
    # 依實際出題順序排列的路徑（含動態退回/前進標註）。
    steps: list[AdaptivePathStep]
    skipped_node_ids: list[str] = Field(
        default_factory=list, serialization_alias="skippedNodeIds",
    )
    # False 代表已作答節點集與重播結果不一致（多為非適性 session 的舊資料）。
    consistent: bool = True

    model_config = ConfigDict(populate_by_name=True)


class PolishStemRequest(BaseModel):
    stem: str = Field(min_length=1, max_length=2048)
    node_id: str = Field(alias="nodeId", min_length=1, max_length=32)
    node_name: str = Field(alias="nodeName", min_length=1, max_length=128)

    model_config = ConfigDict(populate_by_name=True)


class PolishStemResponse(BaseModel):
    polished: str

    model_config = ConfigDict(populate_by_name=True)


class SuggestOptionsRequest(BaseModel):
    stem: str = Field(min_length=1, max_length=2048)
    node_id: str = Field(alias="nodeId", min_length=1, max_length=32)
    node_name: str = Field(alias="nodeName", min_length=1, max_length=128)
    misconceptions: list[dict] = Field(default_factory=list)
    # 'single'：一組 4 選項；'two-tier'：答案層 + 理由層各 3。
    mode: Literal["single", "two-tier"] = "single"

    model_config = ConfigDict(populate_by_name=True)


class SuggestedOption(BaseModel):
    tag: Literal["A", "B", "C", "D"]
    content: str
    diagnosis: str

    model_config = ConfigDict(populate_by_name=True)


class SuggestedReasonOption(BaseModel):
    # 理由層 tag 用 甲/乙/丙，故不設 Literal。
    tag: str
    content: str
    diagnosis: str  # 'CORRECT' 或 M-code
    answer_tag: str | None = Field(default=None, serialization_alias="answerTag")

    model_config = ConfigDict(populate_by_name=True)


class SuggestOptionsResponse(BaseModel):
    # single：options 為 4 選項；two-tier：options 為答案層(3)、reasonOptions 為理由層(3)。
    options: list[SuggestedOption]
    reason_options: list[SuggestedReasonOption] | None = Field(
        default=None, serialization_alias="reasonOptions",
    )

    model_config = ConfigDict(populate_by_name=True)
