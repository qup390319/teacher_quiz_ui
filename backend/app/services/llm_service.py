"""LLM service — proxies vLLM (OpenAI-compatible) chat completions.

See spec-09 §6, spec-10 §6 (router /api/llm/*).
"""
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.schemas.llm import ChatMessage, ChatRequest, ChatResponse, ChatUsage


class LlmServiceError(Exception):
    """Raised when upstream LLM fails. Router should map to HTTP 502."""

    def __init__(self, message: str, *, status: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status = status
        self.body = body


def _ensure_configured() -> tuple[str, str, str]:
    """Validate required env vars are set, return (base_url, model, api_key)."""
    base = settings.VLLM_BASE_URL.rstrip("/")
    model = settings.VLLM_MODEL_NAME
    api_key = settings.VLLM_API_KEY
    if not base or not model or not api_key:
        raise LlmServiceError(
            "LLM service not configured (set VLLM_BASE_URL / VLLM_MODEL_NAME / VLLM_API_KEY)",
        )
    return base, model, api_key


def _build_payload(req: ChatRequest, *, stream: bool, fallback_model: str) -> dict:
    return {
        "model": req.model or fallback_model,
        "messages": [{"role": m.role, "content": m.content} for m in req.messages],
        "temperature": req.temperature if req.temperature is not None else settings.LLM_DEFAULT_TEMPERATURE,
        "max_tokens": req.max_tokens if req.max_tokens is not None else settings.LLM_DEFAULT_MAX_TOKENS,
        "stop": req.stop,
        "stream": stream,
    }


async def chat(req: ChatRequest, *, include_raw: bool = False) -> ChatResponse:
    """One-shot completion (non-streaming)."""
    base, model, api_key = _ensure_configured()
    payload = _build_payload(req, stream=False, fallback_model=model)

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=5.0)) as client:
        try:
            r = await client.post(
                f"{base}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        except httpx.HTTPError as exc:
            raise LlmServiceError(f"LLM connection failed: {exc}") from exc

    if r.status_code >= 400:
        raise LlmServiceError(
            f"LLM upstream error ({r.status_code})",
            status=r.status_code,
            body=r.text[:500],
        )

    data = r.json()
    choice = (data.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    usage = data.get("usage")
    return ChatResponse(
        content=msg.get("content") or "",
        model=data.get("model") or model,
        finish_reason=choice.get("finish_reason"),
        usage=ChatUsage(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
            total_tokens=usage["total_tokens"],
        ) if usage else None,
        raw=data if include_raw else None,
    )


async def chat_stream(req: ChatRequest) -> AsyncIterator[str]:
    """Yields SSE-formatted strings: 'data: {...}\\n\\n' per chunk + final 'data: [DONE]\\n\\n'.

    Each delta is wrapped as: data: {"delta": "...", "done": false}
    Last event before [DONE] carries done=true with finishReason.
    """
    base, model, api_key = _ensure_configured()
    payload = _build_payload(req, stream=True, fallback_model=model)

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
        try:
            async with client.stream(
                "POST",
                f"{base}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            ) as r:
                if r.status_code >= 400:
                    body = (await r.aread()).decode("utf-8", "replace")
                    raise LlmServiceError(
                        f"LLM upstream stream error ({r.status_code})",
                        status=r.status_code,
                        body=body[:500],
                    )

                finish_reason: str | None = None
                async for raw_line in r.aiter_lines():
                    if not raw_line:
                        continue
                    line = raw_line.strip()
                    if not line.startswith("data:"):
                        continue
                    payload_str = line[5:].strip()
                    if payload_str == "[DONE]":
                        # final chunk: signal done with finishReason
                        import json as _json
                        yield "data: " + _json.dumps(
                            {"delta": "", "done": True, "finishReason": finish_reason},
                            ensure_ascii=False,
                        ) + "\n\n"
                        yield "data: [DONE]\n\n"
                        return
                    try:
                        import json as _json
                        chunk = _json.loads(payload_str)
                    except ValueError:
                        continue
                    choice = (chunk.get("choices") or [{}])[0]
                    delta = (choice.get("delta") or {}).get("content") or ""
                    if choice.get("finish_reason"):
                        finish_reason = choice["finish_reason"]
                    if delta:
                        import json as _json
                        yield "data: " + _json.dumps(
                            {"delta": delta, "done": False},
                            ensure_ascii=False,
                        ) + "\n\n"
                # If upstream closed without [DONE], emit final
                import json as _json
                yield "data: " + _json.dumps(
                    {"delta": "", "done": True, "finishReason": finish_reason},
                    ensure_ascii=False,
                ) + "\n\n"
                yield "data: [DONE]\n\n"
        except httpx.HTTPError as exc:
            raise LlmServiceError(f"LLM stream connection failed: {exc}") from exc


__all__ = ["ChatMessage", "LlmServiceError", "chat", "chat_stream"]
