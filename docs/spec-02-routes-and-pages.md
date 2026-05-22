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
| `/teacher/dashboard` | `DashboardLayout` | 診斷結果共用 layout（標題 + 題組選擇器 + 子分頁），自動 redirect 到 `overview` | `TeacherLayout` |
| `/teacher/dashboard/overview` | `OverviewPage` | 子分頁「**所有班級答題分布**」：4 指標卡（含全對/對一半/全錯人數分布）+ 3 個 Top3 縮圖（最弱班級 / 最弱節點 / 高頻迷思）。AI 文字摘要折疊收起 | `DashboardLayout` |
| `/teacher/dashboard/classes` | `ClassesPage` | 子分頁「**各班級成績比較**」：每班一張獨立 Card（答題分布 / 最弱節點 / 高頻迷思 Top3 / 進入詳情按鈕） | `DashboardLayout` |
| `/teacher/dashboard/nodes` | `NodesPage` | 子分頁「**所有班級知識節點答對率**」：12 個節點的答對率排行 + 跨班 heatmap，節點用 NodeBadge 顯示 | `DashboardLayout` |
| `/teacher/dashboard/misconceptions` | `MisconceptionsPage` | 子分頁「**所有班級高頻迷思排行**」：48 條迷思的觸發人次完整排行（label + NodeBadge + 人次 + 佔比 bar + 涉及學生跳轉） | `DashboardLayout` |
| `/teacher/dashboard/class-detail` | `ClassDetailPage` | 子分頁：各班詳細診斷報告（含派題完成率清單 + 該班 SingleClassReport） | `DashboardLayout` |
| `/teacher/quiz/create` | `QuizCreateWizard` | 出題精靈（多步驟） | `TeacherLayout` |
| `/teacher/quizzes` | `QuizLibrary` | 題組庫：瀏覽與管理題組 | `TeacherLayout` |
| `/teacher/assignments` | — | 舊路由，redirect 至 `/teacher/assignments/diagnosis` | — |
| `/teacher/assignments/diagnosis` | `AssignmentManagement` | 派題管理：指派**診斷題組**給班級 | `TeacherLayout` |
| `/teacher/assignments/scenarios` | `AssignmentManagement` (initialTab="scenario") | 派題管理：指派**概念釐清治療題組**給班級（與診斷派題共用同一頁面、預設概念釐清 tab） | `TeacherLayout` |
| `/teacher/classes` | `ClassManagement` | 班級管理：檢視班級名冊 | `TeacherLayout` |
| `/teacher/classes/:classId` | `ClassDetail` | 班級詳情：個別班級學生資訊 | `TeacherLayout` |
| `/teacher/knowledge-map` | `KnowledgeMap` | (預設) 知識節點與迷思概念總覽：唯讀檢視系統預設迷思概念 | `TeacherLayout` |
| `/teacher/custom-knowledge-map` | `CustomKnowledgeMap` | (自定義) 知識節點總覽：檢視預設＋自訂迷思概念，支援新增/刪除自訂迷思 | `TeacherLayout` |
| `/teacher/misconception-causes` | `MisconceptionCauses` | 迷思概念成因：列出診斷對話中分類迷思成因的 8 種類別（特徵 + 常見樣態） | `TeacherLayout` |
| `/teacher/report` | `TeacherReport` | 舊版診斷報告（保留向後相容） | `TeacherLayout` |
| `/teacher/scenarios` | `ScenarioLibrary` | **（規劃，波次 2）** 概念釐清題組庫（治療模組，spec-08） | `TeacherLayout` |
| `/teacher/scenarios/create` | `ScenarioCreateWizard` | **（規劃，波次 2）** 概念釐清題組出題精靈 | `TeacherLayout` |
| `/teacher/scenarios/:scenarioQuizId/edit` | `ScenarioCreateWizard` | **（規劃，波次 2）** 編輯既有概念釐清題組 | `TeacherLayout` |
| `/teacher/treatment-outcomes` | `TreatmentOutcomes` | 概念釐清結果：彙整學生×概念釐清題組的治療成效（per-question outcome / 星等 / AI 判定釐清 / 反思摘要 / 班級層級指標） | `TeacherLayout` |
| `/teacher/treatment-logs` | `TreatmentLogs` | **（規劃，波次 2）** 治療對話紀錄總覽 | `TeacherLayout` |
| `/teacher/treatment-logs/:sessionId` | `TreatmentLogDetail` | **（規劃，波次 2）** 單一 session 完整對話紀錄 | `TeacherLayout` |
| `/student` | `StudentHome` | 學生首頁：瀏覽可作答題組（含診斷與概念釐清兩區塊） | 簡易 Header |
| `/student/quiz/:quizId` | `StudentQuiz` | 對話式診斷測驗介面 | 簡易 Header |
| `/student/scenario/:scenarioQuizId` | `ScenarioChat` | **（規劃，波次 3）** 概念釐清治療對話頁（spec-08） | 全螢幕 |
| `/student/report` | `StudentReport` | 個人學習健康報告 | 簡易 Header |
| `*` | `Navigate to /` | 404 重導向首頁 | — |

> **註**：標註「（規劃，波次 N）」的路由為 spec-08 治療模組規劃中路由，
> 目前僅資料模型與 mock bot 已實作（波次 1），實際頁面元件將在波次 2、3 完成。

### 1.2 路由參數

| 參數 | 型別 | 使用頁面 | 說明 |
|------|------|----------|------|
| `:classId` | string | `ClassDetail` | 班級 ID（如 `class-A`） |
| `:quizId` | string | `StudentQuiz` | 題組 ID（如 `quiz-001`） |
| `:scenarioQuizId` | string | `ScenarioChat` / `ScenarioCreateWizard`（編輯模式） | 概念釐清題組 ID（如 `scenario-002`） |
| `:sessionId` | string | `TreatmentLogDetail` | 治療 session ID |

### 1.3 URL Query 參數（診斷結果子分頁共用）

| 參數 | 使用頁面 | 說明 |
|------|----------|------|
| `?quizId=...` | 所有 `/teacher/dashboard/*` 子分頁 | 由 `DashboardLayout` 讀寫，控制要查看的題組；切換子分頁時保留；同步寫回 `AppContext.currentQuizId` 作「最近檢視」記憶 |
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
  - **右**：齒輪設定按鈕（`settings_wood.png`），hover 旋轉 90deg；點擊後在按鈕下方彈出**設定 popover**（木框風 + 上方箭頭），目前僅提供「字體大小」三段切換（小 14px / 中 16px / 大 18px，預設「中」）。
    - 切換時呼叫 `src/lib/fontSize.js` 的 `setFontSize(value)`，將 `<html>` 的 `font-size` 設為對應像素值，並寫入 `localStorage['scilens-font-size']`；由於 Tailwind 以 rem 為主，整體 UI 比例會等比縮放
    - `applyFontSize()` 在 `src/main.jsx` 啟動時呼叫一次，確保重新整理後保留偏好
    - 點擊 popover 外部會自動關閉（共用 LoginPage 的 `mousedown` outside-click 機制）
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
- `SettingsPopover` — 齒輪按鈕點擊後的設定面板（字體大小三段切換）

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
- 教師端主頁，呈現兩條並列的工作流程：
  - **流程一：迷思概念診斷** — 出題管理 → 派題管理 → 診斷結果
  - **流程二：迷思概念治療** — 概念釐清出題 → 概念釐清派題 → 對話紀錄
- 每個步驟卡片可點擊直接跳轉對應頁面
- 提供快速操作按鈕（推薦題組、快速出題）

**UI 元素**:
- 頁面標題「首頁」旁帶 `?` 問號圖示（`HelpTip`），點擊顯示流程摘要 tooltip
- 兩個流程區塊（各帶 chip 標籤 + Material Symbols 圖示識別流程一／流程二）
- 每流程三步驟卡片（編號圓圈＋步驟名稱，無額外描述文字）
- 快速操作 CTA 卡片（橫向佈局：圖示 + 標題 + 數字 badge + `HelpTip`），點擊 `?` 可查看詳細說明
- 知識節點總覽入口（以數字統計呈現：N 節點 / N 迷思 / N 層級）

**佈局**: 使用 `TeacherLayout` 側邊欄

---

### 2.2.1 教師端側邊欄 IA（D1 / D2 / D7 — 教學流程導向）

**檔案**: `src/components/TeacherLayout.jsx`

側邊欄依教師「使用個案（Use Case）」順序排列，**所有項目永遠可點**（不真正 disable），但用視覺引導讓老師感受到流程感。

**Section 結構**（從上到下）：

| Section | flow key | 內容 | 用色 |
|---|---|---|---|
| `① 出診斷題` | `quiz` | 診斷題組編輯（✨AI：RAGFlow 出題輔助） | 綠 |
| `② 派題給班級` | `assign` | 派發診斷題組 | 青 |
| `③ 看診斷結果` | `dashboard` | 診斷儀表板（✨AI：報告摘要）+ 5 個 dashboard 子分頁 + 診斷對話紀錄（✨AI：POE 追問） | 藍 |
| `④ 概念釐清・補救` | `remediation` | 釐清題組編輯（✨AI）+ 派發釐清題組 + **概念釐清結果**（✨AI：成效衍生）+ 釐清對話紀錄（✨AI：CER 補救對話） | 紫紅 |
| `班級` | — | 班級名單管理 | 橘 |
| `其他` | — | 迷思概念成因、(預設) 知識節點總覽、(自定義) 知識節點總覽 | 棕 |

**D2-A 狀態徽章**：每個 flow section 右側顯示真實狀態 chip，資料由 `useTeacherStageStatus()` 派生：

| Flow | Ready 時 | Pending 時 |
|---|---|---|
| `quiz` | `{N} 份題組` | `尚未建立` |
| `assign` | `{N} 班已派` | `尚未派題`（或 `—` 若沒題組） |
| `dashboard` | `可查看` | `等待派題` |
| `remediation` | `{N} 班已派`／`{N} 份釐清題組` | `尚未建立`（或 `—`） |

**D2-B 建議下一步高亮**：`nextStep` 為「第一個未完成的階段」，該 section 加 pulsing dot + 「建議下一步」chip + 外框光暈。規則：
- 沒題組 → `quiz`
- 有題組沒派 → `assign`
- 已派但沒釐清題組 → `remediation`
- 已派且有釐清題組但未派釐清 → `remediation`
- 全部完成 → `null`（不高亮）

**D7 AI 標記**：所有用到 LLM/RAGFlow 的項目右側顯示 `<AIBadge>`（紫色 ✨ icon + AI pill + hover tooltip 一句話說明）。

---

### 2.3 診斷結果頁群（`/teacher/dashboard/*`）

> 將原 `DashboardReport` 拆成 5 個子分頁，避免單頁資訊量過大。
> 共用 `DashboardLayout` 提供標題列、題組選擇器、5 個子分頁 tab；子頁透過 `useOutletContext()` 取得共享資料。

#### 2.3.0 DashboardLayout (`/teacher/dashboard`)
**檔案**: `src/pages/teacher/dashboard/DashboardLayout.jsx`

**功能描述**:
- 診斷結果頁群的共用容器
- 讀取 `?quizId=` query，驗證是否為已派發的題組；無效或未指定時自動 fallback 為 `AppContext.currentQuizId` 或第一張可用題組，並寫回 URL（replace）
- 透過 `<Outlet context={{ quizId, overviewData, classes, assignments, quizzes }}>` 把計算好的跨班 `overviewData` 傳給子頁
- `/teacher/dashboard` 本身 index 路由 `<Navigate to="overview" replace />`

**UI 元素**:
- 頂部標題列：標題「診斷結果」（移除副標，避免與 tab 列重複表達範圍）
- **學年篩選器**（最上方一列；與 `/teacher/classes` 共用同一組 AppContext 狀態）：
  - 學年度下拉：`getCurrentSchoolYear()` 為預設，可往前選 5 個學年度
  - 學期下拉：上學期 / 下學期
  - 「顯示已封存班級」checkbox（預設關）
  - 影響範圍：本層計算的 `classes` / `assignments` 都套用此篩選後再傳給子頁，避免歷史班級污染當期統計（詳見 spec-05 §1.5.3）
- **題組選擇器與 tab 列上下分列**：題組以綠色 chip 顯示在上排，下排為 5 個 tab（含 Material Symbol icon + 啟用時填滿綠色 pill）；題組選單僅列出有派發給「目前篩選範圍班級」的題組
- 子分頁 tab 列：5 個 NavLink（所有班級答題分布 / 各班級比較 / 知識節點答對率 / 高頻迷思排行 / 個別學生報告），切換時保留 `searchParams`。命名一律帶「範圍 + 指標」前綴，回應「tab 名稱看不出資料維度」回饋
- **空狀態使用 `<EmptyStateGuide>`**（D2-C）：未建立任何題組 → 引導去 `① 出診斷題`；已建題組但未派 → 引導去 `② 派題給班級`；當前學年篩選結果為空 → 顯示「此學年/學期沒有班級資料，試試切換學年度或勾選『顯示已封存班級』」

**狀態依賴**:
- `useApp()`：`quizzes`, `assignments`, `currentQuizId`, `setCurrentQuizId`, `currentSchoolYear`, `setCurrentSchoolYear`, `currentSemester`, `setCurrentSemester`, `includeArchivedClasses`, `setIncludeArchivedClasses`
- `useClasses({ schoolYear, semester, includeArchived })`：依篩選器即時拉班級清單
- `useSearchParams()`：`quizId`, `classId`

#### 2.3.1 OverviewPage (`/teacher/dashboard/overview`)
**檔案**: `src/pages/teacher/dashboard/OverviewPage.jsx`

**子分頁名稱**：「**所有班級答題分布**」（原「所有班級總覽」）

**用語修正**：所有「掌握度 / 掌握率 / 掌握程度」一律改為「**答對率**」（公式：答對題數 ÷ 總題數 × 100%）。「掌握」一詞會被誤解為「已學會」，但實際只是客觀題正確率，不含迷思加權。

**內容（重排版後）**：4 個指標卡 + 3 個 Top3 縮圖：
- **指標卡 1 答題分布**：全對 X 人 / 對一半 Y 人 / 全錯 Z 人（呼應教授「不只看平均」需求）
- **指標卡 2~4**：派題完成率 / 平均答對率 / 已派班級數
- **Top3 縮圖**：最弱班級 / 最弱節點（NodeBadge）/ 高頻迷思（含 NodeBadge），點擊跳轉對應深度 tab
- **AI 文字摘要**：折疊收起，點「展開完整 AI 分析」抽屜開啟

#### 2.3.2 ClassesPage (`/teacher/dashboard/classes`)
**檔案**: `src/pages/teacher/dashboard/ClassesPage.jsx`

**子分頁名稱**：「**各班級成績比較**」（原「各班學習狀況」）

**內容（D3 規模化版本）**：

頂部控制列：
- 搜尋班級名（即時 filter）
- 排序選單（預設 / 答對率高低 / 完成率高低 / 名稱）
- 檢視模式切換：`list`（預設，緊湊行式）／ `cards`（完整大卡片，沿用原版）
- 右側計數「共 X / Y 班」

**list 模式**（為 30+ 班規模設計）：
- 一行一班：班級色點 + 班級名 + 答對率 + 完成率 + mini 答題分布堆疊條（全對綠/對一半黃/全錯紅）+ 「展開」
- 展開後顯示三欄細節：答題分布完整 bar / 最弱節點 Top2（NodeBadge）/ 高頻迷思 Top3（NodeBadge）+ 「進入該班詳情」按鈕

**cards 模式**：原本的大卡片排列，每個班級一張獨立 Card：
- Card header：班級色 bar + 班級名 + 完成率
- 答題分布 / 最弱節點 Top2 / 高頻迷思 Top3
- 「進入該班詳情」按鈕

#### 2.3.3 NodesPage (`/teacher/dashboard/nodes`)
**檔案**: `src/pages/teacher/dashboard/NodesPage.jsx`

**子分頁名稱**：「**所有班級知識節點答對率**」（原「知識節點跨班比較」）

**內容**（方案 C 重組）：
- **主視圖**：`CrossClassNodeChart`（同一概念節點各班答對率並排長條比較，節點軸以 NodeBadge 顯示短編號），單頁可一屏看完
- **進階折疊**：`OptionAttractionChart`（題目選項吸引力檢核 — 各題 A/B/C/D 選擇分布，⭐ 標記正解）預設折疊，回應教授「不滾動可看完」需求

#### 2.3.4 MisconceptionsPage (`/teacher/dashboard/misconceptions`)
**檔案**: `src/pages/teacher/dashboard/MisconceptionsPage.jsx`

**子分頁名稱**：「**所有班級高頻迷思排行**」（原「跨班高頻迷思」）

**內容**（方案 C 重組）：
- **主視圖**：`MisconceptionRankingTable` — 完整迷思排行（依持有總人次降序、含 NodeBadge / 人次 / 佔比 bar / 「查看涉及學生」跳轉）
- **進階折疊面板**（單一 collapsible，內含兩圖並排）：
  - `MisconceptionCauseDonut` — 所有班級迷思成因 8 類分布甜甜圈
  - `FollowupStatusFunnel` — 追問後狀態變化漏斗

> 移除：
> - `ClassMisconceptionHeatmap`（資訊與 `ClassesPage` 每班高頻迷思 Top3 重複，已刪除實檔）
> - `TopMisconceptionsChart`（早期被 `MisconceptionRankingTable` 取代，已刪除實檔）

#### 2.3.5 ClassDetailPage (`/teacher/dashboard/class-detail`)
**檔案**: `src/pages/teacher/dashboard/ClassDetailPage.jsx`

**內容**:
- **班級選擇器**：下拉式選單，顯示各班派題完成率；選項標籤格式「班級名 · 完成率（已完成人數/總人數 人）」
- **兩相位報告 Tab 系統**：
  - **診斷相位**（`reportPhase === 'diagnosis'`）—「迷思概念診斷報告」tab
    - 視覺風格：金色主題（`bg-[#FFF1D8] border-[#F0B962] text-[#7A4A18]`）
    - 內容：`SingleClassReport`（4 個指標卡 + AI 診斷摘要 + 本週行動清單 + 各概念掌握程度 + 迷思概念分佈 + **各題錯誤率圖表** + 題目明細矩陣 + **學生第二層追問對話完整紀錄**）
  - **治療相位**（`reportPhase === 'treatment'`）—「概念釐清成效報告」tab
    - 視覺風格：綠色主題（`bg-[#E0F0E8] border-[#3F8B5E] text-[#2E6B47]`）
    - 內容：`TreatmentEffectivenessPanel`（進度分布圓餅圖 + 3 個統計卡片 + 學生詳細表）
- 無 `classId` 時顯示「請從上方清單選擇班級」空狀態

**狀態**:
- `reportPhase` state：`'diagnosis' | 'treatment'`（控制兩個 tab 的切換）
- `setReportPhase()` 狀態更新函式

**狀態依賴**:
- 透過 `useOutletContext()` 取得 `quizId`, `overviewData`, `classes`, `assignments`, `quizzes`
- `useSearchParams()`：`classId`（同步寫入 `AppContext.currentClassId`）

**共用元件**（位於 `src/pages/teacher/dashboard/shared/`）:
- `helpers.js` — 常數（`CLASS_KEY_MAP`, `CLASS_CHART_COLORS`）與 `computeOverviewForQuiz`、`getAssignment`、`getAvailableQuizzesForClass`、`getAllAssignedQuizzes`、`getLatestQuizIdForClass`
- `OverallAIDiagnosisSummary.jsx`、`ClassStatusCards.jsx`、`CrossClassNodeChart.jsx`、`TopMisconceptionsChart.jsx`、`ClassMisconceptionHeatmap.jsx`、`ClassScatterChart.jsx`
- `SingleClassReport.jsx`（含 4 指標卡 + 子組件 `AIDiagnosisSummary.jsx`、`WeeklyActionChecklist.jsx`、`BreakdownChart.jsx`、`MisconceptionDistribution.jsx`、`QuestionErrorRateChart.jsx`、`ReasoningQualityBars.jsx`、`HeatmapView.jsx`、`FollowupConversations.jsx`）
- **新增（2026-05）**：`SubjectRadarChart.jsx`（子主題雷達）、`MasteryDistributionHistogram.jsx`（學生掌握度分布）、`FollowupStatusFunnel.jsx`（追問後狀態漏斗）、`MisconceptionCauseDonut.jsx`（迷思成因 8 類甜甜圈）、`ReasoningQualityBars.jsx`（單班追問推理品質分布）、`OptionAttractionChart.jsx`（選項吸引力分析）
- `QuestionErrorRateChart.jsx` — 水平長條圖，呈現全班各題的錯誤率；以紅色虛線標示班級平均錯誤率；顯示題幹、知識節點名稱、錯誤率、top misconception；根據錯誤率色碼：紅色（≥50%）、黃色（30-49%）、綠色（<30%）
- `TreatmentEffectivenessPanel.jsx` — 概念釐清成效報告的主面板；包含：進度分布圓餅圖（已完成/進行中/未開始）、3 個統計卡片（完成率、進行中人數、未開始人數）、可展開的學生詳細表（依完成狀態排序）；透過 `useTreatmentLogs` hook 撈取該班治療紀錄；支援選填 `scenarioQuizId` 進行題組篩選
- `FollowupConversations.jsx` — 透過 `useClassFollowups` 撈取該班所有學生在 N3 第二層追問的對話紀錄；以「學生 → 題目」兩層摺疊呈現，展開後以聊天泡泡顯示完整對話、AI 摘要與最終判定徽章。資料來源為後端 `GET /api/quizzes/{quizId}/followups?classId=`，撈 `FollowupResult.conversation_log` JSONB

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
- 顯示所有 12 個知識節點（兩條子主題路徑）
- 核取方塊勾選/取消節點 → `selectedNodeIds`
- **麵包屑導航**：頂部顯示 `出題管理 › 建立題組 › 步驟一/步驟二`，點擊「出題管理」可返回 QuizLibrary
- **Sticky 技能樹 + 摘要列**（合併 sticky 容器，回應「邊看表格邊看路徑」需求）：
  - 知識路徑技能樹（KnowledgeSkillTree）置於上方，預設展開、可手動收合以騰出表格空間
  - 摘要列含「展開/收合技能樹」按鈕 + 「N 節點 · N 題 · N 迷思 | A x/5 · B y/7」一行概要 + 「下一步」按鈕
  - 整個容器 sticky 在頁面頂端，老師滾動下方常見迷思表格時技能樹仍可參照
- **已移除「已選節點 chip 列」**（含 +/- stepper）：認知負荷過高、且 chip 列複製了已在技能樹中可見的選取資訊。每節點預設出 1 題；如需多題，請在 Step2 出題編輯器直接新增
- **子主題計數徽章**：學習路徑圖中每條子主題標題旁顯示 `N/M` 徽章，已選時為綠色、未選時為灰色

#### Step 2: Step2Edit
**檔案**: `src/pages/teacher/quiz/Step2Edit.jsx`
- 根據選定的知識節點載入對應題目
- 可編輯題幹（stem）與選項（options）
- 可編輯各選項的迷思概念對應（diagnosis）
- **CoveragePanel 補洞**：每個節點下列出尚未被任一選項覆蓋的迷思 chips；點擊 chip 直接建立預填的新題目（鎖定該節點 + 該迷思為 distractor），並開啟編輯 modal。同時從 `nodeQuestionCounts` 讀取各節點的目標題數，於面板顯示「實際 / 目標 題」
- **自動排序**按鈕（工具列中介於「從題庫挑題」與「新增題目」之間）：依知識節點拓撲順序（Kahn's algorithm）對題目重新排序並編號，題目少於 2 題時 disabled；使用 `src/utils/topoSortNodes.js` 的 `sortQuestionsByNodeOrder`
- **從題庫挑題**（`QuestionImportDrawer`）：右側抽屜列出所有題組，展開後勾選題目即可深拷貝匯入；預設只顯示與當前 `selectedNodeIds` 有交集的題組，可切換顯示全部
- **拖曳重排題目**（HTML5 Drag and Drop）：問題表格的每一列左側顯示**明顯的 drag handle**：淺綠底色圓角方塊 + Material Symbol `drag_indicator` icon，hover 變深綠並 cursor 切換為 `grab/grabbing`；表頭該欄標示「排序」字樣，回應「拖拉功能太不顯眼」回饋。拖曳時：
  - 來源列透明度降低（視覺反饋）
  - 拖曳至目標列時顯示綠色 ring 高亮
  - 放開時重新排序 questions 陣列，並自動用 `renumber()` 更新題號
- **草稿暫存**：
  - 「儲存草稿」按鈕：以 `status: 'draft'` 立即上傳；首次儲存後將回傳的 quiz id 寫入 `editingQuizId`，後續儲存改走 PUT
  - 自動暫存：30 秒 debounce，依賴 `quizTitle / quizQuestions / selectedNodeIds / nodeQuestionCounts`；底部 status pill 顯示「已自動儲存於 HH:mm」
  - 編輯既有 `published` 卷時自動暫存停用，避免降級為草稿（顯示「此卷已發布，自動暫存停用」）
- 「儲存並發布」按鈕：以 `status: 'published'` 儲存後跳回 `/teacher/quizzes`，並清空 `editingQuizId`

**子元件**（皆位於 `src/components/teacher/quizEditor/`）:
- `EditQuestionModal` — 單題編輯 modal，整合 N6 干擾選項建議
- `DeleteQuestionModal` — 刪除確認 modal
- `PreviewQuizModal` — 學生端預覽
- `CoveragePanel` — 涵蓋率 + 補洞 chips
- `QuestionImportDrawer` — 題庫挑題抽屜

**狀態依賴**: `selectedNodeIds`, `setSelectedNodeIds`, `quizQuestions`, `setQuizQuestions`, `nodeQuestionCounts`, `setNodeQuestionCounts`, `editingQuizId`, `setEditingQuizId`, `editingQuizStatus`, `setEditingQuizStatus`, `useSaveQuiz`

---

### 2.5 QuizLibrary (`/teacher/quizzes`)
**檔案**: `src/pages/teacher/QuizLibrary.jsx`

**功能描述**:
- 瀏覽所有已建立的題組
- 可進入編輯模式修改題組（沿用同一 quiz id；草稿顯示「繼續編輯」）
- **複製為新題組**：以該卷為範本（深拷貝題目、節點），導向 `/teacher/quiz/create?step=2` 並清空 `editingQuizId`，儲存時走 POST 建立新題組
- 可刪除草稿狀態題組（已發布卷不顯示刪除按鈕）

**UI 元素**:
- **頂部 tab 列**：`全部` / `題庫（已發布）` / `草稿`，每個 tab 帶數量徽章；預設停在「題庫（已發布）」（與「派題」流程的可選清單一致）
- 題組卡片列表（狀態徽章、標題、題數、節點 badges、已派班級、建立日期）
- 狀態徽章：`draft`（黃底「草稿」）/ `published`（綠底「已發布」）
- 操作按鈕：編輯 / 繼續編輯、複製為新題組、刪除草稿（僅草稿可見）
- 各 tab 的空狀態：`草稿` tab 提示「按儲存草稿即可暫存」、`題庫` tab 提示「按儲存並發布即可加入題庫」

**狀態依賴**: `quizzes`, `useDeleteQuiz`, `setEditingQuizId`, `setEditingQuizStatus`, `setQuizQuestions`, `setSelectedNodeIds`

---

### 2.6 AssignmentManagement (`/teacher/assignments/diagnosis`)
**檔案**: `src/pages/teacher/AssignmentManagement.jsx`

**功能描述**:
- 管理**診斷題組**派發記錄（概念釐清題組派題請見 §2.6.1，沿用同一元件）
- 新增派題：選擇題組 → 選擇班級 → 設定截止日期
- 檢視已派題記錄及完成狀態
- 可刪除或更新派題

> **路由說明**：舊路由 `/teacher/assignments` 已改為 redirect 至 `/teacher/assignments/diagnosis`，
> 以維持與既有書籤、舊連結的相容性。Sidebar「派題」群組展開後，「step 1. 診斷題組」即指向此頁。
>
> **題型由路由決定**：頁面內**已移除**「📝 診斷題組 / 🌱 概念釐清題組」tab pill，老師從 sidebar「派發診斷題組」或「派發釐清題組」分別進入，`initialTab` prop 直接決定模式。畫面內不再有 tab 切換按鈕，回應「icon 太多、流程上重複」回饋。

**UI 元素**:
- **排序控制**（取代原 tab pill）：下拉選單可選預設順序／建立時間新→舊／舊→新／題組名稱 A→Z／Z→A／已派班級數多→少／少→多；旁邊顯示「共 N 份診斷／釐清題組」
- 圖例（未派發／待作答／進行中／已完成）置於矩陣**上方**，方便對照後再點選格子
- 派題矩陣（列為題組、欄為班級）；格子最小高度 120px
- 新增派題的 `AssignPopover` 與管理派題的 `ManagePopover` 採 `position: fixed` + 觸發按鈕 bounding rect 計算座標，避免被外層 `overflow-hidden / overflow-x-auto` 切掉
- `AssignPopover` 含**派發模式選擇器**：兩個 toggle 按鈕「診斷模式」與「複習模式」，各附說明文字；`onConfirm` 回傳 `(dueDate, dispatchMode)`，`dispatchMode` 為 `'diagnosis'` 或 `'review'`
- 完成率進度條與狀態徽章

**狀態依賴**: `assignments`, `addAssignment`, `updateAssignment`, `removeAssignment`, `quizzes`, `classes`

---

### 2.6.1 概念釐清派題 (`/teacher/assignments/scenarios`)
**檔案**: `src/pages/teacher/AssignmentManagement.jsx`（同 §2.6，以 `initialTab="scenario"` prop 帶入）

**功能描述**:
- 將已 published 的概念釐清治療題組指派給班級
- 與診斷派題共用 `AssignmentManagement` 元件；路由差異僅在於預設選中的 tab
- 矩陣資料來源為 `assignments.filter(a => a.type === 'scenario')`，矩陣中以 `scenarioQuizId` 對應已 published 的概念釐清題組
- 派題目標支援 `class`（整班）與 `students`（指定學生），後者透過 `AssignTargetPicker` modal 選取

**UI 元素**:
- 頁首：與診斷派題共用「派題管理」標題與 tab 列（📝 診斷題組 / 🌱 概念釐清題組）
- 矩陣：列為概念釐清題組、欄為班級；空格點擊開啟 `AssignTargetPicker`，已派格子點擊開啟 `ManagePopover`

**狀態依賴**: `assignments`, `scenarios` (via `useScenarios`), `classes`, `addAssignment`, `updateAssignment`, `removeAssignment`

---

### 2.6.2 TreatmentOutcomes (`/teacher/treatment-outcomes`)
**檔案**: `src/pages/teacher/TreatmentOutcomes.jsx`

**功能描述**:
- 教師端「概念釐清結果」頁，與「釐清對話紀錄」並列為治療成效檢視入口
- 將學生×概念釐清題組的 session 衍生為可比較的成效彙整，協助教師判斷下一步教學決策
- 與對話紀錄頁的差別：本頁聚焦「結果」（每題釐清程度、星等、AI 判定），對話紀錄頁聚焦「過程」（完整氣泡時序）

**衍生規則**（spec-08 §5.5，純前端 lib `src/lib/treatmentOutcomes.js`，未來搬至後端 `treatment_outcome_service.py`）：
- per-question outcome：依該題 messages 的 maxHintLevel + 是否走到 `stage='complete'`，分類為
  自走理解 / 輕度引導 / 中度引導 / 強鷹架 / 未釐清 / 未作答
- AI 判定釐清（代理 pre/post 比較）：該 session 所有題目皆走到 `stage='complete'` → 已釐清
- 星等（0~3 顆）：依各題 outcome weight 平均（≥3.5 → 3⭐、≥2.5 → 2⭐、≥1.5 → 1⭐、< 1.5 → 0⭐）

**UI 元素**（低認知負荷重構版）:
- 頁首：標題「概念釐清結果」+ 一句話副標
- **三色階圖例條**：綠（已釐清）/ 黃（需引導）/ 紅（未釐清），首次閱讀即可掌握配色意義
- 篩選列：班級 dropdown + 概念釐清題組 dropdown
- **班級彙整卡片**（3 個，避免 4 個資訊塊讓人分心）：
  - 已派發學生（人）
  - 已釐清（X / Y 人；綠色強調）
  - 需關注（人；當 > 0 時用紅色強調）
- **結果表格**（5 欄；舊版 8 欄已收斂）：
  - 班級 chip
  - 學生姓名（題組標題以副標形式顯示，不另佔一欄）
  - 整體結果（綠 / 黃 / 紅 tier chip + 星等 0~3）
  - 各題狀態：每題 pill = tier 顏色 + outcome label（自走理解 / 輕度引導 / 中度引導 / 強鷹架 / 未釐清 / 未作答）
  - 「查看對話」→ 跳轉 `/teacher/treatment-logs/:sessionId`

**已刪除的舊欄位 / 卡片（避免重複與認知負荷）**:
- 「AI 判定」欄 — 與整體結果 chip 重複（皆從 perQuestion 推得）
- 「概念釐清題組」獨立欄 — 移至學生姓名下副標
- 「學生反思」欄 — 後端欄位 P5 未實作，欄位永遠空白，暫不顯示
- 「平均星等」「平均釐清率」指標卡 — 兩者皆描述整體成效，使用者難分辨；收斂為單一「已釐清 / 需關注」決策軸

**狀態依賴**: `useTreatmentLogs`、`useTreatmentLog`、`useScenarios`、`useClasses`

**已知限制 / 後端待辦（P5）**:
- `treatment_sessions` 需新增 `reflection_text`（學生反思）、`star_rating`（學生端 result 階段三星）兩個欄位（spec-11 §3.13、deviations.md）
- 後續計算應改為後端 service 一次回傳所有衍生欄位（避免前端 N+1 fetch messages）

---

### 2.7 ClassManagement (`/teacher/classes`)
**檔案**: `src/pages/teacher/ClassManagement.jsx`

**功能描述**:
- 列出當前篩選範圍內的班級（Google Classroom 風的極簡呈現）
- 提供「新增班級」入口
- **不直接處理 class-level 寫入動作**（編輯/封存/還原/刪除全部走詳情頁）

**UI 元素**:
- 頁首：標題「班級管理」+「+ 新增班級」按鈕
- 學年篩選器（與 DashboardLayout 共用 AppContext 狀態，spec-05 §1.5）
- 顯示模式切換 chip：`[列表] [完整卡片]`（預設列表，圖示 `view_list` / `dashboard`）
- 班級項目（兩種視圖共用同一套設計語言，定義於 `ClassListRow.jsx` / `ClassCardItem.jsx`）：
  - 列表列（`ClassListRow`）：色塊（左側 1.5px 圓條）+ 班名（粗體）+ 副標「N 位學生 · 114 下」+ 右側 chevron；整列可點、鍵盤 Enter/Space 同效；hover/focus 變淺綠
  - 完整卡片（`ClassCardItem`）：同樣的內容比例，版面較大；左側細色條 + 粗體班名 + 副標
  - 已封存：opacity 60% + grayscale + 「已封存」chip；唯有勾選「顯示已封存班級」才會出現在列表
- 空狀態：「目前學年/學期沒有班級。點右上『新增班級』… 或勾選『顯示已封存班級』查閱歷史。」
- **新增班級**：開啟 `ClassFormModal` (isEdit=false)；提交 → `useCreateClass()`

**沒有的東西**（與既有實作差異）：
- ❌ 班級卡片/列上沒有編輯/封存/刪除按鈕
- ❌ 沒有派題數、最近派題日期等「教學活動」統計（這些屬於儀表板）

**狀態依賴**:
- `useApp()`：`currentSchoolYear`、`currentSemester`、`includeArchivedClasses`
- `useClasses()`：依篩選器即時拉取班級清單
- `useCreateClass()`：新增班級

---

### 2.8 ClassDetail (`/teacher/classes/:classId`)
**檔案**: `src/pages/teacher/ClassDetail.jsx`

**功能描述**:
- 班級詳情頁。**所有 class-level 寫入動作集中在此**（編輯/封存/還原/刪除）
- 學生名冊 CRUD
- 學生密碼管理（揭露明文 / 重設）

**UI 元素**:
- 頁首：
  - 返回按鈕「← 返回班級管理」
  - 班名（大）+ 已封存徽章（若 status='archived'）
  - 副標：`{114 學年度} · {下學期} · N 位學生 · 預設密碼說明`
  - 右側操作鈕列：
    - `[✏ 編輯班級]` → 開啟 `ClassFormModal` (isEdit=true)
    - `[封存]`（active 時）→ window.confirm → `useArchiveClass()`
    - `[還原]`（archived 時）→ `useUnarchiveClass()`
    - `[🗑]` → `DeleteClassModal`（兩步驟）→ `useDeleteClass()` → 跳回 `/teacher/classes`
- 已封存橫幅（status='archived' 時）：米色背景「此為歷史班級。學生名冊與派題作答紀錄完整保留，點上方『還原』可恢復為任教中。」
- 學生名冊表格（座號 / 姓名 / 帳號 / 密碼 / 操作）：
  - 密碼欄為 `PasswordCell`：預設遮罩，點眼睛圖示 → `useStudent(id)` 揭露明文
  - 重設密碼 → `useResetStudentPassword()`
  - 編輯 / 刪除學生 → `useUpdateClassStudents()`（PUT 整批替換）
  - 新增學生表單（座號 + 姓名）

**路由參數**: `classId`

**狀態依賴**:
- `useClass(classId)`：可讀任何狀態的班級（含已封存，後端 GET 不過濾 status）
- `useUpdateClass()` / `useArchiveClass()` / `useUnarchiveClass()` / `useDeleteClass()`
- `useUpdateClassStudents()` / `useResetStudentPassword()` / `useStudent(id)`
- `useAssignments()`：僅供 `DeleteClassModal` 顯示「即將連動刪除 N 筆派題」
- `useApp()`：`currentSchoolYear` / `currentSemester`（編輯班級表單的學年下拉預設值）

**抽出的子元件**:
- `ClassFormModal.jsx` — 新增/編輯班級的表單 Modal（與 ClassManagement 共用）
- `DeleteClassModal.jsx` — 班級刪除確認 Modal（兩步驟）
- `DeleteStudentModal.jsx` — 學生刪除確認 Modal

---

### 2.9 KnowledgeMap (`/teacher/knowledge-map`)
**檔案**: `src/pages/teacher/KnowledgeMap.jsx`

**功能描述**:
- **唯讀頁面**，僅展示系統預設迷思概念，不提供新增/編輯/刪除功能
- 頁面標題為「(預設) 知識節點與迷思概念總覽」
- 以層級結構展示所有知識節點
- 顯示各節點的迷思概念列表
- 顯示先備知識關聯（知識學習路徑視覺化）

**UI 元素**:
- **`KnowledgeSkillTree`** 知識路徑技能樹（深木紋夜晚地圖風 / Mockup J-1）：
  - 六角節點 + 階段欄位（1–6）
  - A 綠系階段漸層（5 階段、線性）／ B 暖橘系階段漸層（6 階段、5-5/5-6 平行）
  - 銳利輪廓 + 背後柔光暈
  - hover 節點 → 固定資訊條顯示完整名稱（避免 layout shift）
  - 「顯示節點名稱」開關 → 展開下方雙欄詳細清單
  - 詳見 spec-03 §6
- 迷思概念表格（3 欄）：
  | 欄位 | 說明 |
  |------|------|
  | 知識節點 | 節點名稱 |
  | 迷思概念 | 迷思概念 label |
  | 學生常見想法 | 迷思概念 studentDetail |
- **無「操作」欄位**（唯讀，不可編輯或刪除）

**資料來源**: `knowledgeNodes` (from knowledgeGraph.js)

---

### 2.9.1 CustomKnowledgeMap (`/teacher/custom-knowledge-map`)
**檔案**: `src/pages/teacher/CustomKnowledgeMap.jsx`

**功能描述**:
- 同時顯示**系統預設迷思概念**與**教師自訂迷思概念**
- 預設迷思以淡灰風格呈現，帶「預設」徽章；自訂迷思以正常風格呈現，帶「自訂」徽章
- 教師可新增自訂迷思概念（全域按鈕 + 各節點按鈕）
- 教師可刪除自訂迷思概念（僅自訂可刪，預設不可刪）
- 知識學習路徑視覺化（與預設頁相同）

**UI 元素**:
- 知識學習路徑視覺化（同 §2.9）
- 圖例列（legend bar）：說明「預設」與「自訂」兩種徽章的意義
- 「新增自訂迷思」按鈕（頁面頂部全域 + 各節點區塊內）
- 迷思概念表格（4 欄）：
  | 欄位 | 說明 |
  |------|------|
  | 知識節點 | 節點名稱 |
  | 迷思概念 | 迷思概念 label + 徽章（「預設」灰 / 「自訂」彩） |
  | 學生常見想法 | 迷思概念 studentDetail |
  | 操作 | 自訂迷思顯示刪除按鈕；預設迷思無操作 |
- 預設迷思列以 muted gray 樣式呈現，自訂迷思列以正常樣式呈現

**資料來源**: `knowledgeNodes` (from knowledgeGraph.js), 教師自訂迷思概念（後端 API 或前端狀態）

---

### 2.9.2 MisconceptionCauses (`/teacher/misconception-causes`)
**檔案**: `src/pages/teacher/MisconceptionCauses.jsx`

**功能描述**:
- 純說明頁，列出診斷模型用來歸類學生迷思成因的 **8 種類別**
- 類別 1–6 為一般通用成因；類別 7、8 為「情境條件成因」（僅在學生對話明確提及對應描述時才適用），UI 上以灰色徽章 + 虛線分隔 + 提示文字明確區分
- 教師可作為診斷報告閱讀時的參考圖鑑

**UI 元素**:
- 頁面標題 + 返回首頁按鈕
- 黃色提示橫幅：說明類別 1–6 與 7、8 的差異
- 兩欄響應式網格（手機單欄、md+ 雙欄），每張卡片含：
  - 圓形編號徽章 + 類別名稱（彩色 header）
  - 「特徵」段落
  - 「常見樣態」段落
  - （僅 7、8）虛線分隔下方的「情境條件成因」提示

**8 個成因類別**:
1. 學科知識不足或缺乏
2. 概念不清楚或混淆
3. 不正確的推論或運算過程
4. 單憑個人直覺或關鍵字反應
5. 來自日常的經驗和生活中的觀察
6. 日常生活用語與科學用語的混淆
7. 教師的教學過程不當（情境條件）
8. 實驗操作不當（情境條件）

**資料來源**: 頁面內 hard-coded 常數 `CAUSE_CATEGORIES`（無外部依賴）

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
- 動態列出**老師指派給該生班級**的派題；不顯示全部題組庫
- 派題視為平行任務（沒有先後順序），分為「待挑戰」與「已完成」兩個分區
- 點擊任務卡的「開始挑戰」 → 進入作答；點擊「查看報告」 → 進入學習報告
- **（波次 3 規劃）** 兩種派題類型獨立分區：
  - 「📝 診斷測驗」區塊（既有，`Assignment.type='diagnosis'`）
  - 「🌱 概念釐清治療」區塊（新增，`Assignment.type='scenario'`，spec-08）
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
- 右：合併三項統計 pill（`CombinedStats`，木框內 3 cell 用直線分隔，每 cell = icon + 數字無 label）+ 設定齒輪（點擊開啟 `StudentSettingsDrawer`）
  - 統計項：✅ 已完成 `M/N` ｜ 🌳 已探索概念 `X/12` ｜ ⏳ 待完成 `K`
  - 設定齒輪：`settings_wood.png` icon，點擊 `setSettingsOpen(true)` 開啟右側設定抽屜

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
- 學生專用：`StudentSettingsDrawer`（from `src/components/student/StudentSettingsDrawer.jsx`），右側滑入設定抽屜，包含字體大小調整、個人資訊（唯讀）、關於系統/使用說明、登出按鈕
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
