# SPEC-02: Routes & Pages / 路由與頁面規格

## 1. 路由架構

所有路由定義於 `src/App.jsx`，使用 `react-router-dom` 的 `BrowserRouter` + `Routes` + `Route`。
全域狀態透過 `AppProvider` 包裹所有路由。

### 1.1 路由對照表

| 路徑 | 元件 | 說明 | 佈局 |
|------|------|------|------|
| `/` | `LoginPage` | 角色選擇（登入）頁 | 無（全螢幕） |
| `/teacher` | `TeacherDashboard` | 教師主頁：三步驟工作流程總覽 | `TeacherLayout` |
| `/teacher/dashboard` | `DashboardReport` | 班級診斷結果儀表板 | `TeacherLayout` |
| `/teacher/quiz/create` | `QuizCreateWizard` | 出題精靈（多步驟） | `TeacherLayout` |
| `/teacher/quizzes` | `QuizLibrary` | 考卷庫：瀏覽與管理考卷 | `TeacherLayout` |
| `/teacher/assignments` | `AssignmentManagement` | 派題管理：指派考卷給班級 | `TeacherLayout` |
| `/teacher/classes` | `ClassManagement` | 班級管理：檢視班級名冊 | `TeacherLayout` |
| `/teacher/classes/:classId` | `ClassDetail` | 班級詳情：個別班級學生資訊 | `TeacherLayout` |
| `/teacher/knowledge-map` | `KnowledgeMap` | 知識地圖：知識節點層級結構 | `TeacherLayout` |
| `/teacher/report` | `TeacherReport` | 舊版診斷報告（保留向後相容） | `TeacherLayout` |
| `/student` | `StudentHome` | 學生首頁：瀏覽可作答考卷 | 簡易 Header |
| `/student/quiz/:quizId` | `StudentQuiz` | 對話式診斷測驗介面 | 簡易 Header |
| `/student/report` | `StudentReport` | 個人學習健康報告 | 簡易 Header |
| `*` | `Navigate to /` | 404 重導向首頁 | — |

### 1.2 路由參數

| 參數 | 型別 | 使用頁面 | 說明 |
|------|------|----------|------|
| `:classId` | string | `ClassDetail` | 班級 ID（如 `class-A`） |
| `:quizId` | string | `StudentQuiz` | 考卷 ID（如 `quiz-001`） |

## 2. 各頁面詳細規格

---

### 2.1 LoginPage (`/`)
**檔案**: `src/pages/LoginPage.jsx`

**功能描述**:
- 系統入口頁面，提供角色選擇
- 點選「教師端」→ 設定 `role = 'teacher'`，導航至 `/teacher`
- 點選「學生端」→ 設定 `role = 'student'`，導航至 `/student`

**UI 元素**:
- 品牌標識：放大鏡 icon（綠色色塊背景）+ wordmark `SciLens` + 副標 `迷思概念診斷系統` + 第三行 `以「水溶液」單元為例`
- 兩個角色選擇按鈕（教師/學生）
- 背景使用柔和色調

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

### 2.3 DashboardReport (`/teacher/dashboard`)
**檔案**: `src/pages/teacher/DashboardReport.jsx`

**功能描述**:
- 班級層級的診斷結果視覺化儀表板
- 支援按班級篩選資料
- 支援選擇不同考卷查看結果

**UI 元素**:
- 班級篩選下拉選單
- 考卷選擇器
- 長條圖：各知識節點概念掌握率
- 散佈圖：完成率 vs. 正確率
- 迷思概念分佈熱力圖
- 各題選項分佈圖
- InfoButton 觸發資料說明面板

**狀態依賴**:
- `currentClassId`, `setCurrentClassId`
- `currentQuizId`, `setCurrentQuizId`
- `classes`, `quizzes`, `assignments`

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
- 儲存時呼叫 `saveQuiz()` 存入考卷庫

**狀態依賴**: `selectedNodeIds`, `setSelectedNodeIds`, `quizQuestions`, `setQuizQuestions`, `saveQuiz`

---

### 2.5 QuizLibrary (`/teacher/quizzes`)
**檔案**: `src/pages/teacher/QuizLibrary.jsx`

**功能描述**:
- 瀏覽所有已建立的考卷
- 支援搜尋/篩選
- 可進入編輯模式修改考卷
- 可刪除草稿狀態考卷

**UI 元素**:
- 考卷卡片列表（標題、題數、狀態、建立日期）
- 狀態標籤：`draft`（草稿）/ `published`（已發佈）
- 操作按鈕：編輯、刪除、發佈

**狀態依賴**: `quizzes`, `saveQuiz`

---

### 2.6 AssignmentManagement (`/teacher/assignments`)
**檔案**: `src/pages/teacher/AssignmentManagement.jsx`

**功能描述**:
- 管理考卷派發記錄
- 新增派題：選擇考卷 → 選擇班級 → 設定截止日期
- 檢視已派題記錄及完成狀態
- 可刪除或更新派題

**UI 元素**:
- 派題列表（考卷名稱、班級、指派日期、截止日期、完成率）
- 新增派題表單/對話框
- 完成率進度條

**狀態依賴**: `assignments`, `addAssignment`, `updateAssignment`, `removeAssignment`, `quizzes`, `classes`

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
- 學生端首頁
- 顯示可作答的已發佈考卷列表
- 顯示過去的作答歷史記錄
- 可點擊考卷進入作答

**UI 元素**:
- 可用考卷卡片列表
- 歷史記錄區塊（日期、考卷名稱、正確率）
- 進入作答按鈕

**狀態依賴**: `quizzes`, `studentHistory`, `setActiveStudentReport`

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
