"""Quiz / QuizQuestion / QuizOption schemas."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

QuizMode = Literal["single", "two-tier"]


class QuizOptionIO(BaseModel):
    # 第一層答案選項。single：diagnosis 為 'CORRECT' / M-code；
    # two-tier：diagnosis 為 'CORRECT'（正解）/ 'WRONG'（其餘答案）。
    tag: Literal["A", "B", "C", "D"]
    content: str
    diagnosis: str


class QuizReasonOptionIO(BaseModel):
    # 第二層理由選項（two-tier）。tag 用「甲/乙/丙…」非 A-D，故不設 Literal 限制。
    tag: str
    content: str
    diagnosis: str  # 'CORRECT'（正確理由）或 M-code（對應某條迷思）
    # 此理由對應第一層哪個答案 tag（A/B/C）。出題結構標註；學生端不據此過濾。
    answer_tag: str | None = Field(default=None, alias="answerTag")

    model_config = ConfigDict(populate_by_name=True)


class QuizQuestionIO(BaseModel):
    id: int = Field(description="1-based order index within the quiz")
    stem: str
    knowledge_node_id: str = Field(alias="knowledgeNodeId")
    mode: QuizMode = "single"
    options: list[QuizOptionIO] = Field(min_length=1, max_length=4)
    # two-tier 才有；single 題為 None。
    reason_options: list[QuizReasonOptionIO] | None = Field(default=None, alias="reasonOptions")

    model_config = ConfigDict(populate_by_name=True)


class QuizBrief(BaseModel):
    id: str
    title: str
    status: Literal["draft", "published"]
    mode: QuizMode = Field(default="single")
    knowledge_node_ids: list[str] = Field(serialization_alias="knowledgeNodeIds")
    question_count: int = Field(serialization_alias="questionCount")
    is_sample: bool = Field(default=False, serialization_alias="isSample")
    created_by: str | None = Field(default=None, serialization_alias="createdBy")
    created_at: str = Field(serialization_alias="createdAt")  # ISO date

    model_config = ConfigDict(populate_by_name=True)


class QuizDetail(QuizBrief):
    questions: list[QuizQuestionIO]


class QuizSaveRequest(BaseModel):
    """POST or PUT body. id required for PUT, optional for POST (auto-generated if omitted)."""
    id: str | None = None
    title: str = Field(min_length=1, max_length=128)
    status: Literal["draft", "published"] = "draft"
    mode: QuizMode = "single"
    knowledge_node_ids: list[str] = Field(default_factory=list, alias="knowledgeNodeIds")
    questions: list[QuizQuestionIO] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)
