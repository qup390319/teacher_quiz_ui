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
    → 點擊後導航至 /teacher/quizzes（題組庫）
    → 從題組庫可進入 /teacher/quiz/create（出題精靈，從步驟一「選擇單元」開始）
    → 也可從主頁 CTA「快速出題」直接進入 /teacher/quiz/create

步驟二：派題管理
    → /teacher/assignments
    → 選擇題組 + 班級 + 截止日期
    → 建立派題記錄

步驟三：診斷結果
    → /teacher/dashboard（DashboardReport）
    → 篩選班級 / 題組
    → 檢視圖表與分析
```

### 1.2 出題流程 (Quiz Creation)

進入點（皆會把 `editingQuizId` 重置為 `null`，除「編輯／繼續編輯」外）：
- TeacherDashboard 主頁的「快速出題」CTA → `/teacher/quiz/create`（從步驟一選單元開始）
- QuizLibrary「新增題組」按鈕 → `/teacher/quiz/create`
- QuizLibrary「複製為新題組」按鈕 → `/teacher/quiz/create?step=3`，預載複製品（單元由節點反推）
- QuizLibrary「編輯／繼續編輯」按鈕 → `/teacher/quiz/create?step=3`，**保留** `editingQuizId` + `editingQuizStatus`，單元由題組節點反推帶入

> **一份題組只綁一個教學單元。** 教學單元 ↔ 節點關聯走「單元 → 大節點（`/units` 的 `parentNodes`）→ 知識節點（`parentNodeId`）」，**不是** `knowledge_nodes.unit_id`（指向次主題）。教師端取全部節點（`GET /knowledge-nodes`）後依所選單元的大節點過濾。詳見 `docs/deviations.md`（2026-06-05）。

```
教師進入 /teacher/quiz/create
    │
    ├─ 步驟一：選擇單元 (Step0Unit)
    │   ├─ 卡片列出所有「使用中」單元（含節點數 / 迷思數）
    │   ├─ 未建好的單元（沒節點或沒迷思）標「建置中」、不可點，點到時提示聯絡管理員
    │   ├─ 單選；切換單元會清空已勾節點與已編題目（先確認）
    │   └─ 點擊「下一步：選擇節點」
    │
    ├─ 步驟二：選擇節點 (Step1Nodes)
    │   ├─ 顯示「所選單元」的知識節點（技能樹依先備關係 + 大節點自動排版）
    │   ├─ 勾選/取消勾選節點 → selectedNodeIds
    │   ├─ Sticky 摘要列：依大節點 / 子主題自動分組的 MiniPath + 已選節點/迷思數
    │   ├─ 未選任何節點時提示「請從下方勾選至少 1 個知識節點以繼續」
    │   ├─ 系統提示尚未選的先備節點，可一鍵加入
    │   └─ 點擊「下一步：製作題組」（或「返回：選擇單元」）
    │
    └─ 步驟三：編輯題目 (Step2Edit)
        ├─ CoveragePanel 補洞器
        │   ├─ 顯示每節點迷思覆蓋率（progress bar）
        │   └─ 列出尚未覆蓋的迷思 chips（紅底）
        │       └─ 點擊 chip → 直接建立預填新題（鎖節點 + 該迷思為 distractor A，
        │             B 為正解，C/D 從該節點剩餘且未覆蓋的迷思補滿）→ 開啟編輯 modal
        │
        ├─ 「從題庫挑題」按鈕 → 開啟 QuestionImportDrawer（右側抽屜）
        │   ├─ 預設只顯示與當前 selectedNodeIds 有交集的題組
        │   ├─ 可勾選「顯示全部」切換
        │   └─ 勾選若干題目 → deep clone 並 append 到 quizQuestions（重新編號 1..N）
        │
        ├─ 「自動排序」按鈕（工具列，介於「從題庫挑題」與「新增題目」之間）
        │   ├─ 依知識節點拓撲順序（Kahn's algorithm）重排題目並重新編號
        │   ├─ 使用 src/utils/topoSortNodes.js 的 sortQuestionsByNodeOrder
        │   └─ 題目少於 2 題時 disabled
        │
        ├─ 「新增題目」→ 建立空骨架後開啟編輯 modal
        │
        ├─ EditQuestionModal（單題編輯）
        │   ├─ 題幹、節點、4 個選項各自的 content + diagnosis
        │   ├─ 每個非正解選項旁有「✨ 建議」按鈕（N6, spec-12 §7）
        │   │   → DistractorSuggestPopover → 後端 RAGFlow → 學生真實說法 3 條
        │   ├─ 「AI 潤飾題幹」按鈕（題幹標籤旁）→ POST /api/adaptive/polish-stem
        │   │   → LLM 潤飾後回填題幹 textarea；題幹為空或 pending 時 disabled
        │   └─ 「AI 建議選項」按鈕（選項區段標籤旁）→ POST /api/adaptive/suggest-options
        │       → LLM 建議的選項回填至各欄位；題幹為空或 pending 時 disabled
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

```
教師進入 /teacher/assignments
    │
    ├─ 以矩陣/網格 UI 呈現（題組為列 × 班級為欄）
    │   ├─ 每格顯示：完成率%、submittedCount/totalStudents、截止日期
    │   ├─ 已派發格子依完成率顯示不同顏色：
    │   │   ├─ 100% → 綠色 (#C8EAAE)，狀態文字「已完成」
    │   │   ├─ 1~99% → 黃色 (#FCF0C2)，狀態文字「進行中」
    │   │   └─ 0% → 淺綠 (#EEF5E6)，狀態文字「待作答」
    │   └─ 未派發格子顯示虛線框 + 「派發」按鈕
    │
    ├─ 點擊未派發格子 → AssignPopover（小型 popover）
    │   ├─ 設定截止日期
    │   ├─ 選擇派發模式（toggle 按鈕）：
    │   │   ├─ 「診斷模式」— 首次診斷學生是否持有迷思概念（預設）
    │   │   └─ 「複習模式」— 已完成診斷後的再次練習
    │   ├─ 確認派發 → addAssignment({ targetType:'class', studentIds:[], dispatchMode, ... })
    │   └─ 自動生成 ID: assign-{timestamp}
    │
    └─ 點擊已派發格子 → ManagePopover
        ├─ 可修改截止日期 → updateAssignment()
        ├─ 可查看診斷報告（若有作答資料）
        └─ 可取消派題 → removeAssignment()
```

### 1.4 診斷結果查看流程

「診斷結果」拆為 5 個子分頁，由 `DashboardLayout` 共用「題組選擇器」+ tab 列。
進入 `/teacher/dashboard` 自動 redirect 到 `/teacher/dashboard/overview`，並從 `?quizId=` 載入題組（無則 fallback 到最近檢視 / 第一張可用題組）。

```
教師進入 /teacher/dashboard
    │
    ├─（自動 redirect → /teacher/dashboard/overview?quizId=...）
    │
    ├─ 頂部題組選擇器（DashboardLayout 共用，切換時保留所在子分頁）
    │
    ├─ 子分頁：所有班級總覽（/overview）
    │   ├─ 所有班級 AI 診斷摘要（年級健康狀態 + 跨班診斷句 + 優先介入順序 + 行動建議）
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
    │   ├─ Top 6 高頻迷思橫條圖（依所有班級平均持有率排序）
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
    ├─ 頂部全域篩選器（與 DashboardLayout 共用 AppContext 狀態）：
    │   學年度 ▼ 114 學年度  學期 ▼ 下學期  ☐ 顯示已封存班級
    │
    ├─ 顯示模式切換（與儀表板 ClassesPage 一致）：
    │   [列表] [完整卡片]（預設列表）
    │
    ├─ 瀏覽符合篩選條件的班級（Google Classroom 風的極簡呈現）
    │   ├─ 每列/每卡：色塊 + 班名（大）+ 副標「N 位學生 · 114 下」+ chevron
    │   ├─ 整列/整卡可點 → 進入 /teacher/classes/:classId
    │   ├─ 不放任何 inline 操作按鈕（編輯/封存/刪除統一在詳情頁執行）
    │   └─ 已封存班級：加 50% 灰階濾鏡 + 「已封存」徽章；僅在勾選「顯示已封存」時出現
    │
    ├─ 點擊「+ 新增班級」（ClassManagement 頁首唯一寫入動作）
    │   ├─ ClassFormModal：名稱 / 年級 / 科目 / 學年度（預設當前）/ 學期（預設當前）/ 備註 / 代表色
    │   └─ 提交 → useCreateClass().mutate()
    │
    └─ 點擊班級 → /teacher/classes/:classId（ClassDetail）
        │
        ├─ 頁首：返回 | 班名 [+ 已封存徽章] | [編輯班級] [封存/還原] [🗑刪除]
        │   ├─ 副標：學年度 · 學期 · N 位學生 · 預設密碼說明
        │   └─ status='archived' → 額外顯示米色橫幅「此為歷史班級…」
        │
        ├─ 學生名冊管理（不受班級狀態影響）
        │   ├─ 檢視學生（座號 / 姓名 / 帳號 / 密碼（hover 揭露）/ 操作）
        │   ├─ 新增 / 編輯 / 刪除 → useUpdateClassStudents()
        │   └─ 重設學生密碼 → useResetStudentPassword()
        │
        └─ Class-level 動作（皆在頁首按鈕觸發）
            ├─ 「編輯班級」→ ClassFormModal（isEdit=true）→ useUpdateClass()
            ├─ 「封存」→ window.confirm 提示資料保留 → useArchiveClass()
            ├─ 「還原」（封存後顯示）→ useUnarchiveClass()
            └─ 「刪除」→ DeleteClassModal（兩步驟：警告 → 輸入班名確認）
                └─ useDeleteClass() → navigate('/teacher/classes')
```

> **動作集中原則**：列表/卡片頁面只負責「發現與導航」，所有 class-level 寫入動作（編輯/封存/還原/刪除）都收斂在 ClassDetail 頁首。
> 唯一例外是「新增班級」——因為新增時尚無 classId、不可能在詳情頁觸發，仍由 ClassManagement 頁首按鈕負責。

#### 1.5.1 學年度與學期判定

`src/utils/schoolYear.js` 提供 `getCurrentSchoolYear()` / `getCurrentSemester()`（與後端 `app/utils/school_year.py` 共用同一規則，定義見 spec-04 §2.3）：

- 8/1 ~ 1/31 → 該年度（西元）上學期
- 2/1 ~ 7/31 → 前一年度（西元）下學期

範例：2026-05-22（今日）→ 學年度 = 2025（即 114 學年度）、學期 = `second`（下學期）。

#### 1.5.2 班級生命週期狀態機

```
        [新建班級]
            ↓
       ┌─────────┐    archive    ┌──────────┐
       │ active  │ ─────────────▶ │ archived │
       │         │ ◀───────────── │          │
       └─────────┘    unarchive   └──────────┘
            │                          │
       (預設顯示)               (僅勾選「顯示已封存」時可見)
            │                          │
       完整可寫                  唯讀；歷史 assignment / answer 仍可查
```

**不會自動發生**：學年度切換（8/1）不會自動封存舊班級——避免老師 9 月初還沒整理完就被改狀態。封存一律由教師手動觸發。

#### 1.5.3 篩選器與診斷結果的關聯

**全域 AppContext 篩選器狀態**：`currentSchoolYear` / `currentSemester` / `includeArchivedClasses`，於下列頁面顯示 `<SchoolYearFilter />` 元件、跨頁共用同一份選擇：

| 頁面 | 顯式顯示 SchoolYearFilter | 說明 |
|---|---|---|
| `/teacher/classes` (ClassManagement) | ✅ 頁首 | 班級瀏覽 |
| `/teacher/dashboard/*` (DashboardLayout) | ✅ 頁首 | 跨班診斷統計 |
| `/teacher/diagnosis-logs` (DiagnosisLogs) | ✅ 頁首 | 歷史診斷對話 |
| 其他用 `useClasses()` 的頁面 | ❌ 沉默繼承 | 例如 AssignmentManagement 預設只看當前學年班級，不顯示 chip 但仍受全域 state 影響 |

**規則**：
- 跨班統計（OverviewPage / ClassesPage / MisconceptionsPage / NodesPage）只聚合篩選後的班級
- 歷史紀錄頁（DiagnosisLogs）允許教師切換到舊學年，查閱已封存班級的對話歷史
- 學生個人報告（StudentReportsPage / StudentDiagnosisReport）**保留完整歷史**——學生跨學期表現有教學價值，不受班級封存影響
- 題組（quizzes）與班級解耦：題組是教師資產可重複派發，assignments 才綁定班級與學年
- `QuizLibrary` 的「已派班級」chip 使用 `useClasses({})`（不過濾），因為題組是長期資產、需顯示所有歷史派發對象

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
    │   ├─ 瀏覽可作答的已發佈題組列表
    │   ├─ 檢視歷史作答記錄
    │   └─ 點擊題組 → 進入作答
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
    │   ├─ Phase: followUp（第二階段：AI POE 追問 + 成因追溯）
    │   │   ├─ 過渡訊息：「選擇題的部分結束了！接下來想跟你聊聊剛才的幾道題⋯」
    │   │   ├─ **所有題目皆進入第二層**（不論答對答錯）
    │   │   ├─ 引擎：`followUpEngine.processStudentReply()`（async dispatcher）
    │   │   │   - LLM 模式（12 個官方節點）：呼叫 `runFollowUpTurnLlm`，POE + 蘇格拉底結構
    │   │   │   - Rule-based fallback（自訂迷思節點 / LLM 失敗）：原 3 輪 keyword/regex 啟發式
    │   │   ├─ 對每一題執行 1~4 輪對話（LLM 模式硬上限 4 輪；fallback 仍 3 輪）：
    │   │   │   ├─ Round 1：蘇格拉底式「開場」——先讓學生用自己的話說出推理
    │   │   │   │   - buildRound1Message(option, isCorrect)：錨定學生所選選項，
    │   │   │   │     用「你會這樣選，是因為想到了什麼呢？講一句就好」開場
    │   │   │   │     （帶低壓力鷹架、不洩漏答案、不先給方向；非二選一、不附 chips）
    │   │   │   │   - 二選一 / 比較題 + chips 由後續 LLM belief 輪次接手（見下方 phase 結構）
    │   │   │   │   - LLM phase = "belief"
    │   │   │   ├─ 學生回覆方式（chips / 打字 / 語音 並存）：
    │   │   │   │   - 點 chip 按鈕（推薦給國小生，無打字壓力）→ 直接送出
    │   │   │   │   - 自由打字 → textarea 送出（含 chip 都不對時）
    │   │   │   │   - 語音輸入 → 點麥克風按鈕（Web Speech API, zh-TW），辨識文字 append 到 textarea，再按送出
    │   │   │   ├─ LLM 模式四階段對話結構（POE + 蘇格拉底）：
    │   │   │   │   - belief（信念探索，1~3 輪）：用比較題挖出學生真正相信什麼
    │   │   │   │   - challenge（認知挑戰，1~2 輪）：丟變體實驗（POE Observe），測試一致性
    │   │   │   │   - cause（成因追溯，1~2 輪）：場景喚起 / 類比探測 / 詞彙確認 / 來源歸因 / 信心度
    │   │   │   │   - final（收尾）：輸出 finalDiagnosis JSON
    │   │   │   ├─ Rule-based fallback 策略（沿用既有）：
    │   │   │   │   - deepen / guess / fuzzy / contrast / source / ab / transfer
    │   │   │   ├─ 終止條件 → 產出 finalDiagnosis
    │   │   │   │   { finalStatus, misconceptionCode, reasoningQuality, aiSummary,
    │   │   │   │     statusChange, causeIds（LLM 模式自帶；fallback 為空） }
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
        ├─ 下一步的指引
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

**持久化策略（資料保全）**
- 由 `useQuizPersistence(assignmentId)` 統一管理（前端 `src/hooks/useQuizPersistence.js`）。
- **即時存**：第一層每選一題答案，立刻背景 `POST /api/answers`（單筆 upsert，失敗自動重試 2 次，不阻塞 UI）；第二層每題追問一結束，立刻背景 `POST /api/answers/followups`（內部會等該題答案存完拿到 id）。目的：避免「全部做完才一次送」造成中途離開即整場資料遺失。
- **結尾保險**：`finishQuiz` 仍呼叫 `flushAll()` 整批 re-upsert 一次（冪等），補齊任何即時存遺漏。
- **失敗可見**：任何存檔最終仍失敗 → `saveError` 翻 true，作答畫面頂端顯示警示橫幅提示學生告知監考老師（取代過去靜默吞錯）。
- `assignmentId` 為 null（demo / 無派題情境）時所有存檔皆 no-op，僅前端 `addToHistory`。

**第二層：AI POE 追問 + 成因追溯（followUp phase）**
- 由 `followUpEngine.processStudentReply()`（async dispatcher）執行；雙模式：
  - **LLM 模式**（12 個官方節點）：呼叫 `runFollowUpTurnLlm` → `/api/llm/chat`
  - **Rule-based fallback**（自訂迷思 / LLM 失敗）：原 3 輪 keyword/regex 啟發式
- **對所有題目進行追問**（不論答對答錯）
- LLM 模式對話結構（POE + 蘇格拉底，硬上限 4 輪／題，務必快速收斂）：
  - **belief**（信念探索，第 1 輪）：以開放式開場（`buildRound1Message`）讓學生說出自己的推理（學生若完全答不出可再留 1 輪）
  - **challenge**（認知挑戰，第 2 輪）：丟一個變體實驗（POE Observe）測試信念一致性
  - **cause**（成因追溯，第 3 輪）：**必經階段**——final 前至少問 1 次成因探測（場景喚起 / 類比探測 / 詞彙確認 / 來源歸因 / 信心度），這是教師分析的核心
  - **final**（收尾，第 4 輪為最遲）：輸出 finalDiagnosis JSON；若第 3 輪已能判定可提早。**causeIds 必填**（迷思/不確定時至少 1 個，資訊不足也要做最佳推測）
- 國小生短答友善設計（spec-09 §followup）——**手段是鷹架，終極目標是診斷學生真正的科學概念**：
  - **Chip 快速回覆**：LLM 在每輪附 2~4 個選項（chips 欄位），前端渲染為按鈕，學生點擊即送
  - **承擔語言展開**：bot 把學生的單詞翻譯成完整假設讓學生點頭/搖頭，學生不用組句
  - **漸進釋放（scaffold-and-fade）**：chips/二選一是起手鷹架，當學生暖機、給出有內容的短句後，AI 應撤掉鷹架、邀請他用自己的話「再多講一點」（錨定其說過的詞，非抽象 why）；全程至少引出一次學生自己的完整想法——那是最有診斷價值的線索
  - **禁止抽象 why 提問**：改用具體場景比較題
  - **每輪附「不知道」逃生口**
- LLM 直接輸出結構化結果（每輪）：
  - `{ phase, round, assistantMessage, chips, feedback, finalDiagnosis }`
- 終止後產出 `finalDiagnosis`：
  - `finalStatus`: `'CORRECT' | 'MISCONCEPTION' | 'UNCERTAIN'`
  - `reasoningQuality`: `'SOLID' | 'PARTIAL' | 'WEAK' | 'GUESSING'`
  - `statusChange.changeType`: `'CONFIRMED' | 'UPGRADED' | 'DOWNGRADED'`
  - `causeIds`: `number[]`（1~2 個 1-8 之成因 ID；LLM 模式自帶，fallback 為空）
  - `causeEvidence`: `string`（LLM 在對話中蒐集到的成因證據引文）
- 依 statusChange 自動修正第一層作答記錄：
  - **UPGRADED**（學生選錯但追問展現正確理解）→ 改為 CORRECT
  - **DOWNGRADED**（學生選對但追問顯示猜測或迷思）→ 將 diagnosis 改為迷思碼
- **注意**: `studentDetail`、`studentHint` 不在此階段顯示，僅在最終 StudentReport 中呈現
- **fallback 行為**: LLM 失敗時自動降級到 rule-based 3 輪流程，對外 API 不變

**第三層：迷思成因分析（finalize 時，若診斷為迷思）**
- LLM 模式下，POE prompt 已要求對話過程蒐集成因證據，`finalDiagnosis.causeIds` 通常已自帶
  → 此時 StudentQuiz 直接寫 DB，**跳過** `/api/llm/analyze-cause` 呼叫，省一次 LLM 推論成本
- Rule-based fallback / 自訂迷思 / LLM 模式但 `causeIds` 為空時，系統自動呼叫後端 `POST /api/llm/analyze-cause`
- 後端接收：
  - 對話紀錄（`conversationLog`）
  - 迷思代碼（`misconceptionCode`）
  - 知識節點 ID（`nodeId`）
- LLM 根據對話內容與迷思特徵，從以下 **8 大成因類別** 中判斷 **1～2 個最可能的成因**
  （與 `backend/app/services/cause_analysis_service.py` 及 `src/data/misconceptionCauses.js` 完全對齊）：
  - 1. 學科知識不足或缺乏
  - 2. 概念不清楚或混淆
  - 3. 不正確的推論或運算過程
  - 4. 單憑個人直覺或關鍵字反應
  - 5. 來自日常的經驗和生活中的觀察
  - 6. 日常生活用語與科學用語的混淆
  - 7. 教師的教學過程不當（conditional）
  - 8. 實驗操作不當（conditional）
- 成因 ID 以 `C{1-8}` 標記，存儲於 `followup_results.cause_ids`（JSONB array，最多 2 個）
- **LLM 不可用時的降級**：若呼叫失敗，系統不阻擋流程（不拋錯），`cause_ids` 為空陣列 `[]`；前端會延後顯示成因徽章或不顯示
- **報告顯示**：
  - StudentReport（學生完成後看到的報告頁）：確認迷思旁顯示成因徽章 / tag（如「日常經驗泛化」）
  - StudentDiagnosisReport（教師檢視的學生報告）：同樣顯示成因徽章，幫助教師設計針對性教學

---

## 3. 跨角色交互

```
教師 → 建立題組 (saveQuiz)
         ↓
教師 → 派發題組 (addAssignment)
         ↓
學生 → 作答題組 (recordAnswer)
         ↓
教師 → 檢視診斷結果 (getClassAnswers, getNodePassRates, etc.)
```

**注意**：scenario / treatment（概念釐清・補救）模組已從實驗系統移除，詳見 `docs/deviations.md`。
