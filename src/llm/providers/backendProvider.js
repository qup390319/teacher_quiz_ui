/**
 * Backend Provider — P2 起的唯一 LLM provider。
 *
 * 所有對話走後端 /api/llm/*。後端再代理到 vLLM（或未來其他服務）。
 * 對外仍實作 spec-09 的 LLMProvider 契約：name / chat / chatStream。
 *
 * 端點：
 *   POST /api/llm/chat                   一次回覆
 *   POST /api/llm/chat/stream            SSE 串流（每事件 data: {"delta":"...", "done":false}）
 */

import { DEFAULT_GENERATION } from '../config.js';

const PROVIDER_NAME = 'backend';
const BASE = '/api/llm';

function buildBody({ messages, temperature, maxTokens, stop, model }) {
  return JSON.stringify({
    messages,
    temperature: temperature ?? DEFAULT_GENERATION.temperature,
    maxTokens: maxTokens ?? DEFAULT_GENERATION.maxTokens,
    stop,
    model,
  });
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    return text || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function createBackendProvider() {
  async function chat(options) {
    const { messages, temperature, maxTokens, stop, signal, model } = options;
    const response = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: buildBody({ messages, temperature, maxTokens, stop, model }),
      signal,
    });

    if (!response.ok) {
      const detail = await readErrorBody(response);
      throw new Error(`[LLM] 請求失敗 (${response.status})：${detail}`);
    }

    const data = await response.json();
    return {
      content: data.content ?? '',
      model: data.model,
      finishReason: data.finishReason,
      usage: data.usage,
      raw: data,
    };
  }

  async function* chatStream(options) {
    const { messages, temperature, maxTokens, stop, signal, model } = options;
    const response = await fetch(`${BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: buildBody({ messages, temperature, maxTokens, stop, model }),
      signal,
    });

    if (!response.ok) {
      const detail = await readErrorBody(response);
      throw new Error(`[LLM] 串流請求失敗 (${response.status})：${detail}`);
    }
    if (!response.body) {
      throw new Error('[LLM] 回應沒有 body，無法讀取串流');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finishReason;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: events separated by \n\n, each event line starts with "data: "
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            yield { delta: '', done: true, finishReason };
            return;
          }
          try {
            const json = JSON.parse(payload);
            if (json.error) {
              throw new Error(`[LLM] ${json.error}: ${json.message || ''}`);
            }
            if (json.finishReason) finishReason = json.finishReason;
            if (json.delta) yield { delta: json.delta, done: false };
            if (json.done) yield { delta: '', done: true, finishReason };
          } catch (err) {
            // 若是 JSON parse 失敗就跳過該 chunk；其他錯誤直接拋出
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }
      yield { delta: '', done: true, finishReason };
    } finally {
      reader.releaseLock?.();
    }
  }

  return { name: PROVIDER_NAME, chat, chatStream };
}

export default createBackendProvider;
