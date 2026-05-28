"""Class / Student response schemas."""
from datetime import datetime
from typing import Literal

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
    school_year: int = Field(serialization_alias="schoolYear")
    semester: Literal["first", "second"]
    status: Literal["active", "archived"]
    archived_at: datetime | None = Field(default=None, serialization_alias="archivedAt")
    # 班級所屬教師 user_id（admin overview 用；teacher 端固定是自己，但仍會帶出來）
    teacher_id: str | None = Field(default=None, serialization_alias="teacherId")

    model_config = ConfigDict(populate_by_name=True)


class ClassDetail(ClassBrief):
    students: list[StudentBrief]


class CreateClassRequest(BaseModel):
    """POST /api/classes — server auto-generates the class id.

    ``school_year`` / ``semester`` default to the current term server-side if omitted
    (see ``app/utils/school_year.py``).
    """
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
    school_year: int | None = Field(
        default=None, ge=2000, le=2100,
        validation_alias="schoolYear", serialization_alias="schoolYear",
    )
    semester: Literal["first", "second"] | None = None

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
    school_year: int | None = Field(
        default=None, ge=2000, le=2100,
        validation_alias="schoolYear", serialization_alias="schoolYear",
    )
    semester: Literal["first", "second"] | None = None

    model_config = ConfigDict(populate_by_name=True)


class StudentInput(BaseModel):
    """Used by PUT /classes/{id}/students bulk replace."""
    name: str = Field(min_length=1, max_length=64)
    seat: int = Field(gt=0)
    # Optional account override; if omitted, server picks from existing or auto-generates
    account: str | None = None


class UpdateStudentsRequest(BaseModel):
    students: list[StudentInput]


class AdminCreateClassRequest(BaseModel):
    """POST /api/admin/classes — admin creates a class and assigns it to a teacher."""
    name: str = Field(min_length=1, max_length=64)
    grade: str = Field(min_length=1, max_length=16)
    subject: str = Field(min_length=1, max_length=32)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: str = Field(
        pattern=r"^#[0-9A-Fa-f]{6}$",
        validation_alias="textColor",
        serialization_alias="textColor",
    )
    teacher_id: str = Field(
        min_length=1,
        validation_alias="teacherId",
        serialization_alias="teacherId",
    )
    note: str | None = Field(default=None, max_length=200)
    school_year: int | None = Field(
        default=None, ge=2000, le=2100,
        validation_alias="schoolYear", serialization_alias="schoolYear",
    )
    semester: Literal["first", "second"] | None = None

    model_config = ConfigDict(populate_by_name=True)


class AddStudentRequest(BaseModel):
    """POST /api/admin/classes/:classId/students — add a single student."""
    name: str = Field(min_length=1, max_length=64)
    seat: int = Field(gt=0)

    model_config = ConfigDict(populate_by_name=True)
