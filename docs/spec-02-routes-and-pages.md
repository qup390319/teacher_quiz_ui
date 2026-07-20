# SPEC-02: Routes & Pages / 路由與頁面規格

## 1. 路由架構

所有路由定義於 `src/App.jsx`，使用 `react-router-dom` 的 `BrowserRouter` + `Routes` + `Route`。
全域狀態以 `<AuthProvider> > <AppProvider>` 巢狀包裹所有路由。

### 1.0 受保護路由（P1 起）

`src/components/RequireAuth.jsx` 提供 `<RequireAuth role="teacher|student|admin">` wrapper：
- bootstrap 中（`useAuth().loading=true`）顯示「載入中…」
- 未登入：admin 路由 → `<Navigate to="/admin/login" replace />`；其餘 → `<Navigate to="/" replace />`
- role 不符：同上規則

所有 `/teacher/*` 路由由 `<RequireAuth role="teacher">` 包起，所有 `/student/*` 路由由 `<RequireAuth role="student">` 包起，所有 `/admin`（除 `/admin/login`）由 `<RequireAuth role="admin">` 包起。`/`、`/admin/login` 與 `*`（404）不受保護。

詳見 spec-13 §8、spec-14（管理員 UI 設計）。

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
| `/teacher/assignments` | `AssignmentManagement` | 派題管理：指派診斷題組給班級 | `TeacherLayout` |
| `/teacher/classes` | `ClassManagement` | 班級管理：檢視班級名冊 | `TeacherLayout` |
| `/teacher/classes/:classId` | `ClassDetail` | 班級詳情：個別班級學生資訊 | `TeacherLayout` |
| `/teacher/knowledge-map` | `KnowledgeMap` | (預設) 知識節點與迷思概念總覽：唯讀檢視系統預設迷思概念 | `TeacherLayout` |
| `/teacher/custom-knowledge-map` | `CustomKnowledgeMap` | (自定義) 知識節點總覽：檢視預設＋自訂迷思概念，支援新增/刪除自訂迷思 | `TeacherLayout` |
| `/teacher/misconception-causes` | `MisconceptionCauses` | 迷思概念成因：列出診斷對話中分類迷思成因的 9 種類別（特徵 + 常見樣態） | `TeacherLayout` |
| `/teacher/students/:studentId/report` | `StudentDiagnosisReport` | 個別學生診斷報告：統計卡 + 迷思分析（含成因/答錯類型）+ **先備概念追溯** + 補強建議 + 逐題追問對話紀錄（詳見 §2 對應小節） | `TeacherLayout` |
| `/teacher/report` | `TeacherReport` | 舊版診斷報告（保留向後相容） | `TeacherLayout` |
| `/student` | `StudentHome` | 學生首頁：頂部兩個 Tab 切換「任務看板」(待挑戰任務) / 「診斷報告」(歷次診斷報告) | 簡易 Header |
| `/student/quiz/:quizId` | `StudentQuiz` | 對話式診斷測驗介面 | 簡易 Header |
| `/student/report` | `StudentReport` | 個人學習健康報告（頁面標題即「診斷報告」） | 簡易 Header |
| `/admin/login` | `AdminLogin` | 管理員獨立登入頁（不在首頁角色卡露出） | 無（全螢幕） |
| `/admin` | `AdminDashboard` | 後台首頁：統計 donut + 6 個功能入口卡 | `AdminLayout` |
| `/admin/users` | `UsersManagement` | 帳號管理：教師/學生列表 + 新增/停用/重設密碼 | `AdminLayout` |
| `/admin/classes` | `ClassesOverview` | 跨教師班級總覽：篩選 + 列表 | `AdminLayout` |
| `/admin/classes/:classId` | `ClassDetailAdmin` | 班級詳情：基本資訊 + 學生名冊（唯讀）+ 空班 Excel 匯入 | `AdminLayout` |
| `/admin/units` | `UnitsManagement` | 教學單元管理（`type='unit'`）：依年段分區、CRUD、封存／啟用 | `AdminLayout` |
| `/admin/subthemes` | `SubthemesLibrary` | 課綱次主題庫（`type='subtheme'`）：瀏覽 + 從 Word 匯入課綱次主題階層；依年段分區、顯示每個次主題的大節點 / 小節點計數 | `AdminLayout` |
| `/admin/knowledge-nodes` | `KnowledgeNodesAdmin` | 知識節點畫布編輯 + 迷思 CRUD + 未分配池 + 從 Word 匯入次主題 | `AdminLayout` |
| `/admin/misconceptions` | `MisconceptionsManagement` | 迷思概念管理：雙欄 master-detail，依次主題分組選節點 + 該節點下迷思完整 CRUD | `AdminLayout` |
| `/admin/sample-quizzes` | `SampleQuizzes` | 範例題庫：跨教師列出題組 + 切換系統範例標記 | `AdminLayout` |
| `*` | `Navigate to /` | 404 重導向首頁 | — |

### 1.2 路由參數

| 參數 | 型別 | 使用頁面 | 說明 |
|------|------|----------|------|
| `:classId` | string | `ClassDetail` | 班級 ID（如 `class-A`） |
| `:quizId` | string | `StudentQuiz` | 題組 ID（如 `quiz-001`） |
| `:studentId` | string | `StudentDiagnosisReport` | 學生 user id（由 `StudentReportsPage` / `MisconceptionsPage` 等列表跳轉帶入） |

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
  - **副標**：簡短一句話（教師「出題、查看班級迷思、獲得教學建議」；學生「對話式診斷，獲得個人診斷報告」）
  - **CTA 按鈕**：肥大圓角膠囊 + 漸層底 + 木紋色邊框 + 立體陰影 + 大字「GO」+ `play_arrow` icon；hover 時陰影縮短 + 按下沉 0.5
    - 教師：橙木漸層 (`from-[#F0B962] to-[#D08B2E]`)
    - 學生：藍漸層 (`from-[#5DADE2] to-[#2E86C1]`)
  - **ⓘ 圓木紐扣**（卡片右上角，超出邊界 -top-2 -right-2）：圓形米色木框（`border-[3px] border-[#8B5E3C]`）+ `info` icon + 立體陰影；hover 旋轉 12deg + 縮放 110%
  - **功能說明 Popover**：木框包覆（沿用 `WOOD_OUTER` + `WOOD_INNER_CREAM`） + 上方木紋小三角箭頭指向 ⓘ + 標題「📖 主要功能」+ 特性清單
- **底部資訊條**：木框迷你 pill + `account_tree` icon + 「水溶液單元 · INe-Ⅱ-3-01 至 INe-Ⅲ-5-7（共 12 個知識節點）」
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
- 教師端主頁，呈現迷思概念診斷工作流程：
  - **流程：迷思概念診斷** — 出題管理 → 派題管理 → 診斷結果
- 每個步驟卡片可點擊直接跳轉對應頁面
- 提供快速操作按鈕（推薦題組、快速出題）

**UI 元素**:
- 頁面標題「首頁」旁帶 `?` 問號圖示（`HelpTip`），點擊顯示流程摘要 tooltip
- 流程區塊（帶 chip 標籤 + Material Symbols 圖示識別）
- 三步驟卡片（編號圓圈＋步驟名稱，無額外描述文字）
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
| `班級` | — | 班級名單管理 | 橘 |
| `其他` | — | 迷思概念成因、(預設) 知識節點總覽、(自定義) 知識節點總覽 | 棕 |

**D2-A 狀態徽章**：每個 flow section 右側顯示真實狀態 chip，資料由 `useTeacherStageStatus()` 派生：

| Flow | Ready 時 | Pending 時 |
|---|---|---|
| `quiz` | `{N} 份題組` | `尚未建立` |
| `assign` | `{N} 班已派` | `尚未派題`（或 `—` 若沒題組） |
| `dashboard` | `可查看` | `等待派題` |

**D2-B 建議下一步高亮**：`nextStep` 為「第一個未完成的階段」，該 section 加 pulsing dot + 「建議下一步」chip + 外框光暈。規則：
- 沒題組 → `quiz`
- 有題組沒派 → `assign`
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

**UI 元素**（2026-05-28 重排版，三層水平分離以解決「篩選器混亂」回饋）:

1. **Header 列**：只放標題「診斷結果」+ 操作導覽鈕，不再夾入任何篩選器
2. **Filter Row**：所有篩選器集中一列，視覺上分主/次兩組
   - **主篩選器（題組）**：綠底 chip + leading label「目前題組」+ 題組下拉（白底 select，最寬 260px 截斷）
   - **垂直分隔線**（≥sm 顯示）
   - **次篩選器（時間軸 + 封存）**（`SchoolYearFilter`，與 `/teacher/classes` 共用 AppContext 狀態）：
     - 學年度 chip：`school` icon + select（option 直接顯示「114 學年度」，移除冗餘 label）
     - 學期 chip：`calendar_month` icon + select（option 顯示「上學期/下學期」）
     - 「含封存」toggle：checkbox + `inventory_2` icon + label，active 時切換為綠底
   - 影響範圍：本層計算的 `classes` / `assignments` 都套用此篩選後再傳給子頁，避免歷史班級污染當期統計（詳見 spec-05 §1.5.3）
3. **Tab 列**：5 個 NavLink（所有班級答題分布 / 各班級比較 / 知識節點答對率 / 高頻迷思排行 / 個別學生報告），含 Material Symbol icon + 啟用時填滿綠色 pill；切換時保留 `searchParams`

> **設計原則**：Header（身份）→ Filter（資料篩選）→ Tabs（視角切換）三層由上到下、語意分明，避免任何兩層的元素混在同一列。
>
> **題組選擇器顏色**：刻意用綠底凸顯，與次篩選器（白底）形成主從對比；leading label「目前題組」做為 caption（uppercase + tracking）強化「這是當前焦點」的提示。
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
  - `MisconceptionCauseDonut` — 所有班級迷思成因 9 類分布甜甜圈
  - `FollowupStatusFunnel` — 追問後狀態變化漏斗

> 移除：
> - `ClassMisconceptionHeatmap`（資訊與 `ClassesPage` 每班高頻迷思 Top3 重複，已刪除實檔）
> - `TopMisconceptionsChart`（早期被 `MisconceptionRankingTable` 取代，已刪除實檔）

#### 2.3.5 ClassDetailPage (`/teacher/dashboard/class-detail`)
**檔案**: `src/pages/teacher/dashboard/ClassDetailPage.jsx`

**內容**:
- **班級選擇器**：下拉式選單，顯示各班派題完成率；選項標籤格式「班級名 · 完成率（已完成人數/總人數 人）」
- **迷思概念診斷報告**：
  - 內容：`SingleClassReport`（4 個指標卡 + AI 診斷摘要 + 本週行動清單 + 各概念掌握程度 + 迷思概念分佈 + **各題錯誤率圖表** + 題目明細矩陣 + **學生第二層追問對話完整紀錄**）
- 無 `classId` 時顯示「請從上方清單選擇班級」空狀態

**狀態依賴**:
- 透過 `useOutletContext()` 取得 `quizId`, `overviewData`, `classes`, `assignments`, `quizzes`
- `useSearchParams()`：`classId`（同步寫入 `AppContext.currentClassId`）

**共用元件**（位於 `src/pages/teacher/dashboard/shared/`）:
- `helpers.js` — 常數（`CLASS_KEY_MAP`, `CLASS_CHART_COLORS`）與 `computeOverviewForQuiz`、`getAssignment`、`getAvailableQuizzesForClass`、`getAllAssignedQuizzes`、`getLatestQuizIdForClass`
- `OverallAIDiagnosisSummary.jsx`、`ClassStatusCards.jsx`、`CrossClassNodeChart.jsx`、`TopMisconceptionsChart.jsx`、`ClassMisconceptionHeatmap.jsx`、`ClassScatterChart.jsx`
- `SingleClassReport.jsx`（含 4 指標卡 + 子組件 `AIDiagnosisSummary.jsx`、`WeeklyActionChecklist.jsx`、`BreakdownChart.jsx`、`MisconceptionDistribution.jsx`、`QuestionErrorRateChart.jsx`、`ReasoningQualityBars.jsx`、`HeatmapView.jsx`、`FollowupConversations.jsx`）
- **新增（2026-05）**：`SubjectRadarChart.jsx`（子主題雷達）、`MasteryDistributionHistogram.jsx`（學生掌握度分布）、`FollowupStatusFunnel.jsx`（追問後狀態漏斗）、`MisconceptionCauseDonut.jsx`（迷思成因 9 類甜甜圈）、`ReasoningQualityBars.jsx`（單班追問推理品質分布）、`OptionAttractionChart.jsx`（選項吸引力分析）
- `QuestionErrorRateChart.jsx` — 水平長條圖，呈現全班各題的錯誤率；以紅色虛線標示班級平均錯誤率；顯示題幹、知識節點名稱、錯誤率、top misconception；根據錯誤率色碼：紅色（≥50%）、黃色（30-49%）、綠色（<30%）
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
- **三步驟**出題精靈容器（①選擇單元 ②選擇節點 ③製作題組）
- 管理當前步驟狀態（`?step=1/2/3`）；編輯既有題組時直接帶入單元 + 節點並跳到 step 3
- 用 `useAllKnowledgeNodes()` 取全部節點，再以 `nodesForUnit(selectedUnit, allNodes)` 依該教學單元的大節點（`parentNodes`）過濾出單元節點，以 props 串給各步驟（不動全域 `knowledgeGraph.js`）
- 步驟列 `StepIndicator`：step 2 需先選單元、step 3 需勾至少 1 節點
- **教學單元↔節點關聯**：靠「單元 → 大節點（`unit_parent_nodes`，公開 `GET /units` 的 `parentNodes`）→ 知識節點（`parentNodeId`）」，**不是** `knowledge_nodes.unit_id`（後者指向次主題）。詳見 `docs/deviations.md`（2026-06-05）

**子元件**:

#### Step 1: Step0Unit（選擇單元與題型）
**檔案**: `src/pages/teacher/quiz/Step0Unit.jsx`
- 以卡片列出所有「使用中」**教學單元**（`useUnits({ type: 'unit' })`，排除 `type='subtheme'` 次主題），每張顯示單元名稱、簡介、節點數 / 迷思數（用 `nodesForUnit` 依各單元大節點統計）
- **未建好的單元**（沒節點或沒迷思）標灰色「建置中」徽章、不可點選；點到時顯示提示請聯絡管理員
- **單選**（一份題組只綁一個單元）；切換單元會清空已勾節點與已編題目（先跳確認）
- 選定後寫入 `selectedUnitId`（AppContext）
- **題型選擇**（兩個 toggle 按鈕，選定後寫入 `editingQuizMode`）：
  - 「單層診斷」(`single`)：傳統單選題，選項直接帶迷思碼（預設）
  - 「雙層次診斷」(`two-tier`)：第一層選答案 + 第二層選理由，對應 Treagust（1988）兩層次評量設計

#### Step 2: Step1Nodes（選擇節點）
**檔案**: `src/pages/teacher/quiz/Step1Nodes.jsx`
- 互動式知識節點選擇介面，顯示**所選單元**的節點（不再寫死 12 節點）；以 `nodes` prop 傳入
- 核取方塊 / 技能樹節點勾選/取消 → `selectedNodeIds`
- **技能樹（KnowledgeSkillTree）資料驅動**：依該單元的先備關係 + 大節點自動排版（見 spec-07）
- **Sticky 摘要列**：技能樹滾出畫面後顯示，依大節點 / 子主題自動分組的 MiniPath chips + 「N 節點 · N 迷思」概要 + 「下一步」
- 底部含「返回：選擇單元」與「下一步：製作題組」

#### Step 3: Step2Edit（製作題組）
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
- 「儲存並發布」按鈕：先做**發布前整卷檢查**（逐題跑 `validateQuestion()`，見 spec-03 §8）——若有題目不符雙層次方法論（題幹/選項留白、第一層非恰一正解、第二層非恰一正確理由、錯誤理由迷思重複），跳出 `PublishValidationModal` 列出「第 N 題：問題」並擋下發布；全部通過才以 `status: 'published'` 儲存、跳回 `/teacher/quizzes` 並清空 `editingQuizId`

**子元件**（皆位於 `src/components/teacher/quizEditor/`）:
- `EditQuestionModal` — 單題編輯 modal，整合 N6 干擾選項建議
- `DeleteQuestionModal` — 刪除確認 modal
- `PreviewQuizModal` — 學生端預覽
- `CoveragePanel` — 涵蓋率 + 補洞 chips
- `QuestionImportDrawer` — 題庫挑題抽屜

**狀態依賴**: `selectedNodeIds`, `setSelectedNodeIds`, `quizQuestions`, `setQuizQuestions`, `nodeQuestionCounts`, `setNodeQuestionCounts`, `editingQuizId`, `setEditingQuizId`, `editingQuizStatus`, `setEditingQuizStatus`, `editingQuizMode`, `useSaveQuiz`

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

### 2.6 AssignmentManagement (`/teacher/assignments`)
**檔案**: `src/pages/teacher/AssignmentManagement.jsx`（主控）+ `src/pages/teacher/assignment/` 子模組

**功能描述**:
- 管理診斷題組派發記錄
- 新增派題：選擇題組 → 選擇班級 → 設定截止日期
- 檢視已派題記錄及完成狀態
- 可刪除或更新派題

**設計（2026-06-20 重構，從矩陣改為「題組摘要卡 + 管理派發抽屜」）**:

> **理由**：原為 N×M 矩陣（題組為列、班級為欄），班級一多就水平爆走、狀態格擠到看不清。新設計把「逐班」這個會隨班級數爆炸的維度收進可搜尋/篩選/批次的右側抽屜，主清單只放每題組的派發摘要——**題組多往下捲、班級多在抽屜搜尋**，兩個維度都不撐爆。

#### 結構（由上到下）
1. **頁首**：`派題管理` h1 + 操作導覽鈕 + 副說明
2. **全頁概覽列 `OverviewBar`**：題組總數、班級數、進行中筆數、已完成筆數、總派發紀錄數
3. **排序選單**：名稱 / 已派班數 / 建立時間
4. **題組摘要卡清單**：每份已發佈題組一張 `QuizSummaryCard`

#### 題組摘要卡 `QuizSummaryCard`（`assignment/QuizSummaryCard.jsx`）
- **Header**：題組標題 +（two-tier 時）`雙層次` badge + `X 題 · Y 節點` + 右側「管理派發」鈕
- **堆疊進度條**：完成（綠）/ 作答中（黃）/ 待作答（淺）三段，依各班 `completionRate` 統計；右側「已派 M/N 班 · 平均 Z%」
- **小計**：未派 / 待作答 / 作答中 / 完成 四色點計數
- 統計來源：`assignmentStats.getQuizCardStats(quiz, classes, assignments)`（以 `completionRate` 判定）

#### 管理派發抽屜 `AssignmentDrawer`（`assignment/AssignmentDrawer.jsx`）
點某卡「管理派發」開啟右側 slide-over（ESC / 點遮罩關閉），管理「單一題組對所有班級」的派發：
- **派發設定**（批次與單筆共用）：截止日（**必填**，套用到下方派發）。後端 `assignments.due_date` 為 `NOT NULL`，故截止日為空時以「必填」星號 + 琥珀提示「請先填寫截止日，才能派發」標示，並**禁用**批次派發與逐班派發鈕，在送出前就攔下避免 422
- **搜尋班級**：依班名即時過濾
- **狀態篩選 tab**：全部 / 未派發 / 作答中 / 已完成（各帶即時數量）
- **全選未派發 + 批次派發**：勾選後一次派給多班（`onBatchAssign` → 對每班 `addAssignment`）
- **班級列表**（可捲動）：
  - 未派發列：checkbox + 班色點 + 班名/人數 + 「派發」鈕（套用上方派發設定）
  - 已派發列：班名 + 狀態 badge + 進度條 + `X/Y 人（Z%）` + 截止日；點擊展開管理（改截止日 / 查看診斷報告 / 取消派發）

> **註**：原舊版 popover 的「派題模式（診斷/複習）」toggle 已移除——後端從未支援 `dispatch_mode`、兩模式行為完全相同，屬無作用的 placeholder UI（2026-06-20）。日後若後端接上 `dispatch_mode` 再行加回。

#### 排序選項
- 預設順序
- 名稱 A→Z / Z→A
- 派發數 多→少 / 少→多
- （僅題組視角）建立時間 新→舊 / 舊→新

#### 不再使用的元素
- ~~派題矩陣 N×M table~~（廢棄）
- ~~圖例列（未派發／待作答／進行中／已完成）~~（廢棄，進度條本身用顏色傳達狀態）

**狀態依賴**: `assignments`, `addAssignment`, `updateAssignment`, `removeAssignment`, `quizzes`, `classes`, `activeQuizId (抽屜開關)`, `sortBy`

---

> **§2.7 ~ §2.13 已搬移到 `spec-02b-pages-extra.md`**（含教師端班級管理、班級詳情、知識地圖系列、舊版報告，以及學生端首頁、作答、報告三頁）。
>
> 此處保留章節編號占位，避免外部交叉引用失效。

---

## 3. 管理員後台頁面（spec-14 風格）

### 3.1 AdminLogin (`/admin/login`)
**檔案**: `src/pages/admin/AdminLogin.jsx`

**功能描述**:
- 管理員獨立登入頁，不在首頁角色卡露出
- 已登入教師 / 學生會自動導向其對應端

**UI 元素**（spec-14 §3）:
- 中央卡片（白底 + `rounded-3xl` + 細邊框）
- 上方品牌列：薄荷綠 `admin_panel_settings` icon + 「SciLens Admin」
- 表單：帳號 / 密碼（含 visibility toggle） / 登入按鈕（薄荷綠 primary）
- 錯誤訊息：`ROLE_MISMATCH` → 「此帳號不是管理員」；`ACCOUNT_DISABLED` → 「此帳號已被停用」；其他 401 → 「帳號或密碼錯誤」
- 底部「← 回到師生入口」連結，導向 `/`

**狀態依賴**: `useAuth()` 的 `login`、`logout`、`currentUser`、`loading`

---

### 3.2 AdminDashboard (`/admin`)
**檔案**: `src/pages/admin/AdminDashboard.jsx`

**功能描述**:
- 後台首頁，呈現系統狀態統計 + 功能入口
- W1 階段資料為 placeholder（後續波次串接真實 API）

**UI 元素**:
- **統計區（4 個 Donut Stat Card）**：教師帳號 / 學生帳號 / 班級總數 / 共用題組，呈現「已啟用 / 總數」與百分比
- **功能入口（5 張卡片）**：帳號管理 / 班級總覽 / 單元管理 / 知識節點 / 範例題庫，未實作的卡片右上角顯示「W2~W6 規劃中」黃色 pill
- 共用 `AdminLayout`

---

### 3.3 UsersManagement (`/admin/users`)
**檔案**: `src/pages/admin/UsersManagement.jsx`

**功能描述**:
- 管理員管理教師 / 學生帳號的中心頁
- 支援列表瀏覽、關鍵字搜尋、狀態篩選、新增教師、停用 / 啟用、重設密碼、顯示明文密碼
- **不支援刪除帳號**（永遠走 stop-the-world 的「停用」流程；spec-13 §11）
- **不支援在此頁新增學生**（學生由教師端 `ClassDetail` 或 W3 Excel 匯入建立）

**UI 元素**（spec-14）:
- **工具列**：
  - Role tab pill（教師 / 學生），白底淺薄荷膠囊
  - 搜尋框：左側 `search` icon，placeholder「搜尋帳號或姓名」
  - 狀態下拉：全部狀態 / 啟用中 / 已停用
  - 右側「+ 新增教師」按鈕（薄荷綠 primary，僅在教師 tab 顯示）
- **教師表格欄位**：帳號 / 姓名 / 班級數 / 學生數 / 密碼 / 狀態 / 操作
- **學生表格欄位**：帳號 / 姓名 / 班級 / 座號 / 密碼 / 狀態 / 操作
- **密碼欄**：使用 `PasswordRevealButton` 子元件，預設遮罩 `••••••`，點眼睛按鈕才呼叫 `GET /api/admin/users/{id}` 取得明文；若是預設密碼會額外顯示黃色「預設」pill
- **狀態 pill**：啟用中（薄荷綠）/ 已停用（紅色）；已停用列整列 opacity 60%
- **操作欄**：
  - 「停用」按鈕（黃色 hover）→ 開啟 `AdminConfirmModal`（danger）；admin 角色 disabled
  - 「啟用」按鈕（綠色 hover）→ 開啟 `AdminConfirmModal`（primary）
  - 「重設密碼」按鈕（藍色 hover）→ 開啟 `AdminConfirmModal`（primary）；成功後 toast 顯示新密碼
- **新增教師流程**：`NewTeacherModal` → 帳號 + 姓名 → 後端建立 → 預設密碼 = 帳號 → toast 提示

**子元件**（位於 `src/pages/admin/components/`）:
- `AdminConfirmModal.jsx` — 共用確認 modal（primary / danger 兩 variant）
- `NewTeacherModal.jsx` — 新增教師表單 modal
- `PasswordRevealButton.jsx` — 密碼揭露按鈕，含 admin-only fetch

**狀態依賴**:
- `useAdminUsers({ role, q, active })`：列表
- `useAdminUser(id)`：揭露明文密碼（lazy fetch）
- `useCreateTeacher()` / `useDisableUser()` / `useEnableUser()` / `useAdminResetPassword()`

---

### 3.4 ClassesOverview (`/admin/classes`)
**檔案**: `src/pages/admin/ClassesOverview.jsx`

**功能描述**:
- 管理員跨教師檢視所有班級
- 篩選：教師（下拉）/ 班級狀態（使用中 / 已封存 / 全部）/ 關鍵字（班名 / id）
- 點任一列「詳情」進入 `/admin/classes/:classId`

**UI 元素**（spec-14）:
- 工具列：搜尋框 + 教師下拉 + 狀態下拉 + 右側計數
- 表格欄位：班級（色塊 + 名稱 + id）/ 所屬教師 / 學年-學期 / 學生數 / 狀態 pill / 詳情按鈕
- 已封存班級狀態 pill 用灰底

**狀態依賴**:
- `useAdminClasses({ teacherId, status })`
- `useAdminUsers({ role: 'teacher' })`（教師下拉資料源）

---

### 3.5 ClassDetailAdmin (`/admin/classes/:classId`)
**檔案**: `src/pages/admin/ClassDetailAdmin.jsx`

**功能描述**:
- 管理員視角的班級詳情
- 唯讀檢視學生名冊；不在此頁直接編輯個別帳號（請走 `/admin/users`）
- **空班時**顯示 `StudentExcelImport` 元件可批次匯入名冊
- **已有學生時**顯示提示說明 Excel 匯入僅在空班時可用

**UI 元素**:
- 頁首基本資訊卡：班級色塊 + 名稱 + id + 已封存徽章；4 個欄位（所屬教師 / 學年-學期 / 年級-科目 / 學生數）
- Excel 匯入區（空班）或提示文字（非空班）
- 學生名冊表格：座號 / 姓名 / 帳號 / 密碼狀態 pill（預設 / 已修改）

**子元件依賴**:
- `<StudentExcelImport variant="admin">`（共用元件，spec-03 待加註）

**狀態依賴**:
- `useAdminClass(classId)`
- `useAdminClassTeacher(classId)`

---

### 3.6 StudentExcelImport（共用元件）
**檔案**: `src/components/StudentExcelImport.jsx`

**功能描述**:
- 教師端 `ClassDetail` 與管理員端 `ClassDetailAdmin` 共用的 Excel 匯入元件
- 兩步驟：選擇檔案 → 後端預覽（dry-run）→ 確認 → 正式匯入
- 後端會驗證：班級必須空（CLASS_NOT_EMPTY 409）、檔案大小（FILE_TOO_LARGE 413）、格式（INVALID_FILE_TYPE / INVALID_XLSX 400）、欄位內容（ROW_N_MISSING_*、DUPLICATE_SEAT 400）

**Excel 格式要求**:
- 第一欄座號（正整數）、第二欄姓名（最多 64 字）
- 第一列可為標題（自動偵測並跳過）
- 不可有重複座號
- 1 MiB 大小上限

**Props**:
- `classId`：目標班級 id
- `variant`：`'teacher'` | `'admin'`，影響色彩主題（教師端米色木紋風、管理員端薄荷綠）以及 invalidate 的 query key
- `onSuccess(classDetail)`：匯入成功 callback

**錯誤訊息**：元件內部 `explainError(code)` 把後端 error code 轉為使用者友善的中文訊息

---

### 3.7 UnitsManagement (`/admin/units`)
**檔案**: `src/pages/admin/UnitsManagement.jsx`

**功能描述**:
- 管理員管理「教學單元」（`type='unit'`），與課綱次主題（`type='subtheme'`）分開管理
- 此頁只列 `type='unit'` 的項目；次主題在「知識節點 > 階層結構」管理
- W4 階段預設 seed 12 個高年級單元（依使用者參考截圖：太陽與光的折射 / 植物世界 / 空氣與燃燒 / 聲音與樂器 / 觀測星空 / **水溶液** / 動物大觀園 / 力與運動 / 多變的天氣 / 地表的變化 / 電磁作用 / 熱對物質的影響）
- 「水溶液」標 `is_system_current=true`：系統目前 12 個知識節點都掛在此單元下，**不可封存或刪除**（後端 409 `UNIT_IS_SYSTEM_CURRENT` + 前端按鈕 disabled + tooltip 說明）

**UI 元素**（spec-14）:
- 工具列：統計列（共 N 個 · 使用中 N · 已封存 N）+ 「顯示已封存」checkbox + 「+ 新增單元」按鈕
- 依年段三大分區呈現（**高年級** 藍木條 / **中年級** 薄荷條 / **低年級** 橙木條），各區帶區段標題 + 計數
- 單元列卡片：色彩條 + 名稱 + 系統徽章（若 isSystemCurrent）+ 狀態 pill + 簡介 + **大節點標籤列**（`ParentNodeChips`：「包含 N 個大節點」+ 各大節點 `code` 小標籤；hover 顯示節點名稱；未綁定時顯示「尚未綁定大節點」灰字）。資料來自清單回應內嵌的 `parentNodes`（見 spec-11 §3.21），不另發請求
- 操作按鈕：**管理大節點** / 編輯 / 封存（或啟用）/ 刪除；系統內建單元的封存與刪除按鈕 disabled
- 新增 / 編輯 → `UnitFormModal`：名稱 + 年段下拉（低/中/高）+ 簡介
- 確認 modal：封存 / 啟用（primary）/ 刪除（danger）共用 `AdminConfirmModal`
- **管理大節點 modal**（`UnitParentNodesModal`，spec-11 §3.21）：左欄列所有大節點（依次主題分組、可搜尋）+ checkbox 多選；右欄列本單元已綁定大節點（可逐筆移除）。底部「新增到單元（N）」按鈕一次送出。對應端點 `GET/POST/DELETE/PUT /api/admin/units/{id}/parent-nodes`

**子元件**（位於 `src/pages/admin/components/`）:
- `UnitFormModal.jsx` — 新增 / 編輯單元表單 modal
- `UnitParentNodesModal.jsx` — 教學單元附掛大節點管理 modal（2026-05-29 新增）
- 共用 `AdminConfirmModal.jsx`（W2 既有）

**狀態依賴**:
- `useAdminUnits({ gradeBand?, status? })`：列表（admin 可看全部含已封存）
- `useCreateUnit()` / `useUpdateUnit()` / `useArchiveUnit()` / `useUnarchiveUnit()` / `useDeleteUnit()`
- `useAdminParentNodes()`：modal 左欄列所有大節點
- `useUnitParentNodes(unitId)` / `useAttachUnitParentNodes(unitId)` / `useDetachUnitParentNode(unitId)` / `useReorderUnitParentNodes(unitId)`：單元 ↔ 大節點 M:N 關聯
- `useUnits({ gradeBand?, includeArchived? })`：未來題組選擇器用（公開讀，任何登入者）

**Word 匯入（W7b）**：
- **「從 Word 匯入」按鈕已搬到 `/admin/knowledge-nodes` §3.9**——本頁不再列出，避免「教學單元」與「課綱次主題」的入口混淆。

---

### 3.8 SubthemesLibrary (`/admin/subthemes`)
**檔案**: `src/pages/admin/SubthemesLibrary.jsx`

**功能描述**：
- admin 瀏覽與**從 Word 批次匯入** 108 課綱「次主題」階層（`units.type='subtheme'`）
- 摘要列：總次主題數 / 大節點總數 / 小節點總數
- 依年段（高 / 中 / 低）分區，每個次主題顯示名稱、code（如 `Ab`、`Ba`）、所屬大節點數、小節點數
- 右上「從 Word 匯入」按鈕 → 開啟 `DocxImportModal`，上傳 .docx 或 .zip（多檔批次），後端 dry-run 預覽階層後確認寫入
  - merge 寫入時**不建立空殼大節點**：某大節點的小節點若全已屬其他單元（無任何新節點或未分配節點會掛上來），則略過不建立該大節點，避免產生同代碼重複；結果表的 message 會顯示「略過 N 個空殼大節點」（後端回傳 `shellsSkipped`）。既有已分配節點一律不搬動。
- 不提供既有次主題的編輯 / 封存 / 刪除——大節點 / 小節點的編修請到「知識節點 > 階層結構」

**API（既有，未新增）**：
- `GET /api/admin/units?type=subtheme`
- `GET /api/admin/parent-nodes`
- `GET /api/admin/knowledge-nodes`（計算每個次主題的子節點數）
- `POST /api/admin/units/import-docx/preview` + `POST /api/admin/units/import-docx`（W7b 既有端點）

**Hooks**：`useAdminUnits({ type: 'subtheme' })` / `useAdminParentNodes()` / `useAdminKnowledgeNodes()`；子元件 `DocxImportModal` 自帶 fetch + QueryClient invalidation

**為何分頁**：W7b 之前「從 Word 匯入」放在 `/admin/units`，但 docx 匯入的是「課綱次主題」（`type='subtheme'`），與該頁的「教學單元」（`type='unit'`）邏輯混淆。拆出本頁可：
1. 讓 `/admin/units` 只列教學單元
2. 給次主題一個獨立、清楚標示「課綱結構」的瀏覽 + 匯入入口
3. `/admin/knowledge-nodes` 畫布頁僅負責節點階層編輯與畫布拓撲，不再提供匯入入口（2026-05-29 移除，避免重複）

---

### 3.9 KnowledgeNodesAdmin (`/admin/knowledge-nodes`)
**檔案**: `src/pages/admin/KnowledgeNodesAdmin.jsx`

**功能描述**:
- 管理員以**畫布**方式管理各單元的知識節點（小節點）與先備關係，並編輯每個節點下的多條迷思概念
- 既有 12 個水溶液節點 + 48 條迷思已 seed 進 DB（`is_system_seed=true`，可編輯但不可刪）
- W5a 階段教師端 / 學生端仍從 hard-code（`src/data/knowledgeGraph.js`）讀取；W5b 後切換為 API

**三個視圖（W7a 起；節點庫分頁已於 2026-06-03 移除，詳見 `docs/deviations.md`）**:
1. **階層結構**（預設）：三欄＋編輯面板 — 左欄主題（單元）/ 中欄大節點 / 右欄小節點 / 第四欄編輯面板；每欄都是拖曳清單（dnd-kit），對應課綱「次主題 → 內容細目 → 知識節點」三層結構。右欄點選小節點後，第四欄展開 `KnowledgeNodeEditPanel`，可編輯節點所有欄位與迷思概念
2. **知識節點畫布**：選一個次主題（`type='subtheme'`），看到該次主題**已加入畫布**（`on_canvas=true`）的小節點 + 先備關係箭頭。純拓撲編輯器——僅支援拖曳定位與拉線連接先備關係，不提供節點欄位編輯（欄位編輯請至「階層結構」）。**左側可收合清單面板**（`CanvasNodeListPanel`）列出該次主題**全部**小節點（依大節點分組），標示「在畫布（綠點）/ 節點庫（灰點）」並有計數摘要（共 N · 在畫布 M · 待加入 K）；點節點庫節點 → 快速加入畫布（`on_canvas=true`）、點在畫布節點 → 畫布平移置中並高亮選取
3. **未分配**：列出所有 `unit_id IS NULL` 的節點，依大節點 (`parent_code`) 分組；每組可選擇下拉一鍵指派到對應年段的單元

**節點生命週期（W5c）**：
- **新增節點** → 進入單元的待加入池（unit_id 已指定但 on_canvas=false）；不會立刻出現在畫布上
- **「加入節點」按鈕** → 在畫布視圖工具列，從待加入池挑選要繪製到畫布的節點（多選 + 搜尋 + 依大節點分組），確認後 on_canvas=true；按鈕上的徽章顯示待加入數量
- **「從畫布移除」** → 於畫布上操作（custom edge / node 控制）；把節點從畫布拿掉但保留資料（on_canvas=false），先備關係保留
- 既有 12 個 seed 節點預設 on_canvas=true（migration 0017 升級時 backfill）

**UI 元素**（spec-14）:
- 工具列：視圖 tab pill + 次主題下拉（僅 canvas tab 顯示，只列 `type='subtheme'`，**依英文編號 `code` 排序**，如 Aa→Ab→Ba…Nc；「階層結構」左欄次主題清單同序）+ 自動排版 + 新增節點按鈕（「從 Word 匯入」已移到 `/admin/subthemes` §3.8，避免畫布與次主題庫雙入口混淆）
- **畫布**：React Flow（`@xyflow/react`）+ dagre 自動排版 + custom node（卡片設計，左側 accent stripe）+ custom edge（smoothstep + 中點 × 刪除鈕）+ Dots background + Controls + MiniMap；節點以 `parent_code` 著色；箭頭從先備指向後續節點。畫布為純拓撲編輯器，不含節點欄位編輯面板
- **編輯面板**（`KnowledgeNodeEditPanel`）：位於「階層結構」視圖第四欄，點選小節點後展開，包含基本資訊（名稱 / 單元 / 大節點 / 學習順序 / 影片）+ 迷思清單（每條可獨立編輯 / 刪除 / 新增）；ID 永遠唯讀
- **新增節點** modal：自訂 ID + 名稱 + 單元 + 年段 + 大節點（選填）

**子元件**（位於 `src/pages/admin/components/`）:
- `KnowledgeNodeCanvas.jsx` — React Flow 畫布（dagre 自動排版 / 拖曳定位 / 拉線連接先備關係 / 中點 × 刪除）；純拓撲，無欄位編輯。接 `focusNode` prop（`{ id, nonce }`）→ 用 React Flow `setCenter` 平移聚焦並選取高亮；接 `appliedLayout` prop（`{ positions, nonce }`）→ 把「自動排版」算好的座標**即時**套到畫布節點並 `fitView` 重新框選全圖（不等 DB 來回）
- `CanvasNodeListPanel.jsx` — 畫布視圖左側「本次主題小節點」可收合清單（依大節點分組 + 在畫布/節點庫狀態 + 點擊快速加入畫布 / 聚焦）
- `KnowledgeNodeEditPanel.jsx` — 節點編輯面板 + 迷思 CRUD（嵌入 `ThreeColumnEditor` 第四欄）
- `NewKnowledgeNodeModal.jsx` — 新增節點 modal
- `AutoLayoutButton.jsx` — 自動排版按鈕（dagre 計算座標 → 透過 `onApplied(positions)` 交給畫布即時套用，並 bulk-update 持久化）

**狀態依賴**:
- `useAdminKnowledgeNodes({ unitId?, unassigned? })`：列表（含迷思）
- `useCreateKnowledgeNode()` / `useUpdateKnowledgeNode()` / `useDeleteKnowledgeNode()`
- `useBulkUpdatePositions()`：拖曳結束 debounced 500ms 寫座標
- `useBulkAssignUnit()`：未分配池批次指派
- `useCreateMisconception()` / `useUpdateMisconception()` / `useDeleteMisconception()`
- `useAdminUnits()`：單元下拉資料源

---

### 3.10 MisconceptionsManagement (`/admin/misconceptions`)
**檔案**: `src/pages/admin/MisconceptionsManagement.jsx`

**功能描述**:
- 管理員以**節點為單位**集中管理每個知識節點下的常見迷思概念（48 條系統預設 + 任意新增）
- 與 §3.9「知識節點」的編輯面板共用同一組 admin API；此頁提供更聚焦、欄位更完整的迷思 CRUD 入口（§3.9 的迷思編輯較精簡且須先進入「階層結構」視圖）
- 既有迷思 `is_default=true`（系統預設）可編輯／刪除，卡片上標示「系統預設」徽章

**版面（雙欄 master-detail）**:
1. **概覽列**：搜尋框（比對節點 id / 名稱 / 大節點，以及其下迷思 label / id）+ 全域統計（共 N 個知識節點 · M 條迷思概念）
2. **左欄節點清單**：依次主題（`unitId`，無則歸「未分配次主題」）分組，組內依 `learningOrder → id` 排序；每個節點顯示名稱 / id / 迷思數徽章（0 條以黃色提醒）；點選即選取
3. **右欄迷思卡片**：選中節點標題列（名稱 / id / 所屬次主題 / 迷思數 + 「新增迷思」按鈕）＋ 迷思卡片清單。卡片**統一只顯示** `label` / `id` / `detail`（教師視角）＋ `source`（資料來源，獨立淺灰底方塊 + `menu_book` icon，有填才顯示），含「編輯」「刪除」。`studentDetail`（學生視角）與 `confirmQuestion`（AI 確認問句）**不在卡片顯示**（資料保留於 DB、學生端照常使用，僅於「編輯」modal 內檢視與修改）

**資料來源欄位（`source`）**：迷思新增 `source` 欄（spec-11 §3.19，migration 0028）。用於標註文獻出處（如後設研究引用清單），自建迷思可留空。卡片底部與 §3.9 內嵌編輯器的迷思列皆會顯示。

**UI 元素**（spec-14）:
- 新增 / 編輯走 `MisconceptionFormModal`（薄荷綠表單 modal）：ID（新增必填、編輯唯讀、前端驗證 `M{XX}-{Y}` 格式與同節點重複）+ 迷思短標 + 三段描述 textarea + 資料來源 textarea
- 刪除走共用 `AdminConfirmModal`（`variant='danger'`）
- 左側 sidebar 導覽新增「迷思概念」項（icon `psychology`），位於「知識節點」與「範例題庫」之間

**子元件**（位於 `src/pages/admin/components/`）:
- `MisconceptionFormModal.jsx` — 新增 / 編輯迷思 modal（共用於 create 與 edit；`isEdit` 切換 ID 唯讀與送出的 mutation）

**狀態依賴**:
- `useAdminKnowledgeNodes({})`：列出所有節點（含迷思）作為左欄資料源
- `useAdminUnits({ type: 'subtheme' })`：次主題名稱對照（左欄分組標題）
- `useCreateMisconception()` / `useUpdateMisconception()` / `useDeleteMisconception()`：迷思 CRUD（成功後 invalidate `['admin-knowledge-nodes']`）

---

### 3.11 SampleQuizzes (`/admin/sample-quizzes`)
**檔案**: `src/pages/admin/SampleQuizzes.jsx`

**功能描述**:
- 管理員跨教師檢視所有題組，並可一鍵把任一題組標記 / 取消為「**系統範例**」
- 題組本身仍由教師端 `QuizCreateWizard` 建立；admin 在此**不能從零建立題組**，僅負責標記
- 教師端 `QuestionImportDrawer`（出題精靈的「從題庫挑題」抽屜）：
  - 系統範例題組自動排到最上面
  - 標題列顯示藍色 `verified` icon + 「系統範例」徽章

**UI 元素**（spec-14）:
- 工具列：篩選 tab（全部 / 系統範例 / 一般）+ 搜尋框 + 統計列
- 黃色提示卡：說明系統範例機制
- 表格欄位：題組（標題 + ID + 範例徽章）/ 建立教師 / 節點（最多顯示 3 個）/ 題數 / 狀態 pill / 建立日期 / 操作按鈕
- 操作按鈕：「設為範例」/「取消範例」依當前狀態切換顏色（藍 ↔ 紅）

**狀態依賴**:
- `useAdminQuizzes()`：跨教師列表（含 owner 姓名）
- `useToggleSampleQuiz()`：mutation 切換 isSample；成功後同時 invalidate `quizzes` query 讓教師端立即看到
