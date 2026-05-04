# SPEC-12: RAGFlow Integration / RAGFlow 整合規格

> 本文件定義 SciLens 後端與 RAGFlow Agent 的整合方式。
> 對應 workflow.md 的 N1（全年級摘要）、N2（單班摘要）、N6（出題輔助）三個節點。
> P2 階段先實作 N6；N1 / N2 於 P3 接上。

---

## 1. 角色與定位

- RAGFlow 在本系統中扮演「**水溶液迷思概念研究文獻知識庫**」的檢索與生成入口。
- 所有呼叫**只由後端發起**（key 不暴露於前端 bundle）。
- 前端只看到後端組裝好的 JSON（建議文字 + 引用），不關心是哪一家 RAG 服務。

---

## 2. 連線參數（從環境變數讀取）

| 變數 | 範例 | 說明 |
|------|------|------|
| `RAGFLOW_ENDPOINT` | `https://ragflow-thesisflow.hsueh.tw` | RAGFlow 服務根 URL |
| `RAGFLOW_AGENT_ID` | `5f5cc79e3afb11f1b0be26501d5adb82` | 我們專用 agent 的 ID |
| `RAGFLOW_API_KEY` | `ragflow-...` | API key（僅後端使用） |

> 對應 spec-13 §環境變數。

---

## 3. 知識庫內容

RAGFlow agent 已掛載以下三份文件作為檢索來源：

| 文件 | 內容類型 | 條目數 |
|------|----------|--------|
| 水溶液迷思概念整理.docx | 一般整理（教科書例 + 研究者描述） | 12 條 |
| 水溶液迷思概念整理_國小學童研究.docx | 國小學童研究（含原始文獻引用） | 12 條 |
| 水溶液迷思概念整理_後設研究.docx | 後設研究（跨主題綜整） | 23 條 |

每筆迷思皆附原始文獻引用（如 Driver 1985、Ebenezer & Erickson 1996、陳淮璋 2002 等）。

---

## 4. RAGFlow HTTP API 對接

依 https://ragflow.io/docs/http_api_reference#converse-with-agent

### 4.1 建立 session

```
POST {RAGFLOW_ENDPOINT}/api/v1/agents/{RAGFLOW_AGENT_ID}/sessions
Authorization: Bearer {RAGFLOW_API_KEY}
Content-Type: application/json

{}
```

回傳：
```json
{
  "code": 0,
  "data": {
    "id": "<session_id>",
    "agent_id": "...",
    "messages": [...],
    "source": "agent"
  }
}
```

### 4.2 送出對話

```
POST {RAGFLOW_ENDPOINT}/api/v1/agents/{RAGFLOW_AGENT_ID}/completions
Authorization: Bearer {RAGFLOW_API_KEY}
Content-Type: application/json

{
  "session_id": "<session_id>",
  "question": "請列出文獻中針對 INe-II-3-02 / M02-1 的學生真實說法 3 條，並附引用。",
  "stream": false
}
```

回傳（簡化）：
```json
{
  "code": 0,
  "data": {
    "answer": "1. 學生看不見溶解後的食鹽，認為是溶質消失不見。\n2. ...",
    "reference": {
      "doc_aggs": [
        { "doc_name": "水溶液迷思概念整理_國小學童研究.docx", "count": 2 }
      ],
      "chunks": [
        {
          "content": "...",
          "document_name": "...",
          "document_id": "...",
          "image_id": "...",
          "positions": [...]
        }
      ]
    },
    "session_id": "<session_id>"
  }
}
```

> **錯誤處理**：`code != 0` 視為失敗，後端回 502 並在 message 帶 RAGFlow 的 message 欄位。

### 4.3 串流（spec 預留，目前不用）

`stream=true` 會以 SSE 回傳逐字 chunk。N6 / N1 / N2 都用一次性回覆即可，**不開串流**。

---

## 5. 後端 Service 介面

**檔案**：`backend/app/services/ragflow_service.py`

```python
async def create_session() -> str:
    """新建一個 agent session，回傳 session_id。"""

async def converse(session_id: str, question: str) -> RagflowAnswer:
    """對既有 session 發送問題，回傳結構化結果。"""

@dataclass
class RagflowAnswer:
    answer: str                    # 主要回答文字
    citations: list[RagflowCitation]
    raw: dict                      # 原始 RAGFlow 回應，除錯用

@dataclass
class RagflowCitation:
    document_name: str
    snippet: str | None            # 文獻節錄
    document_id: str | None
```

### 5.1 重試與超時

- HTTP 超時：**connect 5s、read 30s**（RAGFlow 回應較慢時可拉長）
- 重試：失敗一次（連線 / 5xx）即重試 1 次，間隔 1s
- 兩次都失敗 → 拋 `RagflowError`（router 轉 502）

### 5.2 連線方式

`httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0))`，每次請求建立並關閉（避免長 keep-alive 占資源）。

---

## 6. Session 策略

| 節點 | 策略 | 理由 |
|------|------|------|
| **N6 出題輔助** | 教師備課時維持同一 session 連續詢問（前端 cache `ragflowSessionId`） | 教師可能對同一題追問「再給 3 條」「換更口語的版本」，連續 session 可保留上下文 |
| **N1 全年級摘要**（P3） | 每次摘要建一次性 session | 跨次摘要無共用上下文 |
| **N2 單班摘要**（P3） | 每次摘要建一次性 session | 同上 |

**前端責任**：N6 popover 開啟時，第一次呼叫不帶 `sessionId`，後端建 session 並回傳；後續呼叫帶上 `sessionId` 繼續對話。Popover 關閉時可丟棄 sessionId（後端 session 自然過期）。

---

## 7. N6 出題輔助：完整對接

### 7.1 後端 endpoint

```
POST /api/ai/distractor-suggest
Authorization: scilens_session cookie (require_teacher)
Content-Type: application/json

Request:
{
  "nodeId": "INe-II-3-02",
  "nodeName": "溶解現象（看不見與沉澱）",
  "misconceptionId": "M02-1",                 // 必填
  "misconceptionLabel": "溶解後物質消失了",      // 由前端從 knowledgeGraph 帶入
  "misconceptionDetail": "溶解後物質會消失不見，不再存在於水中",  // 由前端帶入
  "currentText": "（教師目前已輸入的選項文字，可空字串）",
  "ragflowSessionId": null                     // 第一次為 null，後續帶上
}

> **設計選擇**：node / misconception 的可讀文字由前端帶入，避免後端複製一份知識圖譜（spec-04 中的 knowledgeGraph 仍是前端唯一真理來源；P3 後若搬到後端，再改為後端內查）。

Response 200:
{
  "suggestions": [
    "我覺得糖溶在水裡之後就消失了",
    "因為看不到糖，所以糖已經不見了",
    "鹽溶於水後就變成水的一部分了"
  ],
  "citations": [
    {
      "documentName": "水溶液迷思概念整理_國小學童研究.docx",
      "snippet": "學生主要從外觀來描述溶解過程，且不具守恆概念...",
      "page": "p.41"                // optional，從 RAGFlow content 抽出（best-effort）
    }
  ],
  "ragflowSessionId": "...",
  "raw": null                       // 預設不回傳，除錯模式才開
}

Response 502:
{
  "detail": "RAGFLOW_UNAVAILABLE",
  "message": "RAGFlow 服務暫時無法回應，請稍後再試"
}

Response 403:
{
  "detail": "TEACHER_ONLY",
  "message": "此功能僅限教師使用"
}
```

### 7.2 後端組裝給 RAGFlow 的 prompt

`app/services/ai_service.py` 中 `build_distractor_query()`：

```
請以「國小五年級學生」的口吻，列出 3 條符合下列迷思的真實學生說法（每條一行，不要編號）：

知識節點：{node_id}（{node_name}）
目標迷思：{misconception_id}（{misconception_label}）
迷思詳細描述：{misconception_detail}

要求：
1. 必須以學生第一人稱口語撰寫，避免學術用語。
2. 三條應呈現不同表達方式，但都對應同一個迷思。
3. 不要附編號或前綴。
4. 末尾請用 [REF] 標籤列出引用來源（文件名 + 頁碼或段落），不在三條句子內。
5. 每條長度控制在 25 字以內。

{若 currentText 非空：教師目前已輸入「{currentText}」，請避免雷同並提供其他角度。}
```

### 7.3 後端解析 RAGFlow 回應

1. 取 `data.answer`，按換行切成多條
2. 過濾掉空行 / 純 [REF] 行
3. 取前 3 條作為 `suggestions`
4. 從 `data.reference.chunks[]` 與 `data.reference.doc_aggs[]` 抽出引用資訊
5. 若解析後 `suggestions` 為空 → 回 502 `RAGFLOW_EMPTY`

### 7.4 前端互動

- 教師在出題精靈步驟二的「編輯題目 modal」中，每個非正解選項旁顯示「✨ 建議」icon button
- 點擊 → 開啟 `<DistractorSuggestPopover>`
- Popover 自動帶當前 `nodeId / misconceptionId / currentText`，呼叫後端
- 顯示 3 條候選；點任一條「採用」會把該文字填回該選項 content
- 提供「再來 3 條」（重新呼叫，帶上 `ragflowSessionId`）
- 失敗時顯示「目前無法取得建議，請手動輸入」+ 重試按鈕

---

## 8. N1 / N2 摘要（P3 已實作）

### 8.1 設計原則（P4 後）

P4 完成後，後端 `/api/ai/{grade,class}-summary` **直接從 DB 算統計**，前端只送 `quizId` (+ `classId`)。

> P3 過渡時使用「前端送完整 perClass / nodePassRates / topMisconceptions」的暫行 schema。
> P4 後簡化為：
> - `POST /api/ai/grade-summary` body：`{ quizId }`
> - `POST /api/ai/class-summary` body：`{ quizId, classId }`
>
> 為了向下相容，後端**忽略**多餘欄位（前端送來的 perClass 等不會引發錯誤）。

### 8.2 N1 全年級摘要

```
POST /api/ai/grade-summary
Authorization: scilens_session cookie (require_teacher)

Request:
{
  "quizId": "quiz-001",
  "quizTitle": "水溶液 · 迷思診斷（第一次）",
  "perClass": [
    {
      "classId": "class-A", "className": "五年甲班",
      "studentCount": 20, "submittedCount": 20, "completionRate": 100,
      "averageMastery": 40,                    // 0~100
      "nodePassRates": { "INe-II-3-02": 40, ... },
      "topMisconceptions": [
        { "id": "M02-1", "label": "...", "count": 6 }, ...
      ]
    },
    ...
  ],
  "knowledgeNodes": [                          // 涉及到的節點，給 RAGFlow 上下文
    { "id": "INe-II-3-02", "name": "..." }, ...
  ]
}

Response 200:
{
  "summary": "本年級水溶液單元的整體掌握率為...",   // markdown 段落
  "actions": [                                   // 條列式行動建議
    "對 5 年丙班的 INe-Ⅲ-5-4 派發情境治療考卷 scenario-004",
    ...
  ],
  "citations": [
    { "documentName": "水溶液迷思概念整理_後設研究.docx", "snippet": "..." }, ...
  ],
  "ragflowSessionId": "..."
}
```

### 8.3 N2 單班摘要

```
POST /api/ai/class-summary
Request:
{
  "quizId": "...", "quizTitle": "...",
  "classId": "class-A", "className": "五年甲班",
  "studentCount": 20, "submittedCount": 20,
  "averageMastery": 40,
  "nodePassRates": { ... },
  "topMisconceptions": [ ... ],
  "knowledgeNodes": [ ... ]
}

Response 200:
{
  "summary": "本班...",
  "actions": ["...", "..."],
  "citations": [ ... ],
  "ragflowSessionId": "..."
}
```

### 8.4 後端 prompt 樣板

`app/services/ai_service.py` 的 `build_grade_summary_query()` / `build_class_summary_query()`：

> 共同前置：列出班級 / 節點 / 高頻迷思的統計資料，要求 RAGFlow 從文獻角度給出：
> 1. **整體狀態描述**（一段話）
> 2. **跨班觀察 / 個別班級重點**（依 N1 / N2 而異）
> 3. **優先介入順序**：點名最該先處理的迷思代碼或班級
> 4. **可採行的行動建議**：條列 3~5 條，每條附對應推薦的情境治療考卷 ID（若知識節點對應到既有 scenario，例如 `M02-* → scenario-001`）
> 5. **末段以 [REF] 標籤列出參考文獻**
>
> 全部用中文回覆，給教師閱讀。每段請引用具體文獻，避免空泛。

### 8.5 後端解析

1. 取 `data.answer`，按 `[REF]` 切成「主體」與「參考」兩段
2. 主體段落內若有「行動建議：」或項目符號 `1. / -` 開頭的條列 → 切到 `actions[]`
3. 主體其餘文字 → `summary`（markdown）
4. citations 從 `data.reference.chunks[]` / `doc_aggs[]` 抽取（同 N6）

### 8.6 快取（P3 暫不實作）

P3 暫時**不寫 cache**——每次點「重新整理」都實際呼叫一次 RAGFlow。`ai_summary_cache` 表已建好（spec-11 §3.15），P4 完成、學生作答進 DB 後再啟用 invalidation 機制。

### 8.7 Session 策略

每次摘要建一次性 session（不重用），因為跨次摘要無共用上下文且每次資料可能不同。

### 8.8 前端整合

| 頁面 | 觸發 | 顯示位置 |
|------|------|---------|
| `/teacher/dashboard/overview`（OverviewPage） | 進入頁面時 + 「重新整理」按鈕 | 頁面上方「全年級 AI 診斷摘要」面板 |
| `/teacher/dashboard/class-detail`（ClassDetailPage 內的 SingleClassReport） | 切換班級時 + 「重新整理」按鈕 | 「班級 AI 診斷摘要 + 本週行動清單」面板 |

---

## 9. 安全性與隱私

- **API key 永不到前端**：`RAGFLOW_API_KEY` 僅後端讀取
- **學生個資不送 RAGFlow**：N1 / N2 prompt 只送「迷思代碼 + 統計數字」，不送學生姓名 / 帳號
- **教師端權限**：N6 / N1 / N2 全部 `require_teacher`
- **快取清除**：學生新作答 → trigger N1 / N2 cache invalidate（P4 實作）

---

## 10. 與其他 spec 的關係

| spec | 影響 |
|------|------|
| spec-09 | 前端 LLM 改走後端，但 RAGFlow 不在 spec-09 範圍（spec-09 只管 chat 介面） |
| spec-10 | §6 routers 的 `ai.py` 對應到本文件 §7 |
| spec-11 | `ai_summary_cache` 表的 `payload` / `citations` 欄位由本文件 §8 寫入 |
| spec-13 | 所有 `/api/ai/*` 路由 `require_teacher` |
| workflow.md | §7 N1 / N2 / N6 對應本文件 §7 / §8 |
