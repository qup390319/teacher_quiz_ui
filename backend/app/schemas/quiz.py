"""Quiz / QuizQuestion / QuizOption schemas."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class QuizOptionIO(BaseModel):
    tag: Literal["A", "B", "C", "D"]
    content: str
    diagnosis: str  # 'CORRECT' or 'M02-1' etc.


class QuizQuestionIO(BaseModel):
    id: int = Field(description="1-based order index within the quiz")
    stem: str
    knowledge_node_id: str = Field(alias="knowledgeNodeId")
    options: list[QuizOptionIO] = Field(min_length=1, max_length=4)

    model_config = ConfigDict(populate_by_name=True)


class QuizBrief(BaseModel):
    id: str
    title: str
    status: Literal["draft", "published"]
    knowledge_node_ids: list[str] = Field(serialization_alias="knowledgeNodeIds")
    question_count: int = Field(serialization_alias="questionCount")
    created_at: str = Field(serialization_alias="createdAt")  # ISO date

    model_config = ConfigDict(populate_by_name=True)


class QuizDetail(QuizBrief):
    questions: list[QuizQuestionIO]


class QuizSaveRequest(BaseModel):
    """POST or PUT body. id required for PUT, optional for POST (auto-generated if omitted)."""
    id: str | None = None
    title: str = Field(min_length=1, max_length=128)
    status: Literal["draft", "published"] = "draft"
    knowledge_node_ids: list[str] = Field(default_factory=list, alias="knowledgeNodeIds")
    questions: list[QuizQuestionIO] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)
