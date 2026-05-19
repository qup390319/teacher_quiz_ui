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

    model_config = ConfigDict(populate_by_name=True)


class SuggestedOption(BaseModel):
    tag: Literal["A", "B", "C", "D"]
    content: str
    diagnosis: str

    model_config = ConfigDict(populate_by_name=True)


class SuggestOptionsResponse(BaseModel):
    options: list[SuggestedOption]

    model_config = ConfigDict(populate_by_name=True)
