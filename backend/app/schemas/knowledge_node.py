"""KnowledgeNode + Misconception schemas (W5a). See spec-02 §3.8."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.unit import GradeBand


class MisconceptionBrief(BaseModel):
    id: str
    node_id: str = Field(serialization_alias="nodeId")
    label: str
    detail: str | None = None
    student_detail: str | None = Field(default=None, serialization_alias="studentDetail")
    confirm_question: str | None = Field(default=None, serialization_alias="confirmQuestion")
    is_default: bool = Field(serialization_alias="isDefault")
    owner_id: str | None = Field(default=None, serialization_alias="ownerId")
    display_order: int = Field(serialization_alias="displayOrder")

    model_config = ConfigDict(populate_by_name=True)


class KnowledgeNodeBrief(BaseModel):
    id: str
    unit_id: str | None = Field(default=None, serialization_alias="unitId")
    grade_band: GradeBand = Field(serialization_alias="gradeBand")
    parent_code: str | None = Field(default=None, serialization_alias="parentCode")
    parent_name: str | None = Field(default=None, serialization_alias="parentName")
    name: str
    description: str | None = None
    video_title: str | None = Field(default=None, serialization_alias="videoTitle")
    video_url: str | None = Field(default=None, serialization_alias="videoUrl")
    teaching_strategy: str | None = Field(default=None, serialization_alias="teachingStrategy")
    student_hint: str | None = Field(default=None, serialization_alias="studentHint")
    learning_order: int = Field(serialization_alias="learningOrder")
    prerequisites: list[str] = []
    canvas_x: float | None = Field(default=None, serialization_alias="canvasX")
    canvas_y: float | None = Field(default=None, serialization_alias="canvasY")
    is_system_seed: bool = Field(serialization_alias="isSystemSeed")
    on_canvas: bool = Field(default=False, serialization_alias="onCanvas")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class KnowledgeNodeDetail(KnowledgeNodeBrief):
    misconceptions: list[MisconceptionBrief] = []


class CreateNodeRequest(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    unit_id: str | None = Field(
        default=None, validation_alias="unitId", serialization_alias="unitId",
    )
    grade_band: GradeBand = Field(
        validation_alias="gradeBand", serialization_alias="gradeBand",
    )
    parent_code: str | None = Field(
        default=None, max_length=32,
        validation_alias="parentCode", serialization_alias="parentCode",
    )
    parent_name: str | None = Field(
        default=None,
        validation_alias="parentName", serialization_alias="parentName",
    )
    name: str = Field(min_length=1, max_length=256)
    description: str | None = None
    learning_order: int | None = Field(
        default=None,
        validation_alias="learningOrder", serialization_alias="learningOrder",
    )
    prerequisites: list[str] = []
    video_title: str | None = Field(
        default=None,
        validation_alias="videoTitle", serialization_alias="videoTitle",
    )
    video_url: str | None = Field(
        default=None,
        validation_alias="videoUrl", serialization_alias="videoUrl",
    )
    teaching_strategy: str | None = Field(
        default=None,
        validation_alias="teachingStrategy", serialization_alias="teachingStrategy",
    )
    student_hint: str | None = Field(
        default=None,
        validation_alias="studentHint", serialization_alias="studentHint",
    )

    model_config = ConfigDict(populate_by_name=True)


class UpdateNodeRequest(BaseModel):
    unit_id: str | None = Field(
        default=None, validation_alias="unitId", serialization_alias="unitId",
    )
    grade_band: GradeBand | None = Field(
        default=None, validation_alias="gradeBand", serialization_alias="gradeBand",
    )
    parent_code: str | None = Field(
        default=None, max_length=32,
        validation_alias="parentCode", serialization_alias="parentCode",
    )
    parent_name: str | None = Field(
        default=None,
        validation_alias="parentName", serialization_alias="parentName",
    )
    name: str | None = Field(default=None, min_length=1, max_length=256)
    description: str | None = None
    learning_order: int | None = Field(
        default=None,
        validation_alias="learningOrder", serialization_alias="learningOrder",
    )
    prerequisites: list[str] | None = None
    video_title: str | None = Field(
        default=None,
        validation_alias="videoTitle", serialization_alias="videoTitle",
    )
    video_url: str | None = Field(
        default=None,
        validation_alias="videoUrl", serialization_alias="videoUrl",
    )
    teaching_strategy: str | None = Field(
        default=None,
        validation_alias="teachingStrategy", serialization_alias="teachingStrategy",
    )
    student_hint: str | None = Field(
        default=None,
        validation_alias="studentHint", serialization_alias="studentHint",
    )

    model_config = ConfigDict(populate_by_name=True)


class CanvasPosition(BaseModel):
    id: str
    x: float
    y: float


class BulkPositionsRequest(BaseModel):
    positions: list[CanvasPosition]


class BulkSetCanvasRequest(BaseModel):
    """加入畫布 / 從畫布移除（W5c）。on_canvas=true → 加入畫布；false → 移回節點庫。"""
    node_ids: list[str] = Field(
        validation_alias="nodeIds", serialization_alias="nodeIds",
    )
    on_canvas: bool = Field(
        validation_alias="onCanvas", serialization_alias="onCanvas",
    )

    model_config = ConfigDict(populate_by_name=True)


class BulkAssignUnitRequest(BaseModel):
    node_ids: list[str] = Field(
        validation_alias="nodeIds", serialization_alias="nodeIds",
    )
    unit_id: str | None = Field(
        default=None, validation_alias="unitId", serialization_alias="unitId",
    )

    model_config = ConfigDict(populate_by_name=True)


class CreateMisconceptionRequest(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=256)
    detail: str | None = None
    student_detail: str | None = Field(
        default=None,
        validation_alias="studentDetail", serialization_alias="studentDetail",
    )
    confirm_question: str | None = Field(
        default=None,
        validation_alias="confirmQuestion", serialization_alias="confirmQuestion",
    )
    display_order: int | None = Field(
        default=None,
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )

    model_config = ConfigDict(populate_by_name=True)


class UpdateMisconceptionRequest(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=256)
    detail: str | None = None
    student_detail: str | None = Field(
        default=None,
        validation_alias="studentDetail", serialization_alias="studentDetail",
    )
    confirm_question: str | None = Field(
        default=None,
        validation_alias="confirmQuestion", serialization_alias="confirmQuestion",
    )
    display_order: int | None = Field(
        default=None,
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )

    model_config = ConfigDict(populate_by_name=True)
