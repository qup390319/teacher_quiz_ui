"""Auth-related Pydantic schemas."""
from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    account: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=255)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(alias="oldPassword", min_length=1)
    new_password: str = Field(alias="newPassword", min_length=6, max_length=32)

    model_config = ConfigDict(populate_by_name=True)


class CurrentUser(BaseModel):
    """Returned from /api/auth/me and /api/auth/login.

    `name`/`classId`/`seat` only filled when applicable.
    """
    id: str
    account: str
    role: str
    name: str | None = None
    class_id: str | None = Field(default=None, serialization_alias="classId")
    seat: int | None = None
    password_was_default: bool = Field(serialization_alias="passwordWasDefault")

    model_config = ConfigDict(populate_by_name=True)


class LoginResponse(BaseModel):
    user: CurrentUser


class OkResponse(BaseModel):
    ok: bool = True
    password_was_default: bool | None = Field(
        default=None, serialization_alias="passwordWasDefault",
    )

    model_config = ConfigDict(populate_by_name=True)
