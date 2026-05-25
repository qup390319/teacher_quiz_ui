"""ParentNode schemas (W7a). See spec-11 §3.20."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ParentNodeBrief(BaseModel):
    id: str
    unit_id: str | None = Field(default=None, serialization_alias="unitId")
    code: str
    name: str
    description: str | None = None
    display_order: int = Field(serialization_alias="displayOrder")
    prerequisites: list[str] = []
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class CreateParentNodeRequest(BaseModel):
    id: str | None = Field(default=None, min_length=1, max_length=64,
                            description="留空後端產生 slug")
    unit_id: str | None = Field(
        default=None, validation_alias="unitId", serialization_alias="unitId",
    )
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1)
    description: str | None = None
    display_order: int | None = Field(
        default=None,
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )
    prerequisites: list[str] = []

    model_config = ConfigDict(populate_by_name=True)


class UpdateParentNodeRequest(BaseModel):
    unit_id: str | None = Field(
        default=None, validation_alias="unitId", serialization_alias="unitId",
    )
    code: str | None = Field(default=None, min_length=1, max_length=64)
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    display_order: int | None = Field(
        default=None,
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )
    prerequisites: list[str] | None = None

    model_config = ConfigDict(populate_by_name=True)


class ReorderItem(BaseModel):
    id: str
    display_order: int = Field(
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )

    model_config = ConfigDict(populate_by_name=True)


class BulkReorderRequest(BaseModel):
    """批次調整 display_order（拖曳結束時呼叫）。"""
    items: list[ReorderItem]
