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
| `POST /api/llm/chat` | 一次回覆 | N3 對話的單次模式（診斷追問） |
| `POST /api/llm/chat/stream` | SSE 串流 | N3 對話的打字機模式（診斷追問） |

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

## 9.5 使用者可見的 AI 標記（D7）

教師端側邊欄與功能入口統一以 `<AIBadge>` 元件（spec-03 §2.1）標示「此功能由 AI 協助」，回應教授「sidebar 看不到哪裡有 AI」回饋。對應關係：

| 側邊欄項目 | 對應 AI 端點 / 服務 | tooltip 描述 |
|---|---|---|
| 診斷題組編輯（`/teacher/quizzes`） | RAGFlow N6（`/api/ai/distractor-suggest` 等） | 出題輔助：RAGFlow 從教材檢索並建議題目 |
| 診斷儀表板（dashboard 群） | LLM N1/N2 摘要 | AI 報告摘要：LLM 彙整班級表現重點 |
| 診斷對話紀錄（`/teacher/diagnosis-logs`） | LLM N3（POE 追問） | AI 追問：LLM 根據學生作答產生 POE 追問 |

> **不採用** sidebar 底部「AI 範圍說明頁」或「AI 圖例 footer」（與使用者協作後確認），保持側邊欄精簡，AI 標記直接附在項目右側即可。

## 10. 與 RAGFlow 的關係

RAGFlow（spec-12）用於「檢索文獻 + 生成」場景（N1 / N2 / N6），**不走 `src/llm/`**。
- N1 / N2 / N6 → 呼叫 `/api/ai/*`（後端 service 內部呼叫 RAGFlow agent）
- N3 → 呼叫 `/api/llm/*`（後端 service 內部呼叫 vLLM）

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

## 12. 診斷追問對話 prompt（followup，2026-05-14 起）

迷思診斷追問對話（spec-05 §2.2 第二層）走 `/api/llm/chat`，採 POE + 蘇格拉底 + 成因追溯體系。

### 12.1 檔案結構

| 檔案 | 用途 |
|------|------|
| [src/pages/student/followUp/followUpPrompts.js](../src/pages/student/followUp/followUpPrompts.js) | Shared SYSTEM_PROMPT_SKELETON（POE + 蘇格拉底 + chip 規則 + JSON schema）+ 12 個節點的 NODE_CONTEXT；`buildFollowUpSystemPrompt()` 動態組合 |
| [src/pages/student/followUp/followUpLlm.js](../src/pages/student/followUp/followUpLlm.js) | LLM driver；`runFollowUpTurnLlm(state, userMessage)` |
| [src/pages/student/followUp/followUpEngine.js](../src/pages/student/followUp/followUpEngine.js) | Async dispatcher；LLM 失敗時 fallback 到 rule-based 3 輪流程 |
| [src/pages/student/followUp/AIFollowUpPanel.jsx](../src/pages/student/followUp/AIFollowUpPanel.jsx) | UI；渲染 chips 按鈕 + textarea |

### 12.2 追問對話特性

| 特性 | 追問對話 |
|------|---------|
| 觸發時機 | 學生答完選擇題後 |
| 教學法 | POE + 蘇格拉底 + 成因追溯 |
| 對話長度 | ≤ 8 輪 |
| 學生回覆方式 | Chip 選項為主、長句為輔（國小生短答友善） |
| 主要產出 | finalDiagnosis（含 causeIds） |
| Prompt 載點 | per-knowledgeNode（共 12 節點） |

### 12.3 Prompt 結構（shared skeleton + per-node injection）

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

### 12.4 LLM 輸出 JSON schema

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
    "errorType": "EXPLANATION" | "DEFINITION" | "OBSERVATION" | null,
    "causeIds": [1-8],
    "causeEvidence": "string，學生哪段話顯示了該成因",
    "aiSummary": "string，給學生的最終回饋",
    "statusChange": { "from": "...", "to": "...",
      "changeType": "CONFIRMED" | "UPGRADED" | "DOWNGRADED" }
  }
}
```

### 12.4a errorType 三類分類規則（2026-06-06 新增）

LLM 在 `phase=final` 輸出 `finalDiagnosis.errorType`，依學生在追問對話中**答錯的主導方向**選一類；無法判讀回 `null`（前端顯示「未分類」，教師可手動覆寫）。三類互斥，請只選一個主導。

| errorType | 學生錯在哪 | 對話辨識訊號（節錄） | 範例（水溶液） |
|---|---|---|---|
| `EXPLANATION` 解釋型 | 對**現象的因果機制**解釋錯誤；不是不知道名詞，而是把「為什麼會這樣」想偏 | 學生講得出名詞、也描述得出現象，但**「因為…所以…」推因錯**；連續問「為什麼」會出現邏輯瑕疵 | 「攪拌能溶更多糖 → 因為攪拌把糖打碎了」（把溶解誤解為破壞） |
| `DEFINITION` 定義型 | 對**科學名詞、概念分類、判準**理解錯；卡在名詞定義或界線 | 學生用**字面意義 / 日常語意**詮釋科學名詞；混淆相近詞（溶化 vs 融化、酸 vs 酸味） | 「飽和溶液＝很濃」、「酸性＝嚐起來酸」、「水溶液一定要透明」 |
| `OBSERVATION` 觀察型 | 對**觀察到的現象、實驗結果**描述或判讀失準 | 學生對「看到了什麼 / 沒看到什麼」**描述錯**；用單一感官（眼/舌/鼻）下結論 | 「攪拌後看不到糖＝糖消失」、「試紙沒變色＝中性」、「沒味道＝中性」 |

判讀優先序（同題若兼有多類訊號時）：
1. **OBSERVATION** 優先於 EXPLANATION——觀察錯了，後面的解釋都建立在錯誤事實上，矯正觀察是上游。
2. **DEFINITION** 優先於 EXPLANATION——名詞理解錯時，無論怎麼解釋都偏；先校正定義。
3. 兩個都不明顯，但因果推論明顯偏 → **EXPLANATION**。
4. 都無法判讀（例如學生整段「不知道」、對話過短）→ `null`。

注意：
- `finalStatus = "CORRECT"` 時 `errorType` 必為 `null`（沒有「答錯方向」可言）。
- 自訂迷思（無 LLM prompt）走 rule-based fallback → `errorType` 一律 `null`，由教師端覆寫。

### 12.5 Chip 渲染協定（前後端約定）

LLM 回應的 `chips` 欄位由 [AIFollowUpPanel.jsx](../src/pages/student/followUp/AIFollowUpPanel.jsx) 渲染：

- chips 為 string array，每個元素是一個按鈕文字（≤ 6 字推薦）
- 學生點擊 chip → 直接以該文字當作下一輪 user message 送回
- chips 與打字輸入並存：學生若覺得選項都不對，可自由打字
- final 階段 chips 必為 null
- chips < 2 個時前端視為無 chips，僅顯示 textarea

### 12.6 LLM 模式 vs Rule-based fallback

| 條件 | 走哪一邊 |
|------|---------|
| 節點在 `NODE_CONTEXT` 中（12 個官方節點） | LLM 模式 |
| 自訂迷思節點（教師自建，無 NODE_CONTEXT） | Rule-based |
| LLM 模式但 `/api/llm/chat` 失敗 | 自動 fallback Rule-based |
| LLM 模式但 JSON 解析失敗 | 自動 fallback Rule-based |

Fallback 邏輯在 `processStudentReply()` 內透明處理，呼叫端 (StudentQuiz.jsx) 不感知。

### 12.7 與成因分析端點的關係

LLM 模式下，POE prompt 已要求 LLM 在 `cause` 階段蒐集證據並在 `finalDiagnosis.causeIds` 中輸出。
StudentQuiz 偵測 `causeIds.length > 0` 時，**直接寫 DB**，不再呼叫 `/api/llm/analyze-cause`，省一次 LLM 推論。
僅 fallback 路徑或 LLM 模式但 `causeIds` 為空時，才會走原本的 `/api/llm/analyze-cause` 端點（§11）。

---

## 13. 適性派題 AI 端點（Adaptive AI Endpoints）

教師在出題介面中，可透過以下兩個 AI 端點輔助產生題目內容。兩者皆掛載在 `/api/adaptive/` router，透過後端 `llm_service.chat()` 呼叫 vLLM（與 §7 同一條 proxy 路徑），僅限教師角色 (`require_teacher`)。

### 13.1 POST /api/adaptive/polish-stem — AI 潤飾題幹

教師輸入原始題幹後，AI 將題幹改寫為國小五年級學生能清楚理解的版本。

**Request body:**

```json
{
  "stem": "原始題幹文字",
  "nodeId": "INe-Ⅱ-3-03",
  "nodeName": "攪拌與溶解速度"
}
```

**Response:**

```json
{
  "polished": "潤飾後的題幹文字"
}
```

**System prompt 要點：**
1. 保留原意和科學正確性
2. 使用國小五年級能理解的用詞
3. 句子簡潔，避免過長複合句
4. 情境描述更生動具體
5. 只回傳潤飾後的文字，不附加說明

**參數：** `temperature=0.7`、`max_tokens=512`

### 13.2 POST /api/adaptive/suggest-options — AI 產生選項

根據題幹與該節點的迷思概念，AI 產生 4 個選項（1 正確 + 3 干擾）。

**Request body:**

```json
{
  "stem": "題幹文字",
  "nodeId": "INe-Ⅱ-3-03",
  "nodeName": "攪拌與溶解速度",
  "misconceptions": [
    {"id": "M03-1", "label": "…", "detail": "…"},
    {"id": "M03-2", "label": "…", "detail": "…"},
    {"id": "M03-3", "label": "…", "detail": "…"}
  ]
}
```

**Response:**

```json
{
  "options": [
    {"tag": "A", "content": "選項文字", "diagnosis": "CORRECT"},
    {"tag": "B", "content": "選項文字", "diagnosis": "M03-1"},
    {"tag": "C", "content": "選項文字", "diagnosis": "M03-2"},
    {"tag": "D", "content": "選項文字", "diagnosis": "M03-3"}
  ]
}
```

**System prompt 要點：**
1. 正確答案必須科學正確且清楚
2. 干擾選項貼近國小學生常見錯誤想法
3. 每個選項 15-30 字，長度相近
4. `diagnosis` 欄位：正確選項填 `CORRECT`，干擾選項填對應迷思編號
5. 正確答案隨機放在 A~D 任一位置

**參數：** `temperature=0.8`、`max_tokens=1024`

**JSON 解析：** 後端以 regex 提取回應中的 JSON 陣列（`[...]`），解析失敗回 502 `LLM_PARSE_ERROR`。

### 13.3 與其他 AI 路徑的關係

| 路徑 | Router | 用途 | 底層服務 |
|------|--------|------|---------|
| `/api/llm/chat` | llm | N3/N4/N5 對話 | `llm_service.chat()` → vLLM |
| `/api/llm/analyze-cause` | llm | 迷思成因分析 | `cause_analysis_service` → vLLM |
| `/api/ai/distractor-suggest` | ai | N6 RAGFlow 出題輔助 | `ragflow_service` → RAGFlow |
| `/api/adaptive/polish-stem` | adaptive | AI 潤飾題幹 | `llm_service.chat()` → vLLM |
| `/api/adaptive/suggest-options` | adaptive | AI 產生選項 | `llm_service.chat()` → vLLM |

`polish-stem` 與 `suggest-options` 複用既有的 `llm_service.chat()`，不引入新的外部依賴。與 RAGFlow 的 `distractor-suggest`（N6）互補：N6 從文獻檢索產生干擾選項建議，adaptive 端點則由 LLM 直接根據迷思概念生成完整選項組。

