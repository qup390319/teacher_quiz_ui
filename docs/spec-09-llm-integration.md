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

## 11. 迷思成因分析端點（Misconception Cause Analysis）

### POST /api/llm/analyze-cause

追問對話結束後，若學生被判定為 MISCONCEPTION，前端呼叫此端點分析成因。

**Request body:**

```json
{
  "conversationLog": [{"role": "ai"|"student", "content": "..."}],
  "misconceptionCode": "M02-1",
  "misconceptionLabel": "溶解即消失",
  "knowledgeNode": "溶解現象"
}
```

**Response:**

```json
{
  "causeIds": [5]
}
```

- `causeIds` 為 1-8 的整數陣列（對應 `misconceptionCauses.js` 的 8 大成因類別），通常 1-2 個
- 後端 service: `app/services/cause_analysis_service.py`
- 透過 `llm_service.chat()` 呼叫 vLLM，使用專門的 system prompt 讓 LLM 從 8 大成因中選擇
- LLM 不可用時回傳空陣列 `[]`，不阻擋流程

## 12. 治療對話 system prompt registry（2026-05-14 起）

情境治療對話（spec-08 §8B）走 `/api/llm/chat`，每題的 system prompt 統一登錄在前端 registry，便於日後擴充。

| 檔案 | 用途 |
|------|------|
| [src/data/treatmentBotPrompts.js](../src/data/treatmentBotPrompts.js) | 以 `${scenarioQuizId}#${questionIndex}` 為 key 的 prompt registry |
| [src/data/treatmentBotLlm.js](../src/data/treatmentBotLlm.js) | LLM-driven turn engine（buildMessages + JSON 解析 + 欄位 clamp） |
| [src/data/treatmentBot.js](../src/data/treatmentBot.js) | 對外入口 `runTreatmentTurn(state, msg)`；自動派遣 LLM ↔ mock |

### 12.1 目前已登錄的 prompt

| Key | 題目 | 對應節點 / 迷思 |
|-----|------|------------------|
| `scenario-002#2` | 飽和糖水甜度 Q2「再加 3 匙糖會不會更甜」 | INe-II-3-03 / M03-2 |

### 12.2 Prompt 結構（必含區段）

每個 prompt 必須包含：

1. 角色定位（「診斷型科學論證 AI 導師」、教學對象、教學法）
2. 說話方式 / 對話承接原則
3. 本題核心概念 + 固定情境
4. 圖表線索清單（可被 LLM 直接引用）
5. FSM 定義（phase 對 step 對 stage 的映射）
6. 每個 step（1~7）的目標、規則、可用提問
7. hintLevel 0~3 的範例
8. feedback 規則（8~25 字）
9. **【輸出格式（必須嚴格遵守）】** — 強制 JSON schema
10. step / stage 規則總結

### 12.3 與後端的關係

- 後端不持有 treatment prompt — `chat()` 只是純粹的 LLM proxy
- 任何題目的對話策略都在前端 registry 控制，不需要後端 deploy 就能改 prompt
- 缺點：prompt 與其他 system prompt 一樣會被夾帶到網路（**前端 bundle 仍可見**），但因為這是教學引導而非業務 secret，可接受
- 需登入（任何角色）

---

## 13. 診斷追問對話 prompt（followup，2026-05-14 起）

迷思診斷追問對話（spec-05 §2.2 第二層）也走 `/api/llm/chat`，但與治療對話分屬不同 prompt 體系。

### 13.1 檔案結構

| 檔案 | 用途 |
|------|------|
| [src/pages/student/followUp/followUpPrompts.js](../src/pages/student/followUp/followUpPrompts.js) | Shared SYSTEM_PROMPT_SKELETON（POE + 蘇格拉底 + chip 規則 + JSON schema）+ 12 個節點的 NODE_CONTEXT；`buildFollowUpSystemPrompt()` 動態組合 |
| [src/pages/student/followUp/followUpLlm.js](../src/pages/student/followUp/followUpLlm.js) | LLM driver；`runFollowUpTurnLlm(state, userMessage)` |
| [src/pages/student/followUp/followUpEngine.js](../src/pages/student/followUp/followUpEngine.js) | Async dispatcher；LLM 失敗時 fallback 到 rule-based 3 輪流程 |
| [src/pages/student/followUp/AIFollowUpPanel.jsx](../src/pages/student/followUp/AIFollowUpPanel.jsx) | UI；渲染 chips 按鈕 + textarea |

### 13.2 為什麼與治療對話分開

| 特性 | 治療對話 | 追問對話 |
|------|---------|---------|
| 觸發時機 | 學生選 scenario quiz 後 | 學生答完選擇題後 |
| 教學法 | Cognitive Apprenticeship + CER | POE + 蘇格拉底 + 成因追溯 |
| 對話長度 | 7 step（≈ 7~10 輪） | ≤ 8 輪 |
| 學生回覆方式 | 開放式長句（CER 訓練） | Chip 選項為主、長句為輔（國小生短答友善） |
| 主要產出 | CER restatement + 完成感 | finalDiagnosis（含 causeIds） |
| Prompt 載點 | per-(scenarioId, qIndex) | per-knowledgeNode（共 12 節點） |

### 13.3 Prompt 結構（shared skeleton + per-node injection）

shared skeleton（一份，所有 12 節點共用）：

1. 角色設定（不是老師，是好奇小科學家；不知道答案）
2. 教學對象限制（國小五年級短答模式列舉）
3. 絕對禁止（否定字眼 / 過早肯定 / 抽象 why / 專有名詞 / 一輪兩問）
4. POE 4 階段對話結構（belief → challenge → cause → final）
5. 8 大成因類別（與 backend `cause_analysis_service.py` 對齊）
6. **Chip 規則**（每輪 2~4 個選項，每個 ≤ 6 字，必含逃生口）
7. JSON 輸出 schema（強制無 markdown / 無多餘文字）
8. statusChange / reasoningQuality 推導規則

per-node injection（NODE_CONTEXT[nodeId]，12 份）：

- `coreTruth`：該節點的科學真相一句話
- `variants[]`：2~3 個 POE Observe 階段可丟的變體實驗
- `causeHints`：該節點常見的 1~3 個成因提示

### 13.4 LLM 輸出 JSON schema

```json
{
  "phase": "belief" | "challenge" | "cause" | "final",
  "round": 1-8,
  "assistantMessage": "string，1-2 句、≤ 60 字",
  "chips": ["string", "..."] | null,
  "feedback": "string | null，≤ 20 字",
  "finalDiagnosis": null | {
    "finalStatus": "CORRECT" | "MISCONCEPTION" | "UNCERTAIN",
    "misconceptionCode": "M02-1" | null,
    "reasoningQuality": "SOLID" | "PARTIAL" | "WEAK" | "GUESSING",
    "causeIds": [1-8],
    "causeEvidence": "string，學生哪段話顯示了該成因",
    "aiSummary": "string，給學生的最終回饋",
    "statusChange": { "from": "...", "to": "...",
      "changeType": "CONFIRMED" | "UPGRADED" | "DOWNGRADED" }
  }
}
```

### 13.5 Chip 渲染協定（前後端約定）

LLM 回應的 `chips` 欄位由 [AIFollowUpPanel.jsx](../src/pages/student/followUp/AIFollowUpPanel.jsx) 渲染：

- chips 為 string array，每個元素是一個按鈕文字（≤ 6 字推薦）
- 學生點擊 chip → 直接以該文字當作下一輪 user message 送回
- chips 與打字輸入並存：學生若覺得選項都不對，可自由打字
- final 階段 chips 必為 null
- chips < 2 個時前端視為無 chips，僅顯示 textarea

### 13.6 LLM 模式 vs Rule-based fallback

| 條件 | 走哪一邊 |
|------|---------|
| 節點在 `NODE_CONTEXT` 中（12 個官方節點） | LLM 模式 |
| 自訂迷思節點（教師自建，無 NODE_CONTEXT） | Rule-based |
| LLM 模式但 `/api/llm/chat` 失敗 | 自動 fallback Rule-based |
| LLM 模式但 JSON 解析失敗 | 自動 fallback Rule-based |

Fallback 邏輯在 `processStudentReply()` 內透明處理，呼叫端 (StudentQuiz.jsx) 不感知。

### 13.7 與成因分析端點的關係

LLM 模式下，POE prompt 已要求 LLM 在 `cause` 階段蒐集證據並在 `finalDiagnosis.causeIds` 中輸出。
StudentQuiz 偵測 `causeIds.length > 0` 時，**直接寫 DB**，不再呼叫 `/api/llm/analyze-cause`，省一次 LLM 推論。
僅 fallback 路徑或 LLM 模式但 `causeIds` 為空時，才會走原本的 `/api/llm/analyze-cause` 端點（§11）。

