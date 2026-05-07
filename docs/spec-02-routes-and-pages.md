# SPEC-02: Routes & Pages / 路由與頁面規格

## 1. 路由架構

所有路由定義於 `src/App.jsx`，使用 `react-router-dom` 的 `BrowserRouter` + `Routes` + `Route`。
全域狀態以 `<AuthProvider> > <AppProvider>` 巢狀包裹所有路由。

### 1.0 受保護路由（P1 起）

`src/components/RequireAuth.jsx` 提供 `<RequireAuth role="teacher|student">` wrapper：
- bootstrap 中（`useAuth().loading=true`）顯示「載入中…」
- 未登入 → `<Navigate to="/" replace />`
- role 不符 → `<Navigate to="/" replace />`

所有 `/teacher/*` 路由由 `<RequireAuth role="teacher">` 包起，所有 `/student/*` 路由由 `<RequireAuth role="student">` 包起。`/` 與 `*`（404）不受保護。

詳見 spec-13 §8。

### 1.1 路由對照表

| 路徑 | 元件 | 說明 | 佈局 |
|------|------|------|------|
| `/` | `LoginPage` | 角色選擇（登入）頁 | 無（全螢幕） |
| `/teacher` | `TeacherDashboard` | 教師主頁：三步驟工作流程總覽 | `TeacherLayout` |
| `/teacher/dashboard` | `DashboardLayout` | 診斷結果共用 layout（標題 + 考卷選擇器 + 子分頁），自動 redirect 到 `overview` | `TeacherLayout` |
| `/teacher/dashboard/overview` | `OverviewPage` | 子分頁：全年級診斷總覽（AI 摘要 + 4 指標卡 + 班級分布散佈圖） | `DashboardLayout` |
| `/teacher/dashboard/classes` | `ClassesPage` | 子分頁：各班學習狀況總覽（班級狀態卡片，點擊跳轉 class-detail） | `DashboardLayout` |
| `/teacher/dashboard/nodes` | `NodesPage` | 子分頁：知識節點跨班比較（並排長條圖） | `DashboardLayout` |
| `/teacher/dashboard/misconceptions` | `MisconceptionsPage` | 子分頁：跨班高頻迷思 Top 6 + 班級 × 迷思熱力圖 | `DashboardLayout` |
| `/teacher/dashboard/class-detail` | `ClassDetailPage` | 子分頁：各班詳細診斷報告（含派題完成率清單 + 該班 SingleClassReport） | `DashboardLayout` |
| `/teacher/quiz/create` | `QuizCreateWizard` | 出題精靈（多步驟） | `TeacherLayout` |
| `/teacher/quizzes` | `QuizLibrary` | 考卷庫：瀏覽與管理考卷 | `TeacherLayout` |
| `/teacher/assignments` | — | 舊路由，redirect 至 `/teacher/assignments/diagnosis` | — |
| `/teacher/assignments/diagnosis` | `AssignmentManagement` | 派題管理：指派**診斷考卷**給班級 | `TeacherLayout` |
| `/teacher/assignments/scenarios` | `AssignmentManagement` (initialTab="scenario") | 派題管理：指派**情境治療考卷**給班級（與診斷派題共用同一頁面、預設情境 tab） | `TeacherLayout` |
| `/teacher/classes` | `ClassManagement` | 班級管理：檢視班級名冊 | `TeacherLayout` |
| `/teacher/classes/:classId` | `ClassDetail` | 班級詳情：個別班級學生資訊 | `TeacherLayout` |
| `/teacher/knowledge-map` | `KnowledgeMap` | 知識地圖：知識節點層級結構 | `TeacherLayout` |
| `/teacher/report` | `TeacherReport` | 舊版診斷報告（保留向後相容） | `TeacherLayout` |
| `/teacher/scenarios` | `ScenarioLibrary` | **（規劃，波次 2）** 情境考卷庫（治療模組，spec-08） | `TeacherLayout` |
| `/teacher/scenarios/create` | `ScenarioCreateWizard` | **（規劃，波次 2）** 情境考卷出題精靈 | `TeacherLayout` |
| `/teacher/scenarios/:scenarioQuizId/edit` | `ScenarioCreateWizard` | **（規劃，波次 2）** 編輯既有情境考卷 | `TeacherLayout` |
| `/teacher/treatment-logs` | `TreatmentLogs` | **（規劃，波次 2）** 治療對話紀錄總覽 | `TeacherLayout` |
| `/teacher/treatment-logs/:sessionId` | `TreatmentLogDetail` | **（規劃，波次 2）** 單一 session 完整對話紀錄 | `TeacherLayout` |
| `/student` | `StudentHome` | 學生首頁：瀏覽可作答考卷（含診斷與情境兩區塊） | 簡易 Header |
| `/student/quiz/:quizId` | `StudentQuiz` | 對話式診斷測驗介面 | 簡易 Header |
| `/student/scenario/:scenarioQuizId` | `ScenarioChat` | **（規劃，波次 3）** 情境治療對話頁（spec-08） | 全螢幕 |
| `/student/report` | `StudentReport` | 個人學習健康報告 | 簡易 Header |
| `*` | `Navigate to /` | 404 重導向首頁 | — |

> **註**：標註「（規劃，波次 N）」的路由為 spec-08 治療模組規劃中路由，
> 目前僅資料模型與 mock bot 已實作（波次 1），實際頁面元件將在波次 2、3 完成。

### 1.2 路由參數

| 參數 | 型別 | 使用頁面 | 說明 |
|------|------|----------|------|
| `:classId` | string | `ClassDetail` | 班級 ID（如 `class-A`） |
| `:quizId` | string | `StudentQuiz` | 考卷 ID（如 `quiz-001`） |
| `:scenarioQuizId` | string | `ScenarioChat` / `ScenarioCreateWizard`（編輯模式） | 情境考卷 ID（如 `scenario-002`） |
| `:sessionId` | string | `TreatmentLogDetail` | 治療 session ID |

### 1.3 URL Query 參數（診斷結果子分頁共用）

| 參數 | 使用頁面 | 說明 |
|------|----------|------|
| `?quizId=...` | 所有 `/teacher/dashboard/*` 子分頁 | 由 `DashboardLayout` 讀寫，控制要查看的考卷；切換子分頁時保留；同步寫回 `AppContext.currentQuizId` 作「最近檢視」記憶 |
| `?classId=...` | 僅 `/teacher/dashboard/class-detail` | 控制要查看哪一個班級的詳細報告；無此參數時顯示班級選擇空狀態；同步寫回 `AppContext.currentClassId` |

## 2. 各頁面詳細規格

---

### 2.1 LoginPage (`/`)
**檔案**: `src/pages/LoginPage.jsx`

**功能描述**:
- 系統入口頁面，提供角色選擇
- 點選「教師端」→ 設定 `role = 'teacher'`，導航至 `/teacher`
- 點選「學生端」→ 設定 `role = 'student'`，導航至 `/student`

**視覺風格**: 日系手遊冒險風（木框收集冊 + irasutoya 草原天空背景 + 角色選擇感）。靈感來自 Cat Game 等日系養成手遊的「冒險入口畫面」。

**UI 元素**:
- **背景**：全幅 `irasutoya` 風格 JPG `src/assets/backgrounds/bg_chiheisen_green.jpg`（藍天 + 白雲 + 綠地，地平線置中）；無額外覆蓋層，木框元件本身具足夠對比即可閱讀
- **共用木框工具 class**（定義於 LoginPage 內部常數）：
  - `WOOD_OUTER` — 雙層深褐木紋邊（`from-[#C19A6B] to-[#8B5E3C]` 漸層 + 5px padding + `rounded-[28px]` + 立體複合陰影 `shadow-[0_6px_0_-1px_#5A3E22,0_14px_24px_-6px_rgba(91,66,38,0.45)]`）
  - `WOOD_INNER_CREAM` — 內層米色頁面（`from-[#FFF8E7] to-[#FBE9C7]` 漸層 + 白色半透明細邊 + `rounded-[22px]`）
- **頂部狀態列（手遊風）**：
  - **左**：吉祥物頭像（木框內嵌 `irasutoya_hero.png`，`animate-breath`）+ 品牌 pill（`science` icon + `SciLens` 字樣，Fredoka 字體）
  - **右**：齒輪設定按鈕（木框 + Material Symbols `settings`），hover 旋轉 45deg
- **中央標題木牌**：木框包覆，內含「迷思概念診斷」（Fredoka 大字深褐色）+ 副標「以『水溶液』單元為例 · 國小自然」
- **兩個角色卡（教師橙木 / 學生藍木）**：
  - 結構：木框外殼 (`WOOD_OUTER`) + 米色頁面 (`WOOD_INNER_CREAM`) + 內容垂直排列
  - **頂部招牌（SignBoard）**：圓角膠囊 + 立體木牌風格，從卡片頂部突出 (`-mt-10`)
    - 教師：綠底 (`from-[#B8DC83] to-[#7DB044]`) + 字「我是老師」
    - 學生：藍底 (`from-[#86CEF5] to-[#4A9FD8]`) + 字「我是學生」
  - **角色頭像方框**：128×128 米色漸層 + 白邊 3px + 內陰影 + 4 角木紋小釘；內嵌 irasutoya 插圖（教師：`irasutoya_teacher.png`；學生：`irasutoya_student_boy.png` + `_girl.png` 並排）；hover 時方框微旋轉 -2deg、角色 scale 110%
  - **三星評等 StarRating**：⭐⭐⭐（`star` filled icon，黃 `#F4C545` + 底部投影模擬立體）
  - **副標**：簡短一句話（教師「出題、查看班級迷思、獲得教學建議」；學生「對話式診斷，獲得個人學習體檢」）
  - **CTA 按鈕**：肥大圓角膠囊 + 漸層底 + 木紋色邊框 + 立體陰影 + 大字「GO」+ `play_arrow` icon；hover 時陰影縮短 + 按下沉 0.5
    - 教師：橙木漸層 (`from-[#F0B962] to-[#D08B2E]`)
    - 學生：藍漸層 (`from-[#5DADE2] to-[#2E86C1]`)
  - **ⓘ 圓木紐扣**（卡片右上角，超出邊界 -top-2 -right-2）：圓形米色木框（`border-[3px] border-[#8B5E3C]`）+ `info` icon + 立體陰影；hover 旋轉 12deg + 縮放 110%
  - **功能說明 Popover**：木框包覆（沿用 `WOOD_OUTER` + `WOOD_INNER_CREAM`） + 上方木紋小三角箭頭指向 ⓘ + 標題「📖 主要功能」+ 特性清單
- **底部資訊條**：木框迷你 pill + `account_tree` icon + 「水溶液單元 · INe-II-3-01 至 INe-Ⅲ-5-7（共 12 個知識節點）」
- **動畫**：
  - 載入：整頁以 `animate-fade-up` 系列 stagger（頂部列 → 標題 → 教師卡 +0.15s → 學生卡 +0.30s → 底部 +0.45s）
  - 互動：卡片 hover 用 cubic-bezier(0.34,1.56,0.64,1) 彈簧曲線（`-translate-y-1` + `scale-[1.02]`）；ⓘ 紐扣 hover 旋轉縮放；齒輪 hover 旋轉
  - 待機：吉祥物頭像 `animate-breath` 呼吸縮放

**輔助元件（內部 component）**:
- `Icon` — Material Symbols Rounded 包裝（支援 `filled` 屬性）
- `SignBoard` — 角色名招牌（綠/藍漸層膠囊 + 立體陰影）
- `StarRating` — 三星評等（黃星 + 底部投影）
- `RoleCard` — 單張角色選擇卡（包含木框、招牌、頭像、星等、副標、CTA、ⓘ 紐扣、popover）

**素材依賴**:
- 背景圖：`src/assets/backgrounds/bg_chiheisen_green.jpg`（irasutoya 草原藍天）
- 圖示：Google Fonts Material Symbols Rounded（於 `index.html` 載入）
- 字體：Google Fonts Fredoka（英文/數字 game-style 字體，類別 `.font-game`）+ Noto Sans TC（中文）
- 插圖：`src/assets/illustrations/irasutoya_{hero,teacher,student_boy,student_girl}.png`
- 動畫類別：定義於 `src/index.css`（`fade-up` 系列、`breath`、`jelly` 等）

**狀態依賴**: `setRole` (from AppContext)

---

### 2.2 TeacherDashboard (`/teacher`)
**檔案**: `src/pages/teacher/TeacherDashboard.jsx`

**功能描述**:
- 教師端主頁，呈現三步驟工作流程概覽：
  1. 選擇/建立考卷
  2. 派發給班級
  3. 查看診斷結果
- 提供快速導航至各功能頁面

**UI 元素**:
- 三步驟流程卡片
- 快速操作按鈕（新增考卷、查看結果等）
- 最近活動摘要

**佈局**: 使用 `TeacherLayout` 側邊欄

---

### 2.3 診斷結果頁群（`/teacher/dashboard/*`）

> 將原 `DashboardReport` 拆成 5 個子分頁，避免單頁資訊量過大。
> 共用 `DashboardLayout` 提供標題列、考卷選擇器、5 個子分頁 tab；子頁透過 `useOutletContext()` 取得共享資料。

#### 2.3.0 DashboardLayout (`/teacher/dashboard`)
**檔案**: `src/pages/teacher/dashboard/DashboardLayout.jsx`

**功能描述**:
- 診斷結果頁群的共用容器
- 讀取 `?quizId=` query，驗證是否為已派發的考卷；無效或未指定時自動 fallback 為 `AppContext.currentQuizId` 或第一張可用考卷，並寫回 URL（replace）
- 透過 `<Outlet context={{ quizId, overviewData, classes, assignments, quizzes }}>` 把計算好的跨班 `overviewData` 傳給子頁
- `/teacher/dashboard` 本身 index 路由 `<Navigate to="overview" replace />`

**UI 元素**:
- 頂部標題列：標題「診斷結果」+ 副標（顯示目前考卷）
- 右上：考卷選擇器（下拉選單，切換時更新 query 並清掉 `classId`）
- 子分頁 tab 列：5 個 NavLink，切換時保留 `searchParams`
- 派題資料為空時：顯示空狀態（不渲染 `<Outlet />`）

**狀態依賴**:
- `useApp()`：`classes`, `quizzes`, `assignments`, `currentQuizId`, `setCurrentQuizId`
- `useSearchParams()`：`quizId`, `classId`

#### 2.3.1 OverviewPage (`/teacher/dashboard/overview`)
**檔案**: `src/pages/teacher/dashboard/OverviewPage.jsx`

**內容**: `OverallAIDiagnosisSummary` + 4 個指標卡（涵蓋班級 / 平均完成率 / 平均掌握率 / 需關注班級）+ `ClassScatterChart`（完成率 × 掌握率班級分布）

#### 2.3.2 ClassesPage (`/teacher/dashboard/classes`)
**檔案**: `src/pages/teacher/dashboard/ClassesPage.jsx`

**內容**: `ClassStatusCards`（每班三項核心指標卡片）。點擊任一卡片 → 導航到 `class-detail?classId=...&quizId=...`

#### 2.3.3 NodesPage (`/teacher/dashboard/nodes`)
**檔案**: `src/pages/teacher/dashboard/NodesPage.jsx`

**內容**: `CrossClassNodeChart`（同一概念節點各班通過率並排長條比較）

#### 2.3.4 MisconceptionsPage (`/teacher/dashboard/misconceptions`)
**檔案**: `src/pages/teacher/dashboard/MisconceptionsPage.jsx`

**內容**: `TopMisconceptionsChart`（跨班高頻迷思 Top 6 橫條圖）+ `ClassMisconceptionHeatmap`（班級 × 迷思熱力圖）

#### 2.3.5 ClassDetailPage (`/teacher/dashboard/class-detail`)
**檔案**: `src/pages/teacher/dashboard/ClassDetailPage.jsx`

**內容**:
- 上方：各班派題完成率清單（每張卡片可點擊切換 `?classId=`，被選中的卡片顯示綠框）
- 下方：依 `?classId=` 渲染對應班級的 `SingleClassReport`（4 個指標卡 + AI 診斷摘要 + 本週行動清單 + 各概念掌握程度 + 迷思概念分佈 + 題目明細矩陣）
- 無 `classId` 時顯示「請從上方清單選擇班級」空狀態

**狀態依賴**:
- 透過 `useOutletContext()` 取得 `quizId`, `overviewData`, `classes`, `assignments`, `quizzes`
- `useSearchParams()`：`classId`（同步寫入 `AppContext.currentClassId`）

**共用元件**（位於 `src/pages/teacher/dashboard/shared/`）:
- `helpers.js` — 常數（`CLASS_KEY_MAP`, `CLASS_CHART_COLORS`）與 `computeOverviewForQuiz`、`getAssignment`、`getAvailableQuizzesForClass`、`getAllAssignedQuizzes`、`getLatestQuizIdForClass`
- `OverallAIDiagnosisSummary.jsx`、`ClassStatusCards.jsx`、`CrossClassNodeChart.jsx`、`TopMisconceptionsChart.jsx`、`ClassMisconceptionHeatmap.jsx`、`ClassScatterChart.jsx`
- `SingleClassReport.jsx`（含 4 指標卡 + 子組件 `AIDiagnosisSummary.jsx`、`WeeklyActionChecklist.jsx`、`BreakdownChart.jsx`、`MisconceptionDistribution.jsx`、`HeatmapView.jsx`）

**資料來源**:
- `getClassAnswers(quizId, classId)`
- `getNodePassRates(quizId, classId)`
- `getMisconceptionStudents(quizId, classId)`
- `getQuestionStats(questionIndex, quizId, classId)`

---

### 2.4 QuizCreateWizard (`/teacher/quiz/create`)
**檔案**: `src/pages/teacher/quiz/QuizCreateWizard.jsx`

**功能描述**:
- 兩步驟出題精靈容器
- 管理當前步驟狀態
- 步驟間資料傳遞

**子元件**:

#### Step 1: Step1Nodes
**檔案**: `src/pages/teacher/quiz/Step1Nodes.jsx`
- 互動式知識節點選擇介面
- 顯示所有 8 個知識節點（按 level 分組）
- 核取方塊勾選/取消節點
- 選取的節點 ID 存入 `selectedNodeIds`

#### Step 2: Step2Edit
**檔案**: `src/pages/teacher/quiz/Step2Edit.jsx`
- 根據選定的知識節點載入對應題目
- 可編輯題幹（stem）與選項（options）
- 可編輯各選項的迷思概念對應（diagnosis）
- **CoveragePanel 補洞**：每個節點下列出尚未被任一選項覆蓋的迷思 chips；點擊 chip 直接建立預填的新題目（鎖定該節點 + 該迷思為 distractor），並開啟編輯 modal
- **從題庫挑題**（`QuestionImportDrawer`）：右側抽屜列出所有考卷，展開後勾選題目即可深拷貝匯入；預設只顯示與當前 `selectedNodeIds` 有交集的考卷，可切換顯示全部
- **草稿暫存**：
  - 「儲存草稿」按鈕：以 `status: 'draft'` 立即上傳；首次儲存後將回傳的 quiz id 寫入 `editingQuizId`，後續儲存改走 PUT
  - 自動暫存：30 秒 debounce，依賴 `quizTitle / quizQuestions / selectedNodeIds`；底部 status pill 顯示「已自動儲存於 HH:mm」
  - 編輯既有 `published` 卷時自動暫存停用，避免降級為草稿（顯示「此卷已發布，自動暫存停用」）
- 「儲存並發布」按鈕：以 `status: 'published'` 儲存後跳回 `/teacher/quizzes`，並清空 `editingQuizId`

**子元件**（皆位於 `src/components/teacher/quizEditor/`）:
- `EditQuestionModal` — 單題編輯 modal，整合 N6 干擾選項建議
- `DeleteQuestionModal` — 刪除確認 modal
- `PreviewQuizModal` — 學生端預覽
- `CoveragePanel` — 涵蓋率 + 補洞 chips
- `QuestionImportDrawer` — 題庫挑題抽屜

**狀態依賴**: `selectedNodeIds`, `setSelectedNodeIds`, `quizQuestions`, `setQuizQuestions`, `editingQuizId`, `setEditingQuizId`, `editingQuizStatus`, `setEditingQuizStatus`, `useSaveQuiz`

---

### 2.5 QuizLibrary (`/teacher/quizzes`)
**檔案**: `src/pages/teacher/QuizLibrary.jsx`

**功能描述**:
- 瀏覽所有已建立的考卷
- 可進入編輯模式修改考卷（沿用同一 quiz id；草稿顯示「繼續編輯」）
- **複製為新考卷**：以該卷為範本（深拷貝題目、節點），導向 `/teacher/quiz/create?step=2` 並清空 `editingQuizId`，儲存時走 POST 建立新考卷
- 可刪除草稿狀態考卷（已發布卷不顯示刪除按鈕）

**UI 元素**:
- **頂部 tab 列**：`全部` / `題庫（已發布）` / `草稿`，每個 tab 帶數量徽章；預設停在「題庫（已發布）」（與「派題」流程的可選清單一致）
- 考卷卡片列表（狀態徽章、標題、題數、節點 badges、已派班級、建立日期）
- 狀態徽章：`draft`（黃底「草稿」）/ `published`（綠底「已發布」）
- 操作按鈕：編輯 / 繼續編輯、複製為新考卷、刪除草稿（僅草稿可見）
- 各 tab 的空狀態：`草稿` tab 提示「按儲存草稿即可暫存」、`題庫` tab 提示「按儲存並發布即可加入題庫」

**狀態依賴**: `quizzes`, `useDeleteQuiz`, `setEditingQuizId`, `setEditingQuizStatus`, `setQuizQuestions`, `setSelectedNodeIds`

---

### 2.6 AssignmentManagement (`/teacher/assignments/diagnosis`)
**檔案**: `src/pages/teacher/AssignmentManagement.jsx`

**功能描述**:
- 管理**診斷考卷**派發記錄（情境考卷派題請見 §2.6.1，沿用同一元件）
- 新增派題：選擇考卷 → 選擇班級 → 設定截止日期
- 檢視已派題記錄及完成狀態
- 可刪除或更新派題

> **路由說明**：舊路由 `/teacher/assignments` 已改為 redirect 至 `/teacher/assignments/diagnosis`，
> 以維持與既有書籤、舊連結的相容性。Sidebar「派題」群組展開後，「step 1. 診斷考卷」即指向此頁。

**UI 元素**:
- 派題列表（考卷名稱、班級、指派日期、截止日期、完成率）
- 新增派題表單/對話框
- 完成率進度條

**狀態依賴**: `assignments`, `addAssignment`, `updateAssignment`, `removeAssignment`, `quizzes`, `classes`

---

### 2.6.1 情境派題 (`/teacher/assignments/scenarios`)
**檔案**: `src/pages/teacher/AssignmentManagement.jsx`（同 §2.6，以 `initialTab="scenario"` prop 帶入）

**功能描述**:
- 將已 published 的情境治療考卷指派給班級
- 與診斷派題共用 `AssignmentManagement` 元件；路由差異僅在於預設選中的 tab
- 矩陣資料來源為 `assignments.filter(a => a.type === 'scenario')`，矩陣中以 `scenarioQuizId` 對應已 published 的情境考卷
- 派題目標支援 `class`（整班）與 `students`（指定學生），後者透過 `AssignTargetPicker` modal 選取

**UI 元素**:
- 頁首：與診斷派題共用「派題管理」標題與 tab 列（📝 診斷考卷 / 🌱 情境考卷）
- 矩陣：列為情境考卷、欄為班級；空格點擊開啟 `AssignTargetPicker`，已派格子點擊開啟 `ManagePopover`

**狀態依賴**: `assignments`, `scenarios` (via `useScenarios`), `classes`, `addAssignment`, `updateAssignment`, `removeAssignment`

---

### 2.7 ClassManagement (`/teacher/classes`)
**檔案**: `src/pages/teacher/ClassManagement.jsx`

**功能描述**:
- 檢視所有班級及其基本資訊
- 點擊班級卡片進入班級詳情

**UI 元素**:
- 班級卡片（班級名稱、年級、科目、學生人數、顏色標識）
- 導航至 `/teacher/classes/:classId`

**狀態依賴**: `classes`

---

### 2.8 ClassDetail (`/teacher/classes/:classId`)
**檔案**: `src/pages/teacher/ClassDetail.jsx`

**功能描述**:
- 顯示特定班級的詳細資訊
- 學生名冊（姓名、座號）
- 可編輯學生名單

**UI 元素**:
- 班級資訊頭部（名稱、年級、科目）
- 學生列表（可新增/移除學生）
- 返回按鈕

**狀態依賴**: `classes`, `updateClassStudents`
**路由參數**: `classId`

---

### 2.9 KnowledgeMap (`/teacher/knowledge-map`)
**檔案**: `src/pages/teacher/KnowledgeMap.jsx`

**功能描述**:
- 以層級結構展示所有知識節點
- 顯示各節點的迷思概念列表
- 顯示先備知識關聯
- 提供教學策略建議

**UI 元素**:
- 知識節點卡片（按 level 1~4 分層展示）
- 各節點包含：名稱、描述、迷思概念列表、教學策略
- 先備知識連線/箭頭
- 各節點群組使用對應色彩（NODE_GROUP_COLORS）

**資料來源**: `knowledgeNodes` (from knowledgeGraph.js)

---

### 2.10 TeacherReport (`/teacher/report`)
**檔案**: `src/pages/teacher/TeacherReport.jsx`

**功能描述**:
- 舊版診斷報告頁面
- 保留以避免路由失效（向後相容）

---

### 2.11 StudentHome (`/student`)
**檔案**: `src/pages/student/StudentHome.jsx`

**功能描述**:
- 學生端首頁，呈現「我的任務看板」
- 動態列出**老師指派給該生班級**的派題；不顯示全部考卷庫
- 派題視為平行任務（沒有先後順序），分為「待挑戰」與「已完成」兩個分區
- 點擊任務卡的「開始挑戰」 → 進入作答；點擊「查看報告」 → 進入學習報告
- **（波次 3 規劃）** 兩種派題類型獨立分區：
  - 「📝 診斷測驗」區塊（既有，`Assignment.type='diagnosis'`）
  - 「🌱 情境治療」區塊（新增，`Assignment.type='scenario'`，spec-08）
  - 兩區塊使用相同 `TaskCard` 結構，靠**色相 + 標籤 chip** 區隔（治療任務改用青木 `#5BA47A` 系卡底 band）

**視覺風格**: 沿用 spec-07 木框收集冊風 + **手遊養成系任務畫面**佈局（參考 Pokemon Trainer Rank 升級畫面：HUD + 米紙 panel + 白底厚棕邊任務卡）。

> **設計演進（2026-04-29）**：
> - v2.1：闖關地圖（曲折路徑 + 圓形關卡節點） — ❌ 棄用，派題沒有先後順序、線性路徑誤導
> - v2.2：任務看板初版（雙層木框任務卡 + 多行 meta） — ❌ 木框層層套娃、視覺重點稀釋
> - v2.3：簡潔單列版（單層彩色背景 + 一行 meta） — ❌ 任務卡視覺權重不夠，標題不夠突出
> - **v2.4（HUD + 米紙 panel + 厚棕邊任務卡）✅ 採用**：頂部 sky HUD（透明 overlay 在草地天空底圖上）+ 圓角米紙 panel（佔頁面下半，淡斜紋紙感）+ 白底厚棕邊任務卡（大圖示 + 大標題 + 進度條 + 厚黃 chunky 按鈕 + 卡底綠 band）— 視覺權重對齊參考圖，任務列表清楚可見

**資料模型對應**:
- 學生班級綁定：原型期暫定常數 `STUDENT_CLASS_ID = 'class-A'`，未來搬至 AppContext
- 任務來源：`assignments.filter(a => a.classId === STUDENT_CLASS_ID)`
- 過往成績：對每個派題的 `quizId`，從 `studentHistory` 找最佳紀錄（`correctCount` 最高者），並以正確率 映射為 1~3 顆星：≥80% 三星、≥50% 二星、>0 一星

**任務狀態決定邏輯**:
| 狀態 | 條件 | 視覺 |
|------|------|------|
| `completed` | 該 quizId 在 studentHistory 中已有紀錄 | 綠色 `check_circle` 徽章 + 三星評等 + 完成日 + 「查看報告」「再次挑戰」按鈕 |
| `expired` | 無紀錄且 `dueDate < today` | 暗紅 `schedule` 徽章 + 「已過期」標籤 + 灰調 + 「仍可挑戰」按鈕（不鎖死） |
| `next` | 無紀錄且 `dueDate >= today` | 亮橘 `flag` 徽章 + 「開始挑戰」GO 按鈕；若 `dueDate - today ≤ 3` 加紅色「⏰ 剩 N 天」緊急標籤 |

> **設計決策**：不再區分「next（推薦下一個）」與「upcoming」狀態。所有未完成且未過期的派題都顯示為亮橘色一致樣式，因為任務之間沒有先後之分；緊急程度由「剩 N 天」標籤呈現。

**任務排序邏輯**:
- **待挑戰區**：先列「未過期」任務（依 `dueDate` 升冪，截止近的優先），再列「已過期」任務（依 `dueDate` 降冪）
- **已完成區**：依 `completedAt` 降冪（最近完成的在最上）

**UI 元素**:

**1. 頁面結構（兩段式：sky HUD + cream panel）**：
- 上半 HUD（透明 overlay 在 sky+grass 底圖上）：HUD 一條 + 吉祥物對話列
- 下半米紙 panel：`flex-1` 填滿剩餘空間 + `rounded-t-[32px]` + `border-t-[3px] border-[#C19A6B]` + 漸層米紙 (`from-[#FFF8E7] to-[#FBE9C7]`) + 淡斜紋 overlay
- 進入 panel 的視覺過渡靠米紙圓角頂 + 上邊木紋色邊（取代複雜 SVG 波浪）

**2. HUD 一條**：
- 左：登出 `WoodIconButton size="sm"`（`arrow_back` 圖示，`aria-label="登出"`，點擊呼叫 `useAuth().logout()` 後 `navigate('/', { replace: true })`，避免 LoginPage auto-redirect 反彈回 `/student`） + `AvatarPill`
  - AvatarPill = 木框內 [avatar img] + 「🎓 班級名」+ **學習進度條**（探索的概念 % + 數字）
  - mobile (`<sm`)：只顯示 avatar 圖示，隱藏文字 + 進度條
- 右：合併三項統計 pill（`CombinedStats`，木框內 3 cell 用直線分隔，每 cell = icon + 數字無 label）+ 設定齒輪
  - 統計項：✅ 已完成 `M/N` ｜ 🌳 已探索概念 `X/12` ｜ ⏳ 待完成 `K`

**3. 吉祥物對話列**（透明 overlay，無對話框）：
- 左：`scilens_mascot.png` (w-14 sm:w-16) + `animate-breath`
- 右：浮空文字
  - 有任務待挑戰：「你有 **N** 個任務要挑戰！」+ 副句「完成後可在『已完成』區查看你的學習報告」
  - 全部完成：「目前沒有待挑戰任務 · 你做得很棒！」
  - 無派題：「老師還沒派任務給你～」
- 文字加 `drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]` 在天空底圖上保持可讀

**4. Section 標題（橘色豎條 tab marker）**：
- 左側 1.5px 寬橘色 (`#D08B2E`) 圓角豎條
- 右側標題 + 副標（細灰）+（折疊區才有）數量徽章 + `expand_more` 箭頭
- **「目前你被指派的任務」**（永遠展開，附副標「老師指派的任務都會出現在這裡，點任務卡開始挑戰」）
- **「已完成的任務」**（預設折疊，標題列即 toggle）

**5. 任務卡（`TaskCard` v2.4 - 寶可夢手遊風）**：白底 + 厚棕邊 + 綠 band
- **卡片殼**：`bg-white border-[3px] border-[#8B5E3C] rounded-[20px]` + `shadow-[0_4px_0_-1px_#5A3E22,0_8px_14px_-4px_rgba(91,66,38,0.35)]` + `overflow-hidden`
- **內部佈局**（單列，桌機 / 手機一致）：
  - **左：大圖示方框** (w-16 sm:w-20，圓角 + 厚色邊 + 內陰影)，內含 Material Symbols icon (text-4xl sm:text-5xl)
  - **中：標題 + 進度條 + 副資訊**
    - 標題：`font-black text-base sm:text-lg`（粗黑大字，畫面焦點）
    - 進度條列：「題數 + 進度 bar + 星等」（已完成才顯示星等與填充比例）
    - 副資訊：截止日 / 完成日（短日格式「5 月 4 日」）
  - **右：厚黃 chunky 按鈕**（`ChunkyButton` 元件）
    - `primary`：黃色漸層 (`from-[#F4D58A] to-[#F0B962]`) + 厚棕邊 + 立體 4px 硬陰影
    - `muted`：灰色漸層（過期狀態用）
    - `ghost`：白底棕邊（已完成的「再做」次按鈕用）
- **卡底彩色 band**（`h-2 sm:h-2.5`，與徽章狀態同色系）：
  - `next` → 綠 band；`completed` → 深綠；`expired` → 灰
- **左上角貼紙**（`Sticker`，浮於卡片邊界外，`-rotate-6 + animate-pulse-soft`）：
  - `urgent`（剩 ≤ 3 天）：紅底白邊「⏰ 剩 N 天 / 今天截止」
  - `completed`：綠底白邊「完成」
  - `expired`：灰底白邊「已過期」

**6. 空狀態**：米紙 panel 內顯示 `inventory_2` 大 icon + 「看板還是空的 / 老師還沒派任務給你 · 等老師派題後就會出現在這裡」

**已刪除元素**（v2.3 → v2.4）：
- ❌ 任務卡上的「派發日」、緊急 inline pill（改用左上貼紙）
- ❌ 全幅草地背景 (`bg_ground.png`)，回用 `bg_chiheisen_green.jpg`（為了天空 / 草地分層 HUD 結構）
- ❌ 細條 section header（取代為橘色豎條 tab marker）

**輔助元件**:
- 共用：`Icon`, `WOOD_OUTER`, `WOOD_INNER_CREAM`, `WoodIconButton`, `StarRating`（from `src/components/ui/woodKit.jsx`）
- 學生專用：`TaskCard`（from `src/components/student/TaskCard.jsx`），內含 `Sticker`、`ChunkyButton` 子元件
- 內部 sub-component：`AvatarPill`（含學習進度條）、`CombinedStats`、`Section`（含折疊行為）、`EmptyBoard`

**素材依賴**:
- 背景：`bg_chiheisen_green.jpg`（sky+grass，固定 + cover；2026-04-29 v2.4 重新採用）
- 學生 avatar：`irasutoya_student_clean.png`
- 吉祥物：`scilens_mascot.png`
- 設定 icon：`settings_wood.png`

**狀態依賴**: `quizzes`, `classes`, `assignments`, `studentHistory`, `setCurrentQuizId`, `setActiveStudentReport`

---

### 2.12 StudentQuiz (`/student/quiz/:quizId`)
**檔案**: `src/pages/student/StudentQuiz.jsx`

**功能描述**:
- 對話式（Chat-like）的診斷測驗介面
- 逐題呈現，以對話泡泡方式顯示
- 學生選擇答案後進行即時診斷
- 若診斷出迷思概念，出現確認問題讓學生反思
- 作答完成後顯示摘要並記錄歷史

**UI 子元件**:
- `SystemBubble` — 機器人/系統訊息泡泡
- `StudentBubble` — 學生回應泡泡
- `ThinkingBubble` — 載入/思考中動畫

**狀態依賴**: `recordAnswer`, `removeMisconception`, `resetStudentAnswers`, `addToHistory`, `studentAnswers`, `correctCount`, `studentMisconceptions`
**路由參數**: `quizId`

---

### 2.13 StudentReport (`/student/report`)
**檔案**: `src/pages/student/StudentReport.jsx`

**功能描述**:
- 個人學習健康報告
- 顯示被診斷出的迷思概念
- 提供學生端的提示與建議
- 顯示正確率統計

**UI 元素**:
- 正確率圓餅圖/統計
- 迷思概念列表（含 studentDetail 說明）
- 學習建議（studentHint）
- 返回首頁按鈕

**狀態依賴**: `activeStudentReport`, `studentMisconceptions`
