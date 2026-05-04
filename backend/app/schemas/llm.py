"""LLM proxy Pydantic schemas. See spec-09."""
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """POST /api/llm/chat[/stream] body."""
    messages: list[ChatMessage] = Field(min_length=1)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1, le=8192, alias="maxTokens")
    stop: list[str] | None = None
    model: str | None = None  # 覆寫後端預設 model

    model_config = ConfigDict(populate_by_name=True)


class ChatUsage(BaseModel):
    prompt_tokens: int = Field(serialization_alias="promptTokens")
    completion_tokens: int = Field(serialization_alias="completionTokens")
    total_tokens: int = Field(serialization_alias="totalTokens")

    model_config = ConfigDict(populate_by_name=True)


class ChatResponse(BaseModel):
    content: str
    model: str
    finish_reason: str | None = Field(default=None, serialization_alias="finishReason")
    usage: ChatUsage | None = None
    raw: dict[str, Any] | None = None  # 預設不回傳；?include_raw=true 才帶

    model_config = ConfigDict(populate_by_name=True)
