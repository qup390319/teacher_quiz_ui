"""LLM service — OpenAI 主、vLLM 備援的 chat completions proxy。

兩者皆走 OpenAI 相容的 /chat/completions，但 payload 依供應商分別組：
  - reasoning（gpt-5*）：用 max_completion_tokens、不可送 temperature、可帶 reasoning_effort
  - legacy（vLLM / gpt-4o 等）：用 max_tokens + temperature

呼叫順序由 LLM_PRIMARY 決定；主供應商失敗時，若 LLM_FALLBACK_ENABLED 則自動改用另一個。
See spec-09 §6, spec-10 §6 (router /api/llm/*).
"""
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx

from app.config import settings
from app.schemas.llm import ChatMessage, ChatRequest, ChatResponse, ChatUsage

logger = logging.getLogger(__name__)


class LlmServiceError(Exception):
    """Raised when upstream LLM fails. Router should map to HTTP 502."""

    def __init__(self, message: str, *, status: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status = status
        self.body = body


@dataclass
class _Provider:
    name: str            # "openai" | "vllm"
    base_url: str
    model: str
    api_key: str
    style: str           # "reasoning" | "legacy"
    reasoning_effort: str | None = None


def _make_provider(name: str) -> _Provider | None:
    """Build a provider config from settings, or None if not fully configured."""
    if name == "openai":
        base = settings.OPENAI_BASE_URL.rstrip("/")
        model = settings.OPENAI_MODEL_NAME
        key = settings.openai_api_key  # resolved from file or env
        if not base or not model or not key:
            return None
        return _Provider(
            name="openai",
            base_url=base,
            model=model,
            api_key=key,
            style=settings.OPENAI_PARAM_STYLE,
            reasoning_effort=settings.OPENAI_REASONING_EFFORT or None,
        )
    if name == "vllm":
        base = settings.VLLM_BASE_URL.rstrip("/")
        model = settings.VLLM_MODEL_NAME
        key = settings.VLLM_API_KEY
        if not base or not model or not key:
            return None
        return _Provider(name="vllm", base_url=base, model=model, api_key=key, style="legacy")
    return None


def _provider_chain() -> list[_Provider]:
    """Ordered list of providers to try: primary first, then the other if fallback enabled."""
    primary = settings.LLM_PRIMARY if settings.LLM_PRIMARY in ("openai", "vllm") else "openai"
    order = [primary]
    if settings.LLM_FALLBACK_ENABLED:
        order += [n for n in ("openai", "vllm") if n != primary]
    chain: list[_Provider] = []
    for n in order:
        prov = _make_provider(n)
        if prov is None:
            if n == primary:
                # 主供應商沒設定 → 不要靜默跳過，明確警告（否則會默默用備援）
                logger.warning(
                    "LLM primary '%s' is NOT configured (missing key / base_url / model); "
                    "skipping it. Check OPENAI_*/VLLM_* env or the docker secret.", n,
                )
            continue
        chain.append(prov)
    if not chain:
        raise LlmServiceError(
            "No LLM provider configured (set OPENAI_* or VLLM_* in env / secrets)",
        )
    return chain


def _build_payload(req: ChatRequest, *, stream: bool, prov: _Provider) -> dict:
    payload: dict = {
        "model": req.model or prov.model,
        "messages": [{"role": m.role, "content": m.content} for m in req.messages],
        "stream": stream,
    }
    if prov.style == "reasoning":
        # gpt-5*：max_completion_tokens（含 reasoning tokens），temperature 不可送。
        req_max = req.max_tokens if req.max_tokens is not None else settings.LLM_DEFAULT_MAX_TOKENS
        payload["max_completion_tokens"] = max(req_max, settings.OPENAI_MIN_COMPLETION_TOKENS)
        if prov.reasoning_effort:
            payload["reasoning_effort"] = prov.reasoning_effort
        if req.stop:
            payload["stop"] = req.stop
    else:
        # legacy（vLLM / gpt-4o 等）
        payload["temperature"] = (
            req.temperature if req.temperature is not None else settings.LLM_DEFAULT_TEMPERATURE
        )
        payload["max_tokens"] = (
            req.max_tokens if req.max_tokens is not None else settings.LLM_DEFAULT_MAX_TOKENS
        )
        payload["stop"] = req.stop
    # 強制 JSON 輸出（OpenAI / vLLM 皆支援 OpenAI 相容的 response_format）。
    # 注意：json_object 模式要求 prompt 內含 "json" 字樣（追問 prompt 已含）。
    if req.response_format == "json_object":
        payload["response_format"] = {"type": "json_object"}
    return payload


async def _chat_once(prov: _Provider, req: ChatRequest, *, include_raw: bool) -> ChatResponse:
    """One non-streaming completion against a single provider."""
    payload = _build_payload(req, stream=False, prov=prov)
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=5.0)) as client:
        try:
            r = await client.post(
                f"{prov.base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {prov.api_key}"},
            )
        except httpx.HTTPError as exc:
            raise LlmServiceError(f"LLM connection failed ({prov.name}): {exc}") from exc

    if r.status_code >= 400:
        raise LlmServiceError(
            f"LLM upstream error ({prov.name} {r.status_code})",
            status=r.status_code,
            body=r.text[:500],
        )

    data = r.json()
    choice = (data.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    usage = data.get("usage")
    return ChatResponse(
        content=msg.get("content") or "",
        model=data.get("model") or prov.model,
        finish_reason=choice.get("finish_reason"),
        usage=ChatUsage(
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        ) if usage else None,
        raw=data if include_raw else None,
    )


async def chat(req: ChatRequest, *, include_raw: bool = False) -> ChatResponse:
    """One-shot completion. Tries providers in order; falls back on failure."""
    chain = _provider_chain()
    last_err: LlmServiceError | None = None
    for i, prov in enumerate(chain):
        try:
            return await _chat_once(prov, req, include_raw=include_raw)
        except LlmServiceError as exc:
            last_err = exc
            more = i + 1 < len(chain)
            logger.warning(
                "LLM provider '%s' failed: %s%s",
                prov.name, exc, "; falling back to next" if more else "; no more providers",
            )
    raise last_err or LlmServiceError("All LLM providers failed")


async def _stream_once(prov: _Provider, req: ChatRequest) -> AsyncIterator[str]:
    """Yields SSE strings for one provider. Raises before first yield if upstream rejects."""
    payload = _build_payload(req, stream=True, prov=prov)
    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
        try:
            async with client.stream(
                "POST",
                f"{prov.base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {prov.api_key}"},
            ) as r:
                if r.status_code >= 400:
                    body = (await r.aread()).decode("utf-8", "replace")
                    raise LlmServiceError(
                        f"LLM upstream stream error ({prov.name} {r.status_code})",
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
                        yield "data: " + json.dumps(
                            {"delta": "", "done": True, "finishReason": finish_reason},
                            ensure_ascii=False,
                        ) + "\n\n"
                        yield "data: [DONE]\n\n"
                        return
                    try:
                        chunk = json.loads(payload_str)
                    except ValueError:
                        continue
                    choice = (chunk.get("choices") or [{}])[0]
                    delta = (choice.get("delta") or {}).get("content") or ""
                    if choice.get("finish_reason"):
                        finish_reason = choice["finish_reason"]
                    if delta:
                        yield "data: " + json.dumps(
                            {"delta": delta, "done": False},
                            ensure_ascii=False,
                        ) + "\n\n"
                # upstream closed without [DONE]
                yield "data: " + json.dumps(
                    {"delta": "", "done": True, "finishReason": finish_reason},
                    ensure_ascii=False,
                ) + "\n\n"
                yield "data: [DONE]\n\n"
        except httpx.HTTPError as exc:
            raise LlmServiceError(f"LLM stream connection failed ({prov.name}): {exc}") from exc


async def chat_stream(req: ChatRequest) -> AsyncIterator[str]:
    """SSE streaming completion. Falls back to next provider only if the current one
    fails *before* emitting any chunk (mid-stream failures can't be cleanly retried)."""
    chain = _provider_chain()
    last_err: LlmServiceError | None = None
    for i, prov in enumerate(chain):
        started = False
        try:
            async for sse in _stream_once(prov, req):
                started = True
                yield sse
            return
        except LlmServiceError as exc:
            last_err = exc
            if started:
                logger.error("LLM stream '%s' failed mid-stream: %s", prov.name, exc)
                raise
            more = i + 1 < len(chain)
            logger.warning(
                "LLM stream '%s' failed before output: %s%s",
                prov.name, exc, "; trying next" if more else "; no more providers",
            )
    raise last_err or LlmServiceError("All LLM stream providers failed")


__all__ = ["ChatMessage", "LlmServiceError", "chat", "chat_stream"]
