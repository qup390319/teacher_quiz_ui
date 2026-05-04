"""ScenarioQuiz / ScenarioQuestion schemas."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ScenarioQuestionIO(BaseModel):
    index: int = Field(ge=1, description="1-based order")
    title: str
    scenario_text: str = Field(alias="scenarioText")
    scenario_images: list[str] = Field(default_factory=list, alias="scenarioImages")
    scenario_image_zoomable: bool = Field(default=False, alias="scenarioImageZoomable")
    initial_message: str = Field(alias="initialMessage")
    expert_model: str = Field(alias="expertModel")
    target_misconceptions: list[str] = Field(default_factory=list, alias="targetMisconceptions")

    model_config = ConfigDict(populate_by_name=True)


class ScenarioBrief(BaseModel):
    id: str
    title: str
    status: Literal["draft", "published"]
    target_node_id: str = Field(serialization_alias="targetNodeId")
    target_misconceptions: list[str] = Field(serialization_alias="targetMisconceptions")
    question_count: int = Field(serialization_alias="questionCount")
    created_at: str = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ScenarioDetail(ScenarioBrief):
    questions: list[ScenarioQuestionIO]


class ScenarioSaveRequest(BaseModel):
    id: str | None = None
    title: str = Field(min_length=1, max_length=128)
    status: Literal["draft", "published"] = "draft"
    target_node_id: str = Field(alias="targetNodeId")
    target_misconceptions: list[str] = Field(default_factory=list, alias="targetMisconceptions")
    questions: list[ScenarioQuestionIO] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)
