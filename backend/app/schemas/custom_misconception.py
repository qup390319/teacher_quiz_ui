"""Custom misconception schemas (per-teacher, private). spec-04 §2.6."""
from pydantic import BaseModel, ConfigDict, Field


class CustomMisconceptionIO(BaseModel):
    id: str
    node_id: str = Field(serialization_alias="nodeId")
    label: str
    detail: str
    student_detail: str | None = Field(default=None, serialization_alias="studentDetail")
    confirm_question: str | None = Field(default=None, serialization_alias="confirmQuestion")
    created_at: str = Field(serialization_alias="createdAt")  # ISO date

    model_config = ConfigDict(populate_by_name=True)


class CreateCustomMisconceptionRequest(BaseModel):
    """POST body. teacher_id is read from auth, not the payload."""
    node_id: str = Field(min_length=1, max_length=32, alias="nodeId")
    label: str = Field(min_length=1, max_length=64)
    detail: str = Field(min_length=1)
    student_detail: str | None = Field(default=None, alias="studentDetail")
    confirm_question: str | None = Field(default=None, alias="confirmQuestion")

    model_config = ConfigDict(populate_by_name=True)
