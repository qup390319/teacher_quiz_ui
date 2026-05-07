# SPEC-05: User Workflows / 使用者操作流程規格

## 0. 認證流程（P1 起）

```
使用者打開 / → LoginPage
    │
    ├─ 點教師卡 / 學生卡 → 彈出 LoginModal
    │   ├─ 輸入帳號 + 密碼
    │   ├─ 提交 → 呼叫 useAuth().login() → POST /api/auth/login
    │   ├─ 401 → 顯示「帳號或密碼錯誤」
    │   ├─ 成功 → 後端 set HttpOnly cookie (JWT) + 回傳 user
    │   └─ 依 user.role 導向 /teacher 或 /student
    │
    ├─ 受保護路由由 <RequireAuth role="..."> 把關
    │   ├─ 未登入 → Navigate 到 /
    │   ├─ role 不符 → Navigate 到 /
    │   └─ role 相符 → 渲染目標頁
    │
    └─ TeacherLayout 側邊欄「登出」按鈕 → useAuth().logout() → /
```

詳見 spec-13。

---

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

進入點（皆會把 `editingQuizId` 重置為 `null`，除「編輯／繼續編輯」外）：
- TeacherDashboard 主頁的「快速出題」CTA → `/teacher/quiz/create`
- TeacherDashboard 主頁的「一鍵使用推薦題組」 → `/teacher/quiz/create?step=2`（預載 defaultQuestions）
- QuizLibrary「新增考卷」按鈕 → `/teacher/quiz/create`
- QuizLibrary「複製為新考卷」按鈕 → `/teacher/quiz/create?step=2`，預載複製品
- QuizLibrary「編輯／繼續編輯」按鈕 → `/teacher/quiz/create?step=2`，**保留** `editingQuizId` + `editingQuizStatus`

```
教師進入 /teacher/quiz/create
    │
    ├─ 步驟一：選擇知識節點 (Step1Nodes)
    │   ├─ 瀏覽 12 個知識節點（兩條子主題路徑）
    │   ├─ 勾選/取消勾選節點 → selectedNodeIds
    │   ├─ 系統提示尚未選的先備節點，可一鍵加入
    │   └─ 點擊「下一步」
    │
    └─ 步驟二：編輯題目 (Step2Edit)
        ├─ CoveragePanel 補洞器
        │   ├─ 顯示每節點迷思覆蓋率（progress bar）
        │   └─ 列出尚未覆蓋的迷思 chips（紅底）
        │       └─ 點擊 chip → 直接建立預填新題（鎖節點 + 該迷思為 distractor A，
        │             B 為正解，C/D 從該節點剩餘且未覆蓋的迷思補滿）→ 開啟編輯 modal
        │
        ├─ 「從題庫挑題」按鈕 → 開啟 QuestionImportDrawer（右側抽屜）
        │   ├─ 預設只顯示與當前 selectedNodeIds 有交集的考卷
        │   ├─ 可勾選「顯示全部」切換
        │   └─ 勾選若干題目 → deep clone 並 append 到 quizQuestions（重新編號 1..N）
        │
        ├─ 「新增題目」→ 建立空骨架後開啟編輯 modal
        │
        ├─ EditQuestionModal（單題編輯）
        │   ├─ 題幹、節點、4 個選項各自的 content + diagnosis
        │   └─ 每個非正解選項旁有「✨ 建議」按鈕（N6, spec-12 §7）
        │       → DistractorSuggestPopover → 後端 RAGFlow → 學生真實說法 3 條
        │
        ├─ 草稿暫存
        │   ├─ 「儲存草稿」按鈕：以 status=draft 立即上傳；首次儲存後將回傳的
        │   │   quiz id 寫入 editingQuizId，後續儲存改走 PUT（同一份）
        │   ├─ 自動暫存：30 秒 debounce，依賴 quizTitle / quizQuestions / selectedNodeIds
        │   ├─ 底部 status pill 顯示「已自動儲存於 HH:mm」
        │   └─ 編輯既有 published 卷時自動暫存停用（避免降級為 draft）
        │
        ├─ 「預覽學生端」→ PreviewQuizModal（模擬學生作答介面）
        │
        └─ 「儲存並發布」→ status=published 儲存後跳回 /teacher/quizzes，清空 editingQuizId
```

### 1.3 派題流程 (Assignment)

頁面分兩個分頁：「📝 診斷考卷」（整班派發）與「🌱 情境考卷」（個別學生派發）。

```
教師進入 /teacher/assignments
    │
    ├─ 以矩陣/網格 UI 呈現（考卷為列 × 班級為欄）
    │   ├─ 每格顯示：完成率%、submittedCount/totalStudents、截止日期
    │   │   * scenario 分頁的 totalStudents 為「該派題指派的學生數」，非班級總人數
    │   ├─ 已派發格子依完成率顯示不同顏色：
    │   │   ├─ 100% → 綠色 (#C8EAAE)，狀態文字「已完成」
    │   │   ├─ 1~99% → 黃色 (#FCF0C2)，狀態文字「進行中」
    │   │   └─ 0% → 淺綠 (#EEF5E6)，狀態文字「待作答」
    │   └─ 未派發格子顯示虛線框 + 「派發」按鈕
    │
    ├─ 診斷分頁（整班派發）
    │   ├─ 點擊未派發格子 → AssignPopover（小型 popover）
    │   │   ├─ 設定截止日期
    │   │   ├─ 確認派發 → addAssignment({ targetType:'class', studentIds:[], ... })
    │   │   └─ 自動生成 ID: assign-{timestamp}
    │   └─ 點擊已派發格子 → ManagePopover
    │       ├─ 可修改截止日期 → updateAssignment()
    │       ├─ 可查看診斷報告（若有作答資料）
    │       └─ 可取消派題 → removeAssignment()
    │
    └─ 情境分頁（個別學生派發；spec-08）
        ├─ 點擊未派發格子 → AssignTargetPicker（modal-style 學生選擇器）
        │   ├─ 顯示該班所有學生（座號排序，預設皆未勾選）
        │   ├─ 教師勾選對象（提供「全部勾選 / 全部取消」快捷）
        │   ├─ 設定截止日期
        │   └─ 確認 → addAssignment({
        │             type:'scenario', scenarioQuizId, classId,
        │             targetType:'students', studentIds:[...], dueDate, ...
        │           })
        │   * 跨班派發：分別點擊各班的格子，各自派發一次（單筆派題對應單一班級）
        │
        └─ 點擊已派發格子 → ManagePopover（情境分頁顯示「指派對象 N 位」）
            ├─ 可修改截止日期
            ├─ 「調整派發對象」→ 再次開啟 AssignTargetPicker（existing 帶入既有 studentIds）
            │       └─ 確認 → updateAssignment({ studentIds })
            └─ 可取消派題
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

作答流程分為四個階段（Phase）：`intro` → `question` → `followUp` → `done`

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
    │   │   ├─ 逐條顯示 3 則歡迎訊息（科學偵探開場、預告兩階段流程、降低壓力）
    │   │   └─ 完成後自動進入 question phase
    │   │
    │   ├─ Phase: question（第一階段：逐題作答，無即時對錯回饋）
    │   │   ├─ SystemBubble 顯示知識節點名稱 + 題號
    │   │   ├─ SystemBubble 顯示題幹
    │   │   ├─ 學生選擇選項（底部面板顯示 4 個選項按鈕）
    │   │   ├─ StudentBubble 顯示學生選擇的選項內容
    │   │   ├─ 呼叫 recordAnswer(q.id, opt.tag, opt.diagnosis)
    │   │   ├─ **不顯示對錯回饋**，直接進入下一題
    │   │   └─ 最後一題完成後 → 進入 followUp phase
    │   │
    │   ├─ Phase: followUp（第二階段：AI 開放式追問）
    │   │   ├─ 過渡訊息：「選擇題的部分結束了！接下來想跟你聊聊剛才的幾道題⋯」
    │   │   ├─ **所有題目皆進入第二層**（不論答對答錯）
    │   │   ├─ 對每一題執行 1～3 輪追問迴圈：
    │   │   │   ├─ Round 1：AI 以開放式問句問學生選擇理由
    │   │   │   │   - buildRound1Message(option, isCorrect) 產生模板
    │   │   │   │   - 答對：「能跟老師說說你是怎麼想的嗎？」
    │   │   │   │   - 答錯：「為什麼覺得這個最合理？」
    │   │   │   ├─ 學生在底部 textarea 自由文字回覆 → 觸發 processStudentReply()
    │   │   │   ├─ AI 引擎依學生回覆動態決定四種策略之一：
    │   │   │   │   - deepen（情境 C：答對且呼應正確概念，延伸確認）
    │   │   │   │   - guess（情境 D：答對但理由模糊，遷移情境釐清）
    │   │   │   │   - fuzzy（情境 A：模糊回覆，提供具體情境引導）
    │   │   │   │   - contrast（情境 B：呼應迷思推理，提供對比情境）
    │   │   │   ├─ Round 2：依策略發出對應追問
    │   │   │   ├─ Round 3：必要時觸發
    │   │   │   │   - source（探究迷思來源）
    │   │   │   │   - ab（二選一比較，降低開放度）
    │   │   │   │   - transfer（遷移測試）
    │   │   │   ├─ 任一輪達成終止條件 → 產出 finalDiagnosis
    │   │   │   │   { finalStatus, misconceptionCode, reasoningQuality, aiSummary, statusChange }
    │   │   │   ├─ 依 statusChange 反向修正 answers：
    │   │   │   │   - UPGRADED → 呼叫 removeMisconception() 將該題改為 CORRECT
    │   │   │   │   - DOWNGRADED → 將該題改為 misconceptionCode
    │   │   │   ├─ AI 摘要訊息送出後切到下一題的 Round 1
    │   │   │   └─ **學生不可跳過追問**，至少完成 1 輪
    │   │   └─ 所有題目追問完成 → 進入 done phase
    │   │
    │   └─ Phase: done
    │       ├─ 顯示完成訊息
    │       ├─ addToHistory(record)（含 followUpResults）
    │       └─ 自動導航至 /student/report（延遲 1800ms）
    │
    └─ 進入 /student/report (StudentReport)
        ├─ 顯示掌握 / 待更新概念數
        ├─ 列出被確認的迷思概念
        │   ├─ 迷思標籤 (label)
        │   ├─ 學生端說明 (studentDetail)
        │   ├─ **「你在對話中提到」引用**（取自 followUpResults.conversationLog 的第一則學生回覆）
        │   └─ 學習提示 (studentHint)
        ├─ **「答對了，但可以更深入理解」黃色區塊**（reasoningQuality 為 WEAK / GUESSING 的題目）
        ├─ 下一步學習建議
        └─ 返回首頁按鈕
```

### 2.2 迷思概念診斷機制

診斷流程為兩層次制：

**第一層：作答自動診斷（question phase 中）**
- 每題作答時，根據選項的 `diagnosis` 欄位即時記錄：
  - `'CORRECT'` → 記錄為正確
  - 迷思概念 ID（如 `'M02-1'`）→ 記錄為該迷思概念
- 此階段**不給予任何對錯回饋**，學生不知道自己答對或答錯
- 所有題目作答完成後，才進入第二層

**第二層：AI 開放式追問（followUp phase）**
- 由 `followUpEngine.processStudentReply()` 模擬 AI 動態決定追問策略
- **對所有題目進行追問**（不論答對答錯），每題 1～3 輪
- 學生以自由文字回覆，AI 依文字長度＋關鍵詞匹配判讀：
  - 模糊關鍵詞（不知道／猜的／感覺等）→ 觸發具體情境引導或二選一
  - 知識節點正確概念關鍵詞 → 確認 reasoningQuality 為 SOLID／PARTIAL
  - 對應迷思的關鍵詞 → 確認迷思並探究來源
- 終止後產出 `finalDiagnosis`：
  - `finalStatus`: `'CORRECT' | 'MISCONCEPTION' | 'UNCERTAIN'`
  - `reasoningQuality`: `'SOLID' | 'PARTIAL' | 'WEAK' | 'GUESSING'`
  - `statusChange.changeType`: `'CONFIRMED' | 'UPGRADED' | 'DOWNGRADED' | 'DISCOVERED'`
- 依 statusChange 自動修正第一層作答記錄：
  - **UPGRADED**（學生選錯但追問展現正確理解）→ `removeMisconception(id)` 改為 CORRECT
  - **DOWNGRADED**（學生選對但追問顯示猜測或迷思）→ 將 diagnosis 改為迷思碼
- **注意**: `studentDetail`、`studentHint` 不在此階段顯示，僅在最終 StudentReport 中呈現
- **目前實作備註**: 因尚未接後端 LLM，`followUpEngine` 為純前端模板＋啟發式判讀模擬；未來接上 LLM 後僅替換引擎內部，對外 API 不變

---

## 3. 治療模組工作流（spec-08，波次 2/3 實作）

> 完整規格見 `docs/spec-08-treatment-cognitive-apprenticeship.md`。本節僅勾勒流程接點。

### 3.1 教師端：建立 / 編輯情境考卷

```
教師進入 /teacher/scenarios（情境考卷庫）
    │
    ├─ 瀏覽既有 1 份 demo（scenario-002 · 飽和糖水甜度）+ 自製
    ├─ 點擊「新增」 → /teacher/scenarios/create
    │   ├─ 步驟一：選目標節點 + 標目標迷思
    │   ├─ 步驟二：撰寫情境敘述（textarea）+ 上傳圖片
    │   ├─ 步驟三：撰寫每題 initialMessage + expertModel
    │   └─ 儲存 → saveScenarioQuiz()
    │
    └─ 點擊既有卡 → /teacher/scenarios/:scenarioQuizId/edit
        └─ 同上，預填現有資料
```

### 3.2 教師端：派發治療任務（個別學生派發）

情境治療派題以**個別學生**為單位（spec-04 §2.4 `targetType='students'`）。教師看一個班級、勾選需要治療的學生，再看下一個班級。

```
教師進入 /teacher/assignments → 切到「🌱 情境考卷」分頁
    │
    ├─ 點擊（情境考卷 × 班級）的未派發格子
    │   └─ 開啟 AssignTargetPicker（modal）
    │       ├─ 顯示該班全體學生（座號 + 姓名 + 帳號）
    │       ├─ 教師手動勾選需要派發的學生（不預選）
    │       ├─ 設定截止日期
    │       └─ 確認 → addAssignment({
    │                 type:'scenario', scenarioQuizId, classId,
    │                 targetType:'students', studentIds:[...], dueDate, ...
    │               })
    │
    ├─ 點擊（情境考卷 × 班級）的已派發格子
    │   └─ ManagePopover 顯示「指派對象 N 位」+ 完成進度
    │       ├─ 「調整派發對象」→ 再次開啟 AssignTargetPicker（含既有勾選）
    │       │   → updateAssignment({ studentIds })
    │       ├─ 修改截止日期 → updateAssignment({ dueDate })
    │       └─ 取消派題 → removeAssignment()
    │
    └─ 完成派發後，被勾選的學生在 StudentHome「情境治療」區塊看到此任務
       （後端 useAssignments 對學生角色過濾：班級命中且 student.id ∈ studentIds）
```

> 未來可擴充入口：在 DashboardReport 的迷思列表旁加「📤 派發情境治療」按鈕，
> 帶入 `{ classId, scenarioQuizId 候選 }` 跳到此分頁並自動展開對應格子的 picker（教師仍手動勾學生）。
> 目前主要入口是 `/teacher/assignments` 的 scenario 分頁。

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
