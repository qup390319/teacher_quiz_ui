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
    ├─ 步驟一：選擇單元與題型 (Step0Unit)
    │   ├─ 卡片列出所有「使用中」單元（含節點數 / 迷思數）
    │   ├─ 未建好的單元（沒節點或沒迷思）標「建置中」、不可點，點到時提示聯絡管理員
    │   ├─ 單選；切換單元會清空已勾節點與已編題目（先確認）
    │   ├─ **題型選擇**（兩個 toggle 按鈕）：
    │   │   ├─ 「單層診斷」(single)：傳統單選題，選項直接帶迷思碼（預設）
    │   │   └─ 「雙層次診斷」(two-tier)：第一層選答案 + 第二層選理由（Treagust 1988）
    │   ├─ 選定後存入 AppContext `editingQuizMode`，整個精靈共用此模式
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

> 2026-06-20 重構：主清單從「題組×班級矩陣」改為「**題組摘要卡 + 管理派發抽屜**」。
> 主清單只放每份題組的派發摘要（不逐班列出），逐班派發/管理收進右側抽屜，
> 因應班級數量多時矩陣會橫向爆走。詳見 spec-02 §2.6。

```
教師進入 /teacher/assignments
    │
    ├─ 全頁概覽列（OverviewBar）：題組數 / 班級數 / 派發數 / 進行中 / 已完成 / 待作答
    │
    ├─ 題組排序下拉（預設 / 名稱 / 已派班數 / 建立時間）
    │
    ├─ 主清單：每份 published 題組一張「題組摘要卡」(QuizSummaryCard)
    │   ├─ 題組名稱（two-tier 題組加「雙層次」藍標）+ 題數 · 節點數
    │   ├─ 堆疊進度條（完成綠 / 作答中黃 / 待作答淺 / 未派空白）
    │   ├─ 「已派 X/Y 班 · 平均 ○○%」+ 未派 / 待作答 / 作答中 / 完成 小計
    │   └─ 「管理派發」按鈕 → 設定 activeQuizId，開啟右側抽屜
    │
    └─ 點「管理派發」→ 右側滑出抽屜 (AssignmentDrawer，管理「此題組 × 所有班級」)
        ├─ 截止日（選填，套用到下方派發；批次與單筆共用）
        ├─ 搜尋班級框 + 狀態篩選鈕（全部 / 未派發 / 作答中 / 已完成，各帶即時數量）
        │
        ├─ 未派發班級：勾選 +「全選未派發」→「批次派發」
        │   └─ onBatchAssign([classIds], dueDate) → 對每班 addAssignment
        │
        └─ 班級列表（可捲動，依搜尋/篩選）
            ├─ 未派發列：checkbox + 班色點 + 班名/人數 + 「派發」鈕
            │   └─ onAssign(classId, dueDate) → addAssignment({ type:'diagnosis',
            │       targetType:'class', studentIds:[], status:'active', ... })
            └─ 已派發列：班名 + 狀態 badge（已完成綠 / 進行中黃 / 待作答淺）
                + 進度條 + submittedCount/totalStudents（%）+ 截止日
                └─ 點擊展開：
                    ├─ 改截止日 →「儲存」→ updateAssignment()
                    ├─ 「查看診斷報告」（completionRate > 0 才可點）
                    │   → 設 currentClassId/currentQuizId 後導向 /teacher/dashboard
                    └─ 「取消派發」→ 二次確認 → removeAssignment()
```

> **派題模式（診斷/複習）**：後端尚未支援 `dispatch_mode`，現行抽屜固定以 `type:'diagnosis'` 派發，
> 模式選擇 UI 暫不提供（待後端補上 `dispatch_mode` 再接）。

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
            ├─ **[two-tier 題組專屬] QuadrantSummary**：四象限分佈矩陣（TT/TF/FT/FF 各人次與百分比），呈現全班「真理解 vs. 假陽性 vs. 假陰性 vs. 真迷思」分佈；僅在 `quiz.mode === 'two-tier'` 時顯示
            ├─ 迷思概念分佈（可展開學生名單）
            └─ 題目明細矩陣（每題 A/B/C/D 選答分佈 + 對應迷思；two-tier 另顯示理由層甲/乙/丙分佈）
```

**URL query 規則**:
- `?quizId=` 由 `DashboardLayout` 跨 5 個子分頁共用，切換 tab 時保留
- `?classId=` 僅 `class-detail` 使用
- 兩者都同步寫入 `AppContext.currentQuizId / currentClassId` 作「最近檢視」記憶

### 1.4.1 個別學生報告與先備概念追溯（2026-07-09 新增）

從學生列表（`StudentReportsPage`）或迷思排行（`MisconceptionsPage`）點「查看報告」進入
`/teacher/students/:studentId/report`（`StudentDiagnosisReport`，詳見 spec-02b §2.10.1）。

本系統的診斷定位是「**雙層次測驗 + 先備追溯**」：雙層次測驗判定學生*現在*哪個節點出錯，
先備概念追溯再沿知識圖譜往回定位*最早*出問題的先備節點——回答「他是這個節點本身沒學好，
還是更早的基礎就歪了？」

```
教師點開學生個別報告
    │
    ├─ 系統列出該生「持有迷思」的知識節點（追問後最終判定）
    │
    └─ 對每個做錯節點，沿先備鏈往回追溯（PrerequisiteTraceSection）
        │   root 先備 → … → 做錯節點，每節用該生全部歷史作答計算精熟狀態
        │   （≥70% 已精熟 / <70% 未精熟 / 無紀錄＝未施測）
        │
        ├─ 根因 = 鏈上由根往後第一個「未精熟或未施測」的先備
        │   ├─ 未精熟 → 建議先補救該先備，再回頭處理做錯節點
        │   ├─ 未施測 → 建議先派發涵蓋該先備的題組確認基礎
        │   └─ 不存在（先備皆精熟）→ 判定為本節點自身的迷思，直接補救
        │
        └─ 教師依根因決定補救起點（配合建議補強清單的教學影片）
```

- 追溯**跨題組**取證：先備節點的精熟證據可能來自其他題組的作答，故不受頁面題組篩選影響
- 溯源語意與後端適性派題（spec-10 §10 `adaptive_service`）一致；本區塊為前端純函數實作
  （`src/utils/prerequisiteTrace.js`），差異在於前端以「追問後最終判定」計答對，後端以第一層作答診斷計
- 目前知識圖譜為單一單元內的 12 節點先備鏈；跨年級／跨單元追溯待知識節點庫擴充後自然生效（同一套鏈式邏輯）

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
    │   ├─ 左上角「返回」：測驗進行中（phase ≠ done）按下時跳出 `LeaveConfirmModal`
    │   │   確認框（提醒中途離開會丟失作答與對話、測驗將為未完成）；
    │   │   選「繼續作答」留在原頁、選「確定離開」才導回 /student。done 階段直接離開。
    │   │
    │   ├─ Phase: intro
    │   │   ├─ 逐條顯示 3 則歡迎訊息（科學偵探開場、預告兩階段流程、降低壓力）
    │   │   └─ 完成後自動進入 question phase
    │   │
    │   ├─ Phase: question（第一階段：逐題作答，無即時對錯回饋）
    │   │   ├─ **施測中動態選題**：題目順序與集合由後端適性引擎逐題決定
    │   │   │   （非題組固定順序）；每答完一題呼叫 `POST /api/adaptive/next-question`，
    │   │   │   過關跳過先備、答錯退回先備追溯（spec-10 §10.5）。前端以
    │   │   │   `src/pages/student/adaptiveNav.js` 組 payload、對應下一題物件。
    │   │   │   實際問過的題目序列存於 `askedRef`，追問階段與進度、報告皆以此為準。
    │   │   ├─ SystemBubble 顯示題號（動態選題下總題數未定，只顯示序號、不顯示節點名稱）
    │   │   ├─ SystemBubble 顯示題幹
    │   │   │
    │   │   ├─ [single 模式] 學生選擇選項（OptionsPanel：A/B/C/D 四個按鈕）
    │   │   │   ├─ StudentBubble 顯示學生選擇的選項內容
    │   │   │   ├─ commitAnswer 判定 { quadrant, diagnosis } 並即時存檔
    │   │   │   └─ 交由後端適性引擎決定下一題（passed = quadrant==='TT'）
    │   │   │
    │   │   ├─ [two-tier 模式] 雙層作答子流程
    │   │   │   ├─ 子階段 1：選答案（OptionsPanel：A/B/C 三個按鈕）
    │   │   │   │   ├─ StudentBubble 顯示「你選了：{選項內容}」
    │   │   │   │   └─ 暫存 selectedAnswerTag，進入子階段 2
    │   │   │   ├─ 子階段 2：選理由（ReasonOptionsPanel：甲/乙/丙 藍系按鈕）
    │   │   │   │   ├─ SystemBubble 詢問「你選這個答案，是因為...？」
    │   │   │   │   ├─ StudentBubble 顯示「我覺得：{理由內容}」
    │   │   │   │   ├─ 計算四象限：answerCorrect × reasonCorrect → TT/TF/FT/FF
    │   │   │   │   └─ commitAnswer 存檔後交由後端適性引擎決定下一題（passed = quadrant==='TT'）
    │   │   │   └─ （同上）
    │   │   │
    │   │   └─ 後端回傳 done（無更多應診斷節點）→ 進入 followUp phase
    │   │       （單題重做模式 `?retry=` 不走動態選題，只作答該題）
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
    │   │   │   │   - challenge（認知挑戰，第 2 輪）：丟變體實驗請學生預測（POE 的 Predict），測試一致性
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
        ├─ **quiz 解析**：請求 quizId＝in-memory 快照 > 網址 `?quizId=` > 全域 `currentQuizId` > 預設 `'quiz-001'`；
        │   **若該生 history 找不到請求的 quiz，退回其最近一次有資料的紀錄（history 依時間 desc，取 `[0]`），題目/標題以 backendRow 為準**——避免 currentQuizId/網址指到該生沒做過的 quiz 時，明明有資料卻顯示「尚無作答資料」。僅 history 為空（從未作答）才顯示「尚無作答資料」。
        ├─ 統計卡：左「答對題數（已掌握的概念）」/ 右「答錯題數（迷思概念（錯誤的概念））」——以**題數**語意呈現，直接回答學生「我對幾題錯幾題」；「迷思概念」研究正式用詞保留
        ├─ **「每一題的結果」（單欄、逐題依序全展開，不分欄、不摺疊）**：每題一張卡、由上而下依題號排列，國小生照順序往下讀即可——**不需點擊展開**（曾試過兩欄＝一次資訊太多、accordion＝點太多次，皆退回此版）。答錯用 `MisconceptionCard`，資訊順序＝題目脈絡 → **核心對比「你目前的想法」(粉) ↔「科學上是這樣的」(藍)**（橫式平板 `lg:grid-cols-2` 並排，一眼看出落差；正確答案緊鄰你的想法，不再被成因擋住）→ 可能的原因/下一步 → 給你的話。答對用 `QuestionResultCard`。資料來源 `buildQuestionResults`（reportData.js，以 nodeId 對題）：in-memory 走 answerSource、歷史走 backendRow.questionResults；同題多筆只取最新。容器單欄 `max-w-3xl`，橫式（習慣閱讀尺寸 1180×820）放寬到 `lg:max-w-5xl` 以善用寬度
        ├─ 列出被確認的迷思概念（MisconceptionCard）
        │   ├─ 迷思標籤 (label) + 學生端說明 (studentDetail)
        │   │   └─ **低信心委婉呈現**：當該題 reasoningQuality === 'GUESSING'（AI 資訊不足硬給判斷）時，
        │   │       粉框標題由「你目前的想法」改為「你這題可能有的想法」、label 前加「可能是」（純文案，不改判定資料）
        │   ├─ 可能的原因（成因標籤 + studentMeaning + 「下一步可以這樣做」行動框；見 §3 報告顯示）
        │   ├─ 錯誤類別徽章（errorType；**為 null 時不渲染**，不再顯示灰「未分類」）
        │   │   └─ **可點擊**（平板友善、不靠 hover）：點擊跳出 `ErrorTypeInfoModal` 白話解釋彈窗
        │   │       （ERROR_TYPE_STUDENT_EXPLAIN）；正確說法/建議/原理仍直接顯示在卡片上、不放彈窗
        │   ├─ **錯誤類型差異化回饋**：右側藍框標題/圖示隨 errorType 取自 ERROR_TYPE_FEEDBACK，
        │   │   並在正確說法（studentHint）後追加該類型專屬提醒（guidance）；errorType 為 null 時沿用「科學上是這樣的」
        │   ├─ DOWNGRADED 情境標記（作答時選對、深談後確認迷思 → 一句誠實但不打擊的提醒）
        │   ├─ **「這不是我的想法，重新問我這一題」按鈕**（誤判補救）→ 導向單題重做迴圈（見下方）
        │   ├─ **「你在對話中提到」引用**（取最具診斷性的回覆：優先 diagnosis.misconceptionSource，
        │   │   否則濾掉模糊/亂答/模稜兩可空話取最有內容者；**挑不到就不顯示**，寧缺勿濫）
        │   ├─ 學習提示 (studentHint)＝「科學上是這樣的」
        │   └─ **「給你的話」(aiSummary)**：追問針對該題的個人化回饋，連結「你的想法」與「科學解釋」。
        │       **過品質閘才顯示**——含節點/迷思代碼或第三人稱「學生…」旁白的舊摘要不顯示，
        │       改由「可能的原因 → 下一步」承擔回饋（isStudentFacingSummary）
        │   ※ errorType / 引用 / aiSummary / statusChange 四者：剛做完那次走 in-memory 快照；
        │     歷史檢視（重新登入/重整）則 fall back 後端 history 的
        │     errorTypeByMisconception / quoteByMisconception / aiSummaryByMisconception /
        │     statusChangeByMisconception，故還原資料／歷史報告同樣能完整呈現新版卡片
        ├─ **「答對了，但可以更深入理解」黃色區塊**（reasoningQuality 為 WEAK / GUESSING 的題目）
        ├─ 下一步的指引（補救節點由**實際答錯節點 + 其 prerequisites** 推導；有前置需打底時 banner 帶出真實前置節點名）
        └─ 返回首頁按鈕
```

#### 2.1.1 單題重做迴圈（誤判補救「重新問這一題」）

學生看報告時若覺得某張答錯迷思卡「這不是我的想法」，可在卡片底按「這不是我的想法，重新問我這一題」**只重做該題**（選擇題 + 追問），結束後新結果**併回現有報告**。這是「重做該題」而非申訴記錄——讓被誤判的學生有機會表達真正的想法，不另存申訴資料。

```
StudentReport 答錯迷思卡 → 按「重新問我這一題」
  └─ handleDispute(questionId) → navigate(/student/quiz/{quizId}?retry={questionId})
       └─ StudentQuiz 進入「單題重做模式」（讀網址參數 ?retry=questionId）
            ├─ 只跑該題（過濾 questionPool，僅留 id === retryQuestionId；不走動態選題）
            ├─ 跳過開場 intro
            ├─ 保留現有報告（不清空 activeStudentReport）
            └─ 收尾走 finishRetry（不建立新報告、不 addToHistory）
                 ├─ 取該題新作答 + 追問結果
                 ├─ mergeRetryIntoReport(questionId, { answer, followUpResult })
                 │    （替換 activeStudentReport 中同題的 answer 與 followUpResult，
                 │     重算 correctCount 與 misconceptions；報告為空時不動）
                 └─ 導回 /student/report
```

- **後端零改動**：沿用既有逐題 upsert 的 `saveAnswer` / `saveFollowup`（spec-09 / spec-11 既有端點），不新增欄位或端點。重做的資料逐題存進 DB，從歷史頁進來（`activeStudentReport` 為空）時由後端來源呈現。
- 相關函式：`AppContext.mergeRetryIntoReport`（spec-04 §1.3）、`StudentQuiz.finishRetry`、`StudentReport.handleDispute`。

### 2.2 迷思概念診斷機制

> **外層：施測中動態選題（適性診斷）**。第一層作答不是照題組固定順序線性前進,而是由後端適性引擎依先備圖譜逐題決定:**過關跳過先備、答錯退回先備追溯**（限題組內既有先備,spec-10 §10.5）。此即「雙層次測驗 + 適性診斷」——雙層次測驗判定學生*現在*哪個節點出錯,動態選題再*當場*沿先備鏈定位最早出問題的節點。跨年級／跨單元追溯待知識節點庫擴充後以同一套鏈式邏輯生效;先備不在題組內時,改由教師端報告的「先備概念追溯」（spec-02b §2.10.1）事後補上。

診斷流程依題組 `mode` 分為 **single（傳統單層）** 與 **two-tier（雙層次，Treagust 1988）** 兩種，兩者並存靠 `mode` 旗標分流，之後皆接同一套批次 AI 蘇格拉底追問：

**single 模式 — 第一層：作答自動診斷（question phase 中）**
- 每題作答時，根據選項的 `diagnosis` 欄位即時記錄：
  - `'CORRECT'` → 記錄為正確
  - 迷思概念 ID（如 `'M02-1'`）→ 記錄為該迷思概念
- 此階段**不給予任何對錯回饋**，學生不知道自己答對或答錯
- 所有題目作答完成後，才進入第二層

**two-tier 模式 — 第一層：雙層作答（question phase 中）**
- 每題分兩個子步驟：① 選答案（A/B/C）→ ② 選理由（甲/乙/丙）
- 系統依「答案對錯 × 理由對錯」計算**四象限**（`TT / TF / FT / FF`，詳見 spec-04 §2.1）
- 迷思碼取自錯誤理由（TF/FF 帶 M-code；TT/FT 為 CORRECT）
- 節點通過＝ `TT`；此階段**不給任何對錯回饋**
- 作答結果除含 `selectedTag / diagnosis` 外，另多帶 `reasonTag / quadrant`
- 所有題目完成後，進入同一套 AI 追問（followUp phase）

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
- **答案分類分流（先引導再判斷，spec-09 §12.4b）**：第 1 輪 belief 先把學生回答分為 解釋型/定義型/觀察型（即 `errorType` 三類，不另立欄位）。解釋型 → 照常深入追問；定義型/觀察型 → 先用**一次錨定式 why** 引導向因果，引出因果才接 cause→final、引不出即溫和收尾。第 1 輪所判型態即為收尾的 `errorType`。
- LLM 模式對話結構（POE + 蘇格拉底，硬上限 4 輪／題，務必快速收斂）：
  - **belief**（信念探索，第 1 輪）：以開放式開場（`buildRound1Message`）讓學生說出自己的推理（學生若完全答不出可再留 1 輪）；並把回答分為三類作為分流依據
  - **challenge**（認知挑戰，第 2 輪）：丟一個變體實驗、請學生**預測**結果（POE 的 **Predict**——以預測與原信念的落差製造認知衝突；本系統純文字、無實體演示，僅取 POE 預測環節，不含真實 Observe / Explain）
  - **cause**（成因追溯，第 3 輪）：**必經階段**——final 前至少問 1 次成因探測（場景喚起 / 類比探測 / 詞彙確認 / 來源歸因 / 信心度），這是教師分析的核心
  - **final**（收尾，第 4 輪為最遲）：輸出 finalDiagnosis JSON；若第 3 輪已能判定可提早。**進 final 硬前提**：除非第 4 輪或觸發逃生例外（已展現正確理解／明確 2 次要結束／連 2 次說不出來），否則「未引出學生一次完整自述」前不得進 final。**causeIds 必填**（迷思/不確定時至少 1 個，資訊不足也要做最佳推測）
- 國小生短答友善設計（spec-09 §followup）——**手段是鷹架，終極目標是診斷學生真正的科學概念**：
  - **Chip 快速回覆**：LLM 在每輪附 2~4 個選項（chips 欄位），前端渲染為按鈕，學生點擊即送
  - **承擔語言展開**：bot 把學生的單詞翻譯成完整假設讓學生點頭/搖頭，學生不用組句
  - **漸進釋放（scaffold-and-fade）**：chips/二選一是起手鷹架，當學生暖機、給出有內容的短句後，AI 應撤掉鷹架、邀請他用自己的話「再多講一點」；**全程必須至少引出一次學生自己的完整想法（為進 final 之硬前提）**——那是最有診斷價值的線索
  - **分級提問（why 的條件解禁）**：學生只給單詞/「不知道」→ 維持具體場景二選一、**禁任何 why**；學生已給出有內容短句 → 可用**一次「錨定式 why」**（錨定其說過的詞/情境，例「你說『太燙會壞掉』，怎麼會這樣想呢？」），且 **cause 階段已給長句時優先用此「推理歸因」招式取代場景二選一**；**仍嚴禁抽象、懸空的「你為什麼這樣覺得」**
  - **每輪附「不知道」逃生口**
- LLM 直接輸出結構化結果（每輪）：
  - `{ phase, round, assistantMessage, chips, feedback, finalDiagnosis }`
- 終止後產出 `finalDiagnosis`：
  - `finalStatus`: `'CORRECT' | 'MISCONCEPTION' | 'UNCERTAIN'`
  - `reasoningQuality`: `'SOLID' | 'PARTIAL' | 'WEAK' | 'GUESSING'`
  - `statusChange.changeType`: `'CONFIRMED' | 'UPGRADED' | 'DOWNGRADED'`
  - `causeIds`: `number[]`（1~2 個 1-9 之成因 ID；LLM 模式自帶，fallback 為空）
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
- LLM 根據對話內容與迷思特徵，從以下 **9 大成因類別** 中判斷 **1～2 個最可能的成因**
  （與 `backend/app/services/cause_analysis_service.py` 及 `src/data/misconceptionCauses.js` 完全對齊）：
  - 1. 概念缺失
  - 2. 概念混淆
  - 3. 日常經驗的直觀建構
  - 4. 日常語言的字面干擾
  - 5. 直覺反應
  - 6. 推理謬誤（含因果倒置）
  - 7. 過度類推
  - 8. 教學與教材因素（conditional）
  - 9. 實驗操作不當（conditional）
- 成因 ID 以 `C{1-9}` 標記，存儲於 `followup_results.cause_ids`（JSONB array，最多 2 個）
- **LLM 不可用時的降級**：若呼叫失敗，系統不阻擋流程（不拋錯），`cause_ids` 為空陣列 `[]`；前端會延後顯示成因徽章或不顯示
- **報告顯示**：
  - StudentReport（學生完成後看到的報告頁）：確認迷思的「可能的原因」區塊不只顯示成因標籤，還附：
    ① 一句理由副標（向孩子說明「知道為什麼會這樣想，下次就能改進」，避免被當成指責）；
    ② 每個成因的兒童語意義 `studentMeaning`（第二人稱、不指責）；
    ③ 綠色「下一步可以這樣做」框，彙整各成因的 `studentTip` 行動建議——把成因從冷標籤變成有回饋的學習引導。
    成因文案見 `src/data/misconceptionCauses.js` 的 `studentMeaning` / `studentTip`。
  - StudentDiagnosisReport（教師檢視的學生報告）：僅顯示成因標籤（`name`），幫助教師設計針對性教學

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
