"""Class / Student response schemas."""
from pydantic import BaseModel, ConfigDict, Field


class StudentBrief(BaseModel):
    """Student row in a class listing — does NOT include plaintext password."""
    id: str                          # = user_id = account
    name: str
    seat: int
    password_was_default: bool = Field(serialization_alias="passwordWasDefault")

    model_config = ConfigDict(populate_by_name=True)


class ClassBrief(BaseModel):
    id: str
    name: str
    grade: str
    subject: str
    color: str
    text_color: str = Field(serialization_alias="textColor")
    student_count: int = Field(serialization_alias="studentCount")
    note: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class ClassDetail(ClassBrief):
    students: list[StudentBrief]


class CreateClassRequest(BaseModel):
    """POST /api/classes — server auto-generates the class id."""
    name: str = Field(min_length=1, max_length=64)
    grade: str = Field(min_length=1, max_length=16)
    subject: str = Field(min_length=1, max_length=32)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: str = Field(
        pattern=r"^#[0-9A-Fa-f]{6}$",
        validation_alias="textColor",
        serialization_alias="textColor",
    )
    note: str | None = Field(default=None, max_length=200)

    model_config = ConfigDict(populate_by_name=True)


class UpdateClassRequest(BaseModel):
    """PATCH /api/classes/{id} — all fields optional; null clears `note`."""
    name: str | None = Field(default=None, min_length=1, max_length=64)
    grade: str | None = Field(default=None, min_length=1, max_length=16)
    subject: str | None = Field(default=None, min_length=1, max_length=32)
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: str | None = Field(
        default=None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        validation_alias="textColor",
        serialization_alias="textColor",
    )
    note: str | None = Field(default=None, max_length=200)

    model_config = ConfigDict(populate_by_name=True)


class StudentInput(BaseModel):
    """Used by PUT /classes/{id}/students bulk replace."""
    name: str = Field(min_length=1, max_length=64)
    seat: int = Field(gt=0)
    # Optional account override; if omitted, server picks from existing or auto-generates
    account: str | None = None


class UpdateStudentsRequest(BaseModel):
    students: list[StudentInput]
