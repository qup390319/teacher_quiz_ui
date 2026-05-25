"""Admin-only Pydantic schemas. See spec-13 §7.4 admin row."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AdminUserListItem(BaseModel):
    """Single row of /api/admin/users list. No plaintext password here."""
    id: str
    account: str
    role: str  # 'teacher' | 'student' | 'admin'
    name: str | None = None
    # Teacher-only roll-up: how many classes / students this teacher owns
    class_count: int | None = Field(default=None, serialization_alias="classCount")
    student_count: int | None = Field(default=None, serialization_alias="studentCount")
    # Student-only
    class_id: str | None = Field(default=None, serialization_alias="classId")
    class_name: str | None = Field(default=None, serialization_alias="className")
    seat: int | None = None
    # Account state
    is_active: bool = Field(serialization_alias="isActive")
    password_was_default: bool = Field(serialization_alias="passwordWasDefault")
    disabled_at: datetime | None = Field(default=None, serialization_alias="disabledAt")
    disabled_by: str | None = Field(default=None, serialization_alias="disabledBy")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminUserDetail(AdminUserListItem):
    """Single user fetched via /api/admin/users/{id}; includes plaintext password."""
    password: str  # plaintext — see spec-13


class CreateTeacherRequest(BaseModel):
    account: str = Field(min_length=3, max_length=64)
    name: str = Field(min_length=1, max_length=64)


class AdminPasswordResetResponse(BaseModel):
    ok: bool = True
    password: str  # the new plaintext (= account)


class AdminUserStatusResponse(BaseModel):
    ok: bool = True
    is_active: bool = Field(serialization_alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class AdminUsersListResponse(BaseModel):
    items: list[AdminUserListItem]
    total: int


# Query enum used by router signatures.
RoleFilter = Literal["teacher", "student", "admin"]
ActiveFilter = Literal["active", "disabled", "all"]
