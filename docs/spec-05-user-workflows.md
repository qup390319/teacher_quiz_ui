# SPEC-05: User Workflows / 使用者操作流程規格

## 1. 教師端工作流程

### 1.1 核心三步驟流程

教師端主頁（TeacherDashboard）呈現三步驟工作流程總覽：

```
步驟一：出題管理
    → 點擊後導航至 /teacher/quizzes（考卷庫）
    → 從考卷庫可進入 /teacher/quiz/create（出題精靈）
    → 也可從主頁 CTA「快速出題」直接進入 /teacher/quiz/create
    → 或使用「一鍵使用推薦題組」直接跳至 /teacher/quiz/create?step=2

步驟二：派題管理
    → /teacher/assignments
    → 選擇考卷 + 班級 + 截止日期
    → 建立派題記錄

步驟三：診斷結果
    → /teacher/dashboard（DashboardReport）
    → 篩選班級 / 考卷
    → 檢視圖表與分析
```

### 1.2 出題流程 (Quiz Creation)

```
教師進入 /teacher/quiz/create
    │
    ├─ 步驟一：選擇知識節點 (Step1Nodes)
    │   ├─ 瀏覽 8 個知識節點（按 level 分組）
    │   ├─ 勾選/取消勾選節點
    │   ├─ 選定的 ID 儲存至 selectedNodeIds
    │   └─ 點擊「下一步」
    │
    └─ 步驟二：編輯題目 (Step2Edit)
        ├─ 系統根據選定節點載入對應預設題目
        ├─ 可編輯題幹 (stem)
        ├─ 可編輯各選項內容 (content)
        ├─ 可調整各選項的迷思對應 (diagnosis)
        ├─ 點擊「儲存」→ 呼叫 saveQuiz()
        └─ 儲存成功後導航至考卷庫
```

### 1.3 派題流程 (Assignment)

```
教師進入 /teacher/assignments
    │
    ├─ 以矩陣/網格 UI 呈現（考卷為列 × 班級為欄）
    │   ├─ 每格顯示：完成率%、已繳交/總人數、截止日期
    │   ├─ 已派發格子依完成率顯示不同顏色：
    │   │   ├─ 100% → 綠色 (#C8EAAE)，狀態文字「已完成」
    │   │   ├─ 1~99% → 黃色 (#FCF0C2)，狀態文字「進行中」
    │   │   └─ 0% → 淺綠 (#EEF5E6)，狀態文字「待作答」
    │   └─ 未派發格子顯示虛線框 + 「派發」按鈕
    │
    ├─ 點擊未派發格子 → 彈出 Popover
    │   ├─ 設定截止日期
    │   ├─ 確認派發 → 呼叫 addAssignment()
    │   └─ 自動生成 ID: assign-{timestamp}
    │
    └─ 點擊已派發格子 → 彈出 Popover
        ├─ 可修改截止日期 → 呼叫 updateAssignment()
        └─ 可取消派題 → 呼叫 removeAssignment()
```

### 1.4 診斷結果查看流程

「診斷結果」拆為 5 個子分頁，由 `DashboardLayout` 共用「考卷選擇器」+ tab 列。
進入 `/teacher/dashboard` 自動 redirect 到 `/teacher/dashboard/overview`，並從 `?quizId=` 載入考卷（無則 fallback 到最近檢視 / 第一張可用考卷）。

```
教師進入 /teacher/dashboard
    │
    ├─（自動 redirect → /teacher/dashboard/overview?quizId=...）
    │
    ├─ 頂部考卷選擇器（DashboardLayout 共用，切換時保留所在子分頁）
    │
    ├─ 子分頁：全年級總覽（/overview）
    │   ├─ 全年級 AI 診斷摘要（年級健康狀態 + 跨班診斷句 + 優先介入順序 + 行動建議）
    │   ├─ 4 個指標卡：涵蓋班級 / 平均完成率 / 平均掌握率 / 需關注班級
    │   └─ 完成率 × 掌握率班級分布散佈圖
    │
    ├─ 子分頁：各班學習狀況（/classes）
    │   ├─ 每班三項核心指標卡片（完成率、掌握率、高頻迷思數）
    │   └─ 點擊卡片 → 導航到 /class-detail?classId=...&quizId=...
    │
    ├─ 子分頁：知識節點跨班比較（/nodes）
    │   └─ 同一概念節點各班通過率並排長條（70% 掌握門檻參考線）
    │
    ├─ 子分頁：跨班高頻迷思（/misconceptions）
    │   ├─ Top 6 高頻迷思橫條圖（依全年級平均持有率排序）
    │   └─ 班級 × 迷思熱力圖（顏色越深表持有率越高）
    │
    └─ 子分頁：各班詳細報告（/class-detail）
        ├─ 上方：各班派題完成率清單（被選中的班級顯示綠框）
        │   └─ 點擊任一班級 → 更新 ?classId=
        └─ 下方：依 ?classId 渲染該班 SingleClassReport
            ├─ 4 個指標卡（參與學生 / 完成率 / 平均掌握率 / 最高風險迷思）
            ├─ 班級 AI 診斷摘要 + 本週行動清單
            ├─ 各概念掌握程度長條圖
            ├─ 迷思概念分佈（可展開學生名單）
            └─ 題目明細矩陣（每題 A/B/C/D 選答分佈 + 對應迷思）
```

**URL query 規則**:
- `?quizId=` 由 `DashboardLayout` 跨 5 個子分頁共用，切換 tab 時保留
- `?classId=` 僅 `class-detail` 使用
- 兩者都同步寫入 `AppContext.currentQuizId / currentClassId` 作「最近檢視」記憶

### 1.5 班級管理流程

```
教師進入 /teacher/classes
    │
    ├─ 瀏覽所有班級卡片
    │   └─ 顯示：班級名稱、年級、科目、學生人數
    │
    └─ 點擊班級 → /teacher/classes/:classId
        ├─ 檢視學生名冊（姓名 + 座號）
        ├─ 可新增學生
        ├─ 可移除學生
        └─ 呼叫 updateClassStudents() 儲存變更
```

### 1.6 知識地圖查看流程

```
教師進入 /teacher/knowledge-map
    │
    ├─ 以層級結構展示知識節點
    │   ├─ Level 1: 基礎概念（傳導、對流液/氣）
    │   ├─ Level 2: 進階概念（輻射原理、輻射阻擋）
    │   ├─ Level 3: 應用概念（保溫、散熱）
    │   └─ Level 4: 綜合應用（節能設計）
    │
    ├─ 每個節點卡片顯示
    │   ├─ 名稱 + 描述
    │   ├─ 迷思概念列表（id + label）
    │   ├─ 教學策略建議
    │   └─ 先備知識連結
    │
    └─ 節點間以線條/箭頭表示先備關係
```

---

## 2. 學生端工作流程

### 2.1 完整作答流程

作答流程分為三個階段（Phase）：`intro` → `question` → `confirming` → `done`

```
學生從首頁選擇「學生端」
    │
    ├─ 進入 /student (StudentHome)
    │   ├─ 瀏覽可作答的已發佈考卷列表
    │   ├─ 檢視歷史作答記錄
    │   └─ 點擊考卷 → 進入作答
    │
    ├─ 進入 /student/quiz/:quizId (StudentQuiz)
    │   │
    │   ├─ Phase: intro
    │   │   ├─ 逐條顯示 3 則歡迎訊息（SystemBubble）
    │   │   └─ 完成後自動進入 question phase
    │   │
    │   ├─ Phase: question（逐題作答，無即時對錯回饋）
    │   │   ├─ SystemBubble 顯示知識節點名稱 + 題號
    │   │   ├─ SystemBubble 顯示題幹
    │   │   ├─ 學生選擇選項（底部面板顯示 4 個選項按鈕）
    │   │   ├─ StudentBubble 顯示學生選擇的選項內容
    │   │   ├─ 呼叫 recordAnswer(q.id, opt.tag, opt.diagnosis)
    │   │   ├─ **不顯示對錯回饋**，直接進入下一題
    │   │   └─ 最後一題完成後 → 進入 confirming phase
    │   │
    │   ├─ Phase: confirming（批次迷思確認）
    │   │   ├─ 收集所有不重複的迷思概念 ID（diagnosis !== 'CORRECT'）
    │   │   ├─ 若無迷思概念 → 直接進入 done phase
    │   │   ├─ 若有迷思概念 → 逐一確認：
    │   │   │   ├─ SystemBubble：「我想再確認一件事，看看我有沒有理解錯你的想法。」
    │   │   │   ├─ SystemBubble：顯示 confirmQuestion
    │   │   │   ├─ 底部面板顯示兩個按鈕：
    │   │   │   │   ├─ 「對，我是這樣想的」→ 保留迷思診斷
    │   │   │   │   └─ 「不，我不這樣認為」→ removeMisconception(id) 改為 CORRECT
    │   │   │   └─ 進入下一個迷思確認（或結束）
    │   │   └─ 所有確認完成 → 進入 done phase
    │   │
    │   └─ Phase: done
    │       ├─ 顯示完成訊息
    │       ├─ addToHistory(record) 記錄至歷史
    │       └─ 自動導航至 /student/report（延遲 1800ms）
    │
    └─ 進入 /student/report (StudentReport)
        ├─ 顯示正確率統計
        ├─ 列出被診斷的迷思概念
        │   ├─ 迷思標籤 (label)
        │   ├─ 學生端說明 (studentDetail)
        │   └─ 學習提示 (studentHint)
        └─ 返回首頁按鈕
```

### 2.2 迷思概念診斷機制

診斷流程為兩階段制，兩階段分開執行：

**第一階段：作答自動診斷（question phase 中）**
- 每題作答時，根據選項的 `diagnosis` 欄位即時記錄：
  - `'CORRECT'` → 記錄為正確
  - 迷思概念 ID（如 `'M02-1'`）→ 記錄為該迷思概念
- 此階段**不給予任何對錯回饋**，學生不知道自己答對或答錯
- 所有題目作答完成後，才進入第二階段

**第二階段：批次迷思確認（confirming phase）**
- 從所有作答記錄中收集不重複的迷思概念 ID
- 逐一向學生展示 `confirmQuestion`（確認問題）
- 學生可選擇：
  - **「對，我是這樣想的」**→ 保留迷思診斷記錄
  - **「不，我不這樣認為」**→ 呼叫 `removeMisconception(misconceptionId)` 將相關作答的 diagnosis 改為 `'CORRECT'`
- **注意**: `studentDetail` 和 `studentHint` 不在此階段顯示，僅在最終的 StudentReport 頁面中呈現

---

## 3. 治療模組工作流（spec-08，波次 2/3 實作）

> 完整規格見 `docs/spec-08-treatment-cognitive-apprenticeship.md`。本節僅勾勒流程接點。

### 3.1 教師端：建立 / 編輯情境考卷

```
教師進入 /teacher/scenarios（情境考卷庫）
    │
    ├─ 瀏覽既有 5 份 demo（scenario-001 ~ 005）+ 自製
    ├─ 點擊「新增」 → /teacher/scenarios/create
    │   ├─ 步驟一：選目標節點 + 標目標迷思
    │   ├─ 步驟二：撰寫情境敘述（textarea）+ 上傳圖片
    │   ├─ 步驟三：撰寫每題 initialMessage + expertModel
    │   └─ 儲存 → saveScenarioQuiz()
    │
    └─ 點擊既有卡 → /teacher/scenarios/:scenarioQuizId/edit
        └─ 同上，預填現有資料
```

### 3.2 教師端：派發治療任務

```
教師查看診斷結果（DashboardReport / StudentReport）
    │
    ├─ 在班級／個人迷思列表旁 → 點「📤 派發情境考卷」
    │
    ├─ 跳轉至 TreatmentAssignment（合併進 AssignmentManagement 的 'scenario' tab）
    │   ├─ 預填當前學生／班級的迷思清單
    │   ├─ 教師勾選想治療的迷思（MisconceptionPicker）
    │   ├─ 系統依 getScenarioQuizzesByMisconception() 推薦對應情境考卷
    │   ├─ 教師選定情境考卷 + 班級 + 截止日
    │   └─ 確認派發 → addAssignment({ type: 'scenario', scenarioQuizId, classId, dueDate, ... })
    │
    └─ 完成派發後，學生端 StudentHome 的「情境治療」區塊就會出現此任務
```

### 3.3 學生端：情境對話流程（spec-08 §6）

```
學生在 StudentHome 點擊「情境治療」任務卡
    │
    ├─ 進入 /student/scenario/:scenarioQuizId (ScenarioChat)
    │
    ├─ entryStage = 'intro'（吉祥物開場）
    │   └─ 點擊「開始挑戰」 → entryStage='scenario'
    │
    ├─ entryStage = 'scenario'（情境敘述頁，含可放大圖）
    │   └─ 點擊「我已閱讀完成，開始挑戰」 → entryStage='chat'
    │       同時 startTreatmentSession(scenarioQuizId, studentId)
    │
    ├─ entryStage = 'chat'（AI 對話），flowStage 多階段切換：
    │   ├─ 'chat'：runTreatmentTurn() 推進，每輪 appendTreatmentMessage()
    │   ├─ 'between-questions'：該題完成 → 顯示「下一題」按鈕
    │   ├─ 'next-scenario'：下一題情境敘述頁 → advanceTreatmentQuestion()
    │   ├─ 'settling'：結算動畫（dots 約 3 秒）
    │   ├─ 'result'：過關木牌（含 StarRating） → completeTreatmentSession()
    │   └─ 'reflection'：雙欄反思頁（左=回顧 Tabs / 右=反思對話）
    │
    └─ 退出 → 回 StudentHome（任務卡顯示已完成）
```

### 3.4 教師端：查看治療對話紀錄

```
教師進入 /teacher/treatment-logs
    │
    ├─ 列表：學生 × 情境考卷 × 完成狀態 × 最後 phase/stage × 開始時間
    ├─ 篩選：依班級 / 情境考卷 / 完成狀態
    │
    └─ 點選任一列 → /teacher/treatment-logs/:sessionId (TreatmentLogDetail)
        ├─ 左欄：情境考卷的題目列表（情境敘述 + 圖）
        └─ 右欄：完整對話氣泡時序展開
            └─ 每則 AI 訊息標註該回合的 phase / stage / step / hintLevel
            （為教師提供「派發治療是否成功」的判斷依據）
```

---

## 4. 跨角色交互

```
教師 → 建立考卷 (saveQuiz)
         ↓
教師 → 派發考卷 (addAssignment)
         ↓
學生 → 作答考卷 (recordAnswer)
         ↓
教師 → 檢視診斷結果 (getClassAnswers, getNodePassRates, etc.)
         ↓ 若診斷出迷思
教師 → 建立情境考卷 / 沿用 demo (saveScenarioQuiz)
         ↓
教師 → 派發情境考卷 (addAssignment with type='scenario')
         ↓
學生 → 與 AI 對話治療 (runTreatmentTurn / appendTreatmentMessage)
         ↓
教師 → 查看治療對話紀錄 (getTreatmentSession)
```

**注意**: 目前為純前端原型，教師與學生的資料不互通。
- 教師端的診斷結果來自 Mock 資料（`ANSWER_DISTRIBUTIONS_MAP`）
- 學生端的作答結果存於前端 state，不會反映到教師端儀表板
- 未來接上後端後，學生作答資料將即時反映至教師端
