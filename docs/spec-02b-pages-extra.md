# SPEC-02B: Routes & Pages — 班級 / 知識地圖 / 學生端詳細規格

> 本文件接續 `spec-02-routes-and-pages.md`，收錄教師端「班級管理 / 知識地圖 / 舊版報告」與學生端三個頁面（§2.7 ~ §2.13）的詳細規格。
> 路由總表、登入頁、儀表板、出題與派題頁仍在 `spec-02-routes-and-pages.md`。

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
- 「+ 新增分類」按鈕（位於學年篩選器右側）— 開啟 `window.prompt` 輸入分類名稱；後端去重，重名回 409 `DUPLICATE_NAME` 提示再試
- 班級分類視圖（`ClassCategorySection` + `ClassMiniCard`）：
  - 依教師自訂分類分區段（依 `sortOrder` 排）
  - 每段 header 顯示分類名 / 班級數 / 改名 ✏️ / 刪除 🗑️
  - 下方是 `grid-cols-2/3` 小卡片；卡片內容：色塊（左側 1.5px）+ 粗體班名 + 副標「N 位學生 · 114 下」
  - 最後一段恆為「未分類」（無對應 `category_id`，不可改名 / 刪除）
  - 卡片可拖曳跨分類（`@dnd-kit`），落下時呼叫 `PATCH /api/classes/{id}` 寫入 `categoryId`
  - 已封存班級：opacity 60% + grayscale + 「已封存」chip；唯有勾選「顯示已封存班級」才會出現
- 空狀態：「目前學年/學期沒有班級。點右上『新增班級』… 或勾選『顯示已封存班級』查閱歷史。」
- **新增班級**：開啟 `ClassFormModal` (isEdit=false)；提交 → `useCreateClass()`

**沒有的東西**（與既有實作差異）：
- 班級卡片/列上沒有編輯/封存/刪除按鈕
- 沒有派題數、最近派題日期等「教學活動」統計（這些屬於儀表板）

**狀態依賴**:
- `useApp()`：`currentSchoolYear`、`currentSemester`、`includeArchivedClasses`
- `useClasses()`：依篩選器即時拉取班級清單
- `useCreateClass()`：新增班級
- `useClassCategories()` / `useCreateClassCategory()` / `useRenameClassCategory()` / `useDeleteClassCategory()`：分類資料（後端 `/api/class-categories`，per-teacher 隔離，spec-11 §3.x）
- `useUpdateClass()`：拖曳卡片落下時呼叫，傳 `{ categoryId }`（傳 `null` = 移出分類）
- ClassManagement 初次掛載會自動偵測舊版 `localStorage[teacher_class_categories_v1:{teacherId}]`，存在則一次性遷移到後端（呼叫 POST /class-categories + PATCH /classes/{id}）後清掉

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
- 派題類型僅有「📝 診斷測驗」（`Assignment.type='diagnosis'`）一種

**視覺風格**: 沿用 spec-07 木框收集冊風 + **手遊養成系任務畫面**佈局（參考 Pokemon Trainer Rank 升級畫面：HUD + 米紙 panel + 白底厚棕邊任務卡）。

> **設計演進（2026-04-29）**：
> - v2.1：闖關地圖（曲折路徑 + 圓形關卡節點） — 棄用，派題沒有先後順序、線性路徑誤導
> - v2.2：任務看板初版（雙層木框任務卡 + 多行 meta） — 木框層層套娃、視覺重點稀釋
> - v2.3：簡潔單列版（單層彩色背景 + 一行 meta） — 任務卡視覺權重不夠，標題不夠突出
> - **v2.4（HUD + 米紙 panel + 厚棕邊任務卡）採用**：頂部 sky HUD（透明 overlay 在草地天空底圖上）+ 圓角米紙 panel（佔頁面下半，淡斜紋紙感）+ 白底厚棕邊任務卡（大圖示 + 大標題 + 進度條 + 厚黃 chunky 按鈕 + 卡底綠 band）— 視覺權重對齊參考圖，任務列表清楚可見

**資料模型對應**:
- 學生班級綁定：原型期暫定常數 `STUDENT_CLASS_ID = 'class-A'`，未來搬至 AppContext
- 任務來源：`assignments.filter(a => a.classId === STUDENT_CLASS_ID)`
- 過往成績：對每個派題的 `quizId`，從 `studentHistory` 找最佳紀錄（`correctCount` 最高者），並以正確率 映射為 1~3 顆星：≥80% 三星、≥50% 二星、>0 一星

**任務狀態決定邏輯**:
| 狀態 | 條件 | 視覺 |
|------|------|------|
| `completed` | 該 quizId 在 studentHistory 中已有紀錄 | 綠色 `check_circle` 徽章 + 三星評等 + 完成日 + 「查看報告」「再次挑戰」按鈕 |
| `expired` | 無紀錄且 `dueDate < today` | 暗紅 `schedule` 徽章 + 「已過期」標籤 + 灰調 + 「仍可挑戰」按鈕（不鎖死） |
| `next` | 無紀錄且 `dueDate >= today` | 亮橘 `flag` 徽章 + 「開始挑戰」GO 按鈕；若 `dueDate - today ≤ 3` 加紅色「剩 N 天」緊急標籤 |

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
  - AvatarPill = 木框內 [avatar img] + 「班級名」+ **學習進度條**（探索的概念 % + 數字）
  - mobile (`<sm`)：只顯示 avatar 圖示，隱藏文字 + 進度條
- 右：合併三項統計 pill（`CombinedStats`，木框內 3 cell 用直線分隔，每 cell = icon + 數字無 label）+ 設定齒輪（點擊開啟 `StudentSettingsDrawer`）
  - 統計項：已完成 `M/N` ｜ 已探索概念 `X/12` ｜ 待完成 `K`
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
  - `urgent`（剩 ≤ 3 天）：紅底白邊「剩 N 天 / 今天截止」
  - `completed`：綠底白邊「完成」
  - `expired`：灰底白邊「已過期」

**6. 空狀態**：米紙 panel 內顯示 `inventory_2` 大 icon + 「看板還是空的 / 老師還沒派任務給你 · 等老師派題後就會出現在這裡」

**已刪除元素**（v2.3 → v2.4）：
- 任務卡上的「派發日」、緊急 inline pill（改用左上貼紙）
- 全幅草地背景 (`bg_ground.png`)，回用 `bg_chiheisen_green.jpg`（為了天空 / 草地分層 HUD 結構）
- 細條 section header（取代為橘色豎條 tab marker）

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
