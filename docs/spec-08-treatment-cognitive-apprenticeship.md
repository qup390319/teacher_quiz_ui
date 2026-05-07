# SPEC-08: Treatment / 認知師徒制治療模組

> **角色定位**：本文件是「迷思治療（情境考卷）」模組的單一真理來源。教師端派發、學生端對話、AI 機器人狀態機、教師端對話紀錄查閱皆以本文件為準。
>
> 本模組與既有「診斷考卷」（`Quiz` / `Question`）**並列獨立**：
> - **診斷考卷**：四選一作答 → 系統判讀迷思 → 學生確認 → 報告（既有，spec-04 §2.1~2.2、spec-05 §2.1~2.2）
> - **情境考卷**：論證情境（文字＋圖）→ AI 對話式引導（CER 主張/證據/推理/修正）→ 反思 → 教師查紀錄（**本文件規範**）

---

## 1. 模組概觀

### 1.1 立論基礎

治療採用 **Collins 等人（1989）認知師徒制（Cognitive Apprenticeship）** 的四個核心方法：

| 方法 | 中文 | 在本系統的對應 |
|------|------|----------------|
| Modeling | 示範 | AI 在 `apprenticeship` phase 主動展示專家解題思路（「我來示範專家的思考…」） |
| Coaching | 指導 | AI 即時點評學生回答（`feedback` 8-25 字短評） |
| Scaffolding & Fading | 鷹架與漸退 | `hintLevel` 0~3 級提示，依學生表現漸進降級 |
| Articulation / Reflection / Exploration | 表達 / 反思 / 探索 | 對話結束後進入「反思」階段，讓學生回顧自己的推理路徑 |

論證結構採 **McNeill & Krajcik 的 CER**（Claim-Evidence-Reasoning），加 Toulmin 的反駁/修正：

| stage | 中文 | 學生要做什麼 |
|-------|------|--------------|
| `claim` | 主張 | 提出對情境問題的看法 |
| `evidence` | 證據 | 列出支持主張的觀察、數據、線索 |
| `reasoning` | 推理 | 說明證據如何支持主張（科學原理、因果關係） |
| `revise` | 修正 | 接收 AI 反例或追問後修改主張或推理 |
| `complete` | 完成 | 該題達成目標，本題結束 |

### 1.2 兩階段流程（phase）

每一道情境題進行下列兩個階段，由 AI 機器人主導切換：

| phase | 中文 | 何時進入 | 何時離開 | AI 行為 |
|-------|------|----------|----------|---------|
| `diagnosis` | 診斷 | 該題開場後立即進入 | AI 已掌握學生現有想法且偵測到對應迷思（最多 step 3）| 不評價、不示範，純粹追問澄清 |
| `apprenticeship` | 師徒 | `diagnosis` 結束後切換 | 學生答出令人滿意的 claim+evidence+reasoning 組合，或 step 達 7 | Modeling → Coaching → Scaffolding → Fading 四步驟 |
| `completed` | 完成 | 本題結束 | — | （不再回應，由前端切下一題或結算）|

> **與 eh 系統的對應**：phase / stage / step / hintLevel 命名與 eh 系統 `RESPONSE_JSON_SCHEMA`（[server.js:78-116](C:/Users/qup39/Desktop/eh的系統/後端/scientific_argumentation_back-main/server.js#L78)）100% 一致，未來若要把 mock bot 換成真 LLM，前端介面**完全不用改**。

### 1.3 步進規則（step）

- 每題最多 7 step（`STEPS_PER_SET = 7`），跨 stage 推進
- `step` 只進不退（mock bot 與後續真實 LLM 都需保證單調遞增）
- `step = 7` 仍未 `complete` → 強制收斂進入下一題或結算

---

## 2. AI 機器人介面契約（Bot Contract）

### 2.1 函式簽章

```javascript
// src/data/treatmentBot.js
runTreatmentTurn(state, userMessage) → BotResponse
```

### 2.2 輸入：`state`

```typescript
interface TreatmentState {
  scenarioQuizId: string;       // 情境考卷 ID（如 'scenario-001'）
  questionIndex: number;        // 題目 index（1-based，對應 ScenarioQuiz.questions）
  history: TreatmentMessage[];  // 該題目前為止的完整對話（按時序）
  phase: 'diagnosis' | 'apprenticeship' | 'completed';
  step: number;                 // 1~7
  stage: 'claim' | 'evidence' | 'reasoning' | 'revise' | 'complete';
  hintLevel: 0 | 1 | 2 | 3;
  requiresRestatement: boolean;
}
```

> **`history` 簡化版相容性**：mock bot（v1）只需要 `{ role, text }` 兩個欄位即可運作（規則式推進不依賴 phase/step/feedback）。
> 但**儲存層**（AppContext `treatmentSessions`）必須完整記錄 `TreatmentMessage`（含 phase/stage/hintLevel/feedback/createdAt 等標註）— 因為教師端 `TreatmentLogDetail` 與未來真實 LLM 切換都會用到。
> 換句話說：**runTreatmentTurn 寫入「精簡」、AppContext 寫入「完整」**，兩者透過 UI 層黏合，不衝突。

### 2.3 輸出：`BotResponse`

```typescript
interface BotResponse {
  phase: 'diagnosis' | 'apprenticeship' | 'completed';  // 推進後的 phase
  step: number;                  // 推進後的 step（1~7，只進不退）
  stage: 'claim' | 'evidence' | 'reasoning' | 'revise' | 'complete';
  assistantMessage: string;      // 主對話氣泡內容（給學生看）
  feedback: string;              // 8~25 字短評（給吉祥物提示泡泡）
  hintLevel: 0 | 1 | 2 | 3;     // 0=不提示 / 1=輕度引導 / 2=中度提示 / 3=接近答案
  requiresRestatement: boolean;  // true 時前端要提示學生重述主張
}
```

> 此 schema 與 eh 系統 [server.js:78-116](C:/Users/qup39/Desktop/eh的系統/後端/scientific_argumentation_back-main/server.js#L78) 完全一致。

### 2.4 hintLevel 語意

| level | 何時用 | 範例 |
|-------|--------|------|
| 0 | 學生表現良好，AI 純粹接話 | 「你說鹽巴下去後看不見了，這是很重要的線索！」 |
| 1 | 輕度引導，提醒學生看細節 | 「再想想看，那杯子底部有沒有什麼？」 |
| 2 | 中度提示，給方向但不給答案 | 「想想糖會不會像鹽一樣『分散』在水中？分散後它去哪了？」 |
| 3 | 接近答案的鷹架（`apprenticeship` 後段才出現） | 「物質溶解時會均勻分散在水裡，看不見不代表消失，這就是溶解的關鍵特徵。」 |

### 2.5 requiresRestatement 觸發條件

- 學生回答**離題**（沒有回到主張、證據、推理任一面向）
- 學生回答**過短**（少於 5 字）且非選擇題式回應
- 學生**連續 2 step** 卡在同一 stage 沒有實質推進

當 `requiresRestatement = true`，前端應在輸入框上方顯示提示：「試著重新說說你的看法吧！」

---

## 3. Mock Bot 推進規則（v1）

> **目的**：純前端原型，不依賴後端 LLM。Mock 邏輯只需「讓使用者跑通流程、視覺正確」，不追求對話品質。未來換真 LLM 時整檔替換。

### 3.1 推進有限狀態機

```
[題目開場 phase=diagnosis, step=1, stage=claim, hint=0]
   ↓ 學生回應（任意）
[step=2, stage=evidence, hint=依長度判定]
   ↓ 學生回應（任意）
[step=3, stage=reasoning, phase 切換 → apprenticeship, hint=1]
   ↓ 學生回應（任意）
[step=4, stage=revise, hint=2 — AI 開始 Modeling：「我來示範專家的思考…」]
   ↓ 學生回應（任意）
[step=5, stage=revise, hint=2 — AI Coaching]
   ↓ 學生回應（任意）
[step=6, stage=revise, hint=1 — AI Scaffolding 回退]
   ↓ 學生回應（任意）
[step=7, stage=complete, hint=0, phase=completed — 該題結束]
```

### 3.2 specific 行為細則

- **stage `claim`（step 1）**：AI 開場提問 = `ScenarioQuestion.initialMessage`
- **stage `evidence`（step 2）**：AI 詢問證據，例：「你說 X，能不能告訴我你怎麼知道的？證據就是支持你想法的線索或觀察喔！」
- **stage `reasoning`（step 3）**：AI 詢問推理邏輯，例：「這些線索裡，哪一個最能幫我們判斷 X 呢？」
- **stage `revise` / Modeling（step 4）**：AI **必出**「我來示範專家的思考」開頭，說出一段含 claim+evidence+reasoning 的完整論證範例（取自 `ScenarioQuestion.expertModel` 欄位）
- **stage `revise` / Coaching（step 5-6）**：AI 鼓勵學生套用範例的格式回答
- **stage `complete`（step 7）**：AI 給一句總結 feedback，回應 `{ phase: 'completed', stage: 'complete' }`

### 3.3 feedback 短評生成（8-25 字）

| 觸發 | 範例 |
|------|------|
| 學生回應長度 < 5 字 | 「試著說多一點吧！」 |
| 學生回應有提到具體證據 | 「找到好線索了！」 |
| 學生在 revise 階段套用了 modeling 格式 | 「論證越來越完整了！」 |
| 學生離題 | 「先回到問題本身吧！」 |
| `step >= 5` | 「你做得很棒，繼續！」 |

---

## 4. 資料模型（在 spec-04 補充）

僅總覽，型別細節見 spec-04。

| 型別 | 來源 | 用途 |
|------|------|------|
| `ScenarioQuestion` | `src/data/scenarioQuizData.js` | 單一情境題（情境敘述 + 圖 + 開場提問 + 目標迷思 + 專家示範範文） |
| `ScenarioQuiz` | `src/data/scenarioQuizData.js` | 情境考卷（多題的容器） |
| `Assignment.type` | `'diagnosis' \| 'scenario'` | 派題類型，預設 `'diagnosis'`（向下相容） |
| `TreatmentSession` | AppContext | 學生作答某情境考卷的整段對話狀態 |
| `TreatmentMessage` | AppContext | 對話中的一則訊息（AI 或學生）+ 該回合的 phase/stage/step/hintLevel 標註 |

---

## 5. 教師端流程（在 spec-05 補充）

僅總覽，細節見 spec-05。

```
教師看診斷結果 → DashboardReport / StudentReport
   │ 「派發情境考卷」按鈕
   ▼
TreatmentAssignment（新頁）
   ├─ 預填當前學生 / 班級的迷思清單
   ├─ 教師勾選想治療的迷思
   ├─ 系統推薦對應的情境考卷
   ├─ 教師選擇情境考卷 + 班級 + 截止日 → 派發
   ▼
   addAssignment({ type: 'scenario', scenarioQuizId, classId, dueDate, ... })

教師查看治療紀錄 → TreatmentLogs（新頁）
   ├─ 列表：學生 × 情境考卷 × 完成狀態 × 最後 stage
   └─ 點進去 → TreatmentLogDetail（單一 session 完整對話）
```

---

## 6. 學生端流程（在 spec-05 補充）

```
StudentHome
   ├─ 「📝 診斷測驗」區塊（既有任務卡，type=diagnosis）
   └─ 「🌱 情境治療」區塊（新增任務卡，type=scenario）
      點擊 → /student/scenario/:scenarioQuizId
                  │
                  ▼
              ScenarioChat
                  ├─ entryStage = 'intro'   吉祥物開場（「準備好了嗎？」）
                  ├─ entryStage = 'scenario' 情境敘述卡（含可放大圖）
                  ├─ entryStage = 'chat'    AI 對話
                  │     ├─ flowStage = 'chat'          逐輪推進
                  │     ├─ flowStage = 'between-questions'  一題完成 → 「下一題」
                  │     ├─ flowStage = 'next-scenario' 下一題情境敘述
                  │     ├─ flowStage = 'settling'      結算動畫
                  │     ├─ flowStage = 'result'        過關木牌（含三星評等）
                  │     └─ flowStage = 'reflection'    雙欄反思頁
                  ▼
              addToTreatmentHistory({ scenarioQuizId, sessionId, ... })
              （未來教師端可由此查紀錄）
```

---

## 7. 視覺風格

**全部沿用 spec-07 木框收集冊風**，不採用 eh 系統的 Duolingo 暗色風格。

新增元件規範詳見 spec-07 §12（治療對話頁元件）。重點：
- 進度條：木框 + 米色填充 + 木紋邊（不用 Duolingo 綠）
- AI 對話氣泡：米紙底 + 木紋邊
- 學生對話氣泡：教師綠（學生說的話用 spec-07 §1.2 的學生綠/藍系，避免色彩衝突）
- 吉祥物提示：`scilens_mascot.png` + 米紙泡泡 + 三角箭頭（**禁用** owl GIF）
- 結算過關：木牌 + StarRating + 復用既有元件
- 反思頁：雙欄米紙 panel（**不做**書本翻頁造型）

---

## 8. Mock 與真實 LLM 切換

### 8.1 切換點

`src/data/treatmentBot.js` 是唯一切換點。其他 UI 元件**只**透過 `runTreatmentTurn(state, userMessage)` 呼叫，不直接寫入推進邏輯。

### 8.2 未來接 LLM 時要做的事（不在本波範圍）

1. 把 `runTreatmentTurn` 改成 async，內部 `fetch` 後端 `/api/treatment/turn`
2. 後端對接 OpenAI Responses API + Conversations API（仿 eh `server.js`）
3. 後端用 hosted prompt 或 inline system prompt 控制 phase/stage/hintLevel 邏輯
4. UI 完全不變

### 8.3 為什麼把 schema 對齊 eh

- 介面預先「合約化」，未來換實作不用改前端
- 對研究端：phase/stage/hintLevel 等變數已是學界既有概念（CER、認知師徒制、scaffolding fading），沿用學界詞彙便於日後撰寫論文

---

## 9. 與其他 spec 的關係

| spec | 影響 |
|------|------|
| spec-01 系統總覽 | §模組總覽新增「治療模組」 |
| spec-02 路由 | 新增 5 條路由 |
| spec-03 元件 | 新增治療相關元件登錄 |
| spec-04 資料模型 | 新增 `ScenarioQuiz` 等 5 個型別、AppContext 擴充 |
| spec-05 工作流 | 新增「派治療」「治療對話」「查治療紀錄」三條工作流 |
| spec-06 部署 | 無影響 |
| spec-07 UI | §12 新增治療對話頁木框風元件規範 |

---

## 10. 範例素材對照表（1 份 Demo）

| 情境考卷 ID | 標題 | 目標節點 | 題數 | 來源 |
|---|---|---|---|---|
| `scenario-002` | 飽和糖水甜度 | INe-II-3-03 | 2 | eh Q3、Q4 |

圖片素材：`src/assets/scenarios/2-1-2-sugar-saturation-chart.png`

> 註：原本 5 份 demo（scenario-001/003/004/005）已於 2026-05-07 移除以收斂 demo 內容，僅保留 scenario-002。其餘 png 素材檔案保留於 `src/assets/scenarios/` 但暫無引用。

> 題目文字、情境敘述均直接複製 eh `levels.ts` 中對應 `QUESTION_CONFIGS`，已轉成本系統 `ScenarioQuestion` 結構。
