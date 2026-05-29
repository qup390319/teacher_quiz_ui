"""ClassCategory request / response schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClassCategoryRead(BaseModel):
    id: str
    name: str
    sort_order: int = Field(serialization_alias="sortOrder")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class CreateClassCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class UpdateClassCategoryRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)


class ReorderClassCategoriesRequest(BaseModel):
    """PUT /api/class-categories/reorder — list of ids in desired order."""
    ids: list[str]
