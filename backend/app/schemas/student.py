"""Student-related Pydantic schemas."""
from pydantic import BaseModel, ConfigDict, Field


class StudentDetail(BaseModel):
    """Returned by /api/students/{id} — includes plaintext password (teacher only)."""
    id: str
    account: str
    name: str
    seat: int
    class_id: str = Field(serialization_alias="classId")
    password: str  # plaintext — see spec-13
    password_was_default: bool = Field(serialization_alias="passwordWasDefault")

    model_config = ConfigDict(populate_by_name=True)


class ResetPasswordResponse(BaseModel):
    ok: bool = True
    password: str  # the new plaintext (= account)
