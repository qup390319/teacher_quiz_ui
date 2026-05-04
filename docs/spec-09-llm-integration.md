# SPEC-09: LLM Integration / LLM 整合規格

> **P2 重大變更**：前端不再直接呼叫 LLM。所有對話一律透過後端 `/api/llm/*` 代理。
> 前端的 `src/llm/` 仍保留統一介面（`chat()` / `chatStream()`），呼叫端零變動。

## 1. 目標

提供前端「provider-agnostic 的對話介面」，呼叫端只 import `src/llm`，不需知道底層走哪一個服務。

**核心原則**：
- **Provider-agnostic API**：呼叫端只 import `src/llm`
- **後端 proxy（P2 起）**：前端唯一的 provider 是 `backend`，所有請求走 `/api/llm/chat` 或 `/api/llm/chat/stream`
- **支援串流**：保留 `chat()`（一次回覆）+ `chatStream()`（SSE 串流）兩種模式

## 2. 目錄結構（P2 後）

```
src/llm/
├── index.js                       # 對外入口：chat / chatStream / getProvider
├── config.js                      # 預設生成參數（temperature / maxTokens）
├── types.js                       # JSDoc 型別定義
└── providers/
    └── backendProvider.js         # P2 起唯一 provider：呼叫後端 /api/llm/*
```

> **P2 移除**：`providers/vllmProvider.js`（前端不再直連 vLLM；vLLM 改由後端 service 包裝）。

## 3. 環境變數（前端）

P2 後前端**不再需要任何 LLM 相關環境變數**。所有設定移到後端：

| 變數 | 必填 | 預設 | 說明 |
|------|------|------|------|
| `VITE_LLM_DEFAULT_TEMPERATURE` | 否 | `0.7` | 前端預設取樣溫度（後端可覆寫） |
| `VITE_LLM_DEFAULT_MAX_TOKENS` | 否 | `1024` | 前端預設最大 tokens |

> **已移除**：`VITE_LLM_PROVIDER` / `VITE_VLLM_*`（這些設定改到後端，見 spec-10 §3）。

## 4. 統一介面（型別契約）

定義於 `src/llm/types.js`（JSDoc）。**P2 後型別契約完全不變**——只是底層實作改成呼叫後端。

### 4.1 輸入：`ChatOptions`

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `messages` | `ChatMessage[]` | 是 | 對話歷史 |
| `temperature` | `number` | 否 | 預設讀 `VITE_LLM_DEFAULT_TEMPERATURE` |
| `maxTokens` | `number` | 否 | 預設讀 `VITE_LLM_DEFAULT_MAX_TOKENS` |
| `stop` | `string[]` | 否 | 停止序列 |
| `signal` | `AbortSignal` | 否 | 中斷請求 |
| `model` | `string` | 否 | 覆寫後端預設 model |

### 4.2 輸出：`ChatResponse`

同 P1，欄位不變（`content` / `model` / `finishReason` / `usage` / `raw`）。

### 4.3 串流輸出：`ChatStreamChunk`

同 P1，欄位不變（`delta` / `done` / `finishReason`）。

## 5. 對外 API

`src/llm/index.js` 匯出：

| API | 簽名 | 用途 |
|-----|------|------|
| `chat(options)` | `(ChatOptions) => Promise<ChatResponse>` | 一次取得完整回覆 |
| `chatStream(options)` | `(ChatOptions) => AsyncGenerator<ChatStreamChunk>` | SSE 串流 |
| `getProvider()` | `() => LLMProvider` | 取得 provider 實例（除錯用） |
| `LLM_PROVIDER` | `string` | 目前 provider 名稱（`'backend'`） |

**典型用法**（P2 後與 P1 完全相同）：

```js
import { chat, chatStream } from '@/llm';

const { content } = await chat({
  messages: [
    { role: 'system', content: '你是國小自然科老師。' },
    { role: 'user', content: '什麼是溶解？' },
  ],
});

for await (const chunk of chatStream({ messages })) {
  if (chunk.delta) appendToUi(chunk.delta);
}
```

## 6. backendProvider 實作細節

**檔案**：`src/llm/providers/backendProvider.js`

### 6.1 chat()
- 端點：`POST /api/llm/chat`
- 認證：HttpOnly cookie 自動帶（透過 `src/lib/api.js`）
- Body：`{ messages, temperature?, max_tokens?, stop?, model? }`
- 回傳：`{ content, model, finish_reason, usage, raw }` → 對應到 `ChatResponse`

### 6.2 chatStream()
- 端點：`POST /api/llm/chat/stream`
- 用 `fetch` + `ReadableStream` 解析 SSE
- 後端 SSE 格式：每事件 `data: {"delta":"..."}\n\n`，最後 `data: [DONE]\n\n`
- AbortSignal 透過 fetch 第二參數傳入

### 6.3 錯誤處理
- 401 → 拋 `ApiError`，呼叫端應導回登入
- 502 → 後端轉發 vLLM 失敗，拋 `ApiError`，UI 顯示「對話服務暫時無法使用」
- 其他 4xx/5xx → 拋 `ApiError`

## 7. 後端對應端點

詳見 spec-10 §6。

| 端點 | 方法 | 用途 |
|------|------|------|
| `POST /api/llm/chat` | 一次回覆 | N3 / N4 / N5 對話的單次模式 |
| `POST /api/llm/chat/stream` | SSE 串流 | N3 / N4 / N5 對話的打字機模式 |

後端 service：`backend/app/services/llm_service.py` 用 `httpx.AsyncClient` 包 vLLM `/chat/completions`。

## 8. 擴充新後端 LLM 服務

P2 起前端不再需要為了換 LLM 而改 code。換 LLM 只需動後端：

1. 後端 `llm_service.py` 改成呼叫新服務（OpenAI / Anthropic / Ollama 等）
2. 前端零變動

## 9. 禁止事項

- **禁止前端直接呼叫 vLLM / 任何 LLM 服務**（一律走後端 proxy）
- **禁止把 LLM 服務的 endpoint / api key 加 `VITE_` 前綴**（會被打包進前端 bundle）
- 禁止在 `src/llm/` 之外的程式碼用 `fetch('/api/llm/...')`（一律 import `chat` / `chatStream`）
- 禁止 backendProvider 偏離 §4 型別契約

## 10. 與 RAGFlow 的關係

RAGFlow（spec-12）用於「檢索文獻 + 生成」場景（N1 / N2 / N6），**不走 `src/llm/`**。
- N1 / N2 / N6 → 呼叫 `/api/ai/*`（後端 service 內部呼叫 RAGFlow agent）
- N3 / N4 / N5 → 呼叫 `/api/llm/*`（後端 service 內部呼叫 vLLM）

兩條路徑完全獨立，前端 import 路徑也不同：
- LLM 對話：`import { chat, chatStream } from '@/llm'`
- RAGFlow 任務：`import { api } from '@/lib/api'` 後直接 `api.post('/ai/distractor-suggest', ...)`
