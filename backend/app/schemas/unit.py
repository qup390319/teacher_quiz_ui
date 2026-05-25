"""Unit-related Pydantic schemas (W4). See spec-02 §3.7 / spec-11 §3.17."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GradeBand = Literal["lower", "middle", "upper"]
UnitStatus = Literal["active", "archived"]


class UnitBrief(BaseModel):
    id: str
    code: str
    name: str
    grade_band: GradeBand = Field(serialization_alias="gradeBand")
    description: str | None = None
    display_order: int = Field(serialization_alias="displayOrder")
    status: UnitStatus
    is_system_current: bool = Field(serialization_alias="isSystemCurrent")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class CreateUnitRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    grade_band: GradeBand = Field(validation_alias="gradeBand", serialization_alias="gradeBand")
    code: str | None = Field(
        default=None, max_length=64, pattern=r"^[a-z0-9-]+$",
        description="留空後端會由 name 自動產生 slug",
    )
    description: str | None = Field(default=None, max_length=2000)
    display_order: int | None = Field(
        default=None,
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )

    model_config = ConfigDict(populate_by_name=True)


class UpdateUnitRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    grade_band: GradeBand | None = Field(
        default=None, validation_alias="gradeBand", serialization_alias="gradeBand",
    )
    description: str | None = Field(default=None, max_length=2000)
    display_order: int | None = Field(
        default=None,
        validation_alias="displayOrder", serialization_alias="displayOrder",
    )

    model_config = ConfigDict(populate_by_name=True)
