# SPEC-04: Data Models / 資料模型規格

## 0. 全域狀態總覽

| 來源 | 檔案 | 用途 | 起始版本 |
|------|------|------|---------|
| `AuthContext` | `src/context/AuthContext.jsx` | 當前登入者（role / name / id 等）+ login/logout | P1 |
| `AppContext` | `src/context/AppContext.jsx` | UI 狀態（出題精靈、目前選中的 quiz/class） | 既有；**P3 大幅瘦身** |
| **React Query hooks** | `src/hooks/*.js` | classes / quizzes / assignments / N1+N2 摘要的 fetch + cache + mutation | **P3 新增** |

> **P1 重要變更**：原先 `AppContext.role / setRole` 已移除。任何元件需要當前角色，請改用 `useAuth().role`。
>
> **P3 重要變更**：原先 AppContext 直接持有的 `classes / quizzes / assignments` 與所有對應的 setters / save / add / update / remove 函式**全部移除**。改由 React Query hooks 提供：
> - `useClasses()` / `useClass(classId)` / `useCreateClass()` / `useUpdateClass()` / `useUpdateClassStudents()`
> - `useQuizzes()` / `useQuiz(quizId)` / `useSaveQuiz()` / `useDeleteQuiz()`
> - `useAssignments(filters)` / `useAddAssignment()` / `useUpdateAssignment()` / `useRemoveAssignment()`
> - `useStudent(studentId)` / `useResetStudentPassword()`
> - `useGradeSummary()` / `useClassSummary()` — N1 / N2 mutation

### 0.1 AuthContext（spec-13 §8）

```js
const { currentUser, loading, role, login, logout } = useAuth();
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `currentUser` | `{ id, account, role, name?, classId?, seat?, passwordWasDefault } \| null` | 由 `GET /api/auth/me` 帶回 |
| `loading` | `boolean` | bootstrap 中（首次嘗試從 cookie 還原） |
| `role` | `'teacher' \| 'student' \| null` | `currentUser?.role` 的捷徑 |
| `login(account, password)` | `async → user` | 呼叫 `POST /api/auth/login`，set HttpOnly cookie，回傳 user |
| `logout()` | `async` | 呼叫 `POST /api/auth/logout`，清 state |

`AuthProvider` 必須包在 `AppProvider` 之外（見 `src/App.jsx`）。

---

## 1. 全域狀態 (AppContext)

**檔案**: `src/context/AppContext.jsx`

使用 React Context API (`createContext` + `useContext`)，提供 `useApp()` Hook 存取全域狀態。

### 1.1 狀態欄位（P3 後）

| 欄位 | 型別 | 初始值 | 說明 |
|------|------|--------|------|
| ~~`role`~~ | — | — | **P1 移除**：改由 `useAuth().role` 提供 |
| `quizQuestions` | `Question[]` | `[...defaultQuestions]` | 出題精靈中正在編輯的題目（純 UI 狀態） |
| `selectedUnitId` | `string` | `'unit-water-solution'` | 出題精靈當前選定的**教學單元**（一份題組只綁一個單元）。Step0Unit 設定；切換單元會清空 `selectedNodeIds` 與 `quizQuestions`。該單元的節點 = 全部節點依其大節點（`/units` 的 `parentNodes` → `parentNodeId`）過濾，**不是** `knowledge_nodes.unit_id`（指向次主題） |
| `selectedNodeIds` | `string[]` | `['INe-Ⅱ-3-02', 'INe-Ⅱ-3-03', 'INe-Ⅱ-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7']` | 出題精靈中選定的知識節點（限所選單元內） |
| `nodeQuestionCounts` | `Record<string, number>` | `{}` | 出題精靈中各節點的預期出題數（key = 節點 ID，value = 題數 1–4，預設 1）；由 Step1Nodes 的 chip stepper 管理，供 Step2Edit 用於 CoveragePanel 顯示「實際 / 目標」 |
| `editingQuizId` | `string \| null` | `null` | 出題精靈當前正在編輯的 quiz id：`null` = 新建 / 複製模式（儲存走 POST）；有值 = 編輯既有 quiz（儲存走 PUT，含自動暫存覆蓋同一份）。由 QuizLibrary 的「編輯／繼續編輯」設置；「複製為新題組」與 TeacherDashboard 的「新增題組／推薦題組」皆會清空此值 |
| `editingQuizStatus` | `'draft' \| 'published' \| null` | `null` | 編輯時帶入的原始 status，用於 Step2Edit 判定是否啟用自動暫存（`published` 卷自動暫存停用，避免被降級為 draft） |
| `editingQuizMode` | `'single' \| 'two-tier'` | `'single'` | 出題精靈 Step0 選擇的題型：`single` = 傳統單層迷思選擇題（舊行為）；`two-tier` = 雙層次診斷題（第一層選答案 + 第二層選理由，Treagust 1988）。存入此值後傳遞給 Step2Edit / EditQuestionModal，決定編輯器呈現雙層或單層介面。儲存時寫入 quiz.mode 欄位 |
| ~~`classes`~~ | — | — | **P3 移除**：改用 `useClasses()` |
| `currentClassId` | `string \| null` | `null` | 當前篩選的班級 ID（純 UI 狀態，配合 dashboard URL query 同步） |
| `currentSchoolYear` | `number` | `getCurrentSchoolYear()` | 目前 dashboard 篩選的學年度（西元年）；變更時 persist 到 `localStorage.sciLens.schoolYear` |
| `currentSemester` | `'first' \| 'second'` | `getCurrentSemester()` | 目前 dashboard 篩選的學期；persist 到 `localStorage.sciLens.semester` |
| `includeArchivedClasses` | `boolean` | `false` | 是否在 dashboard / 班級管理列表中包含已封存班級；persist 到 `localStorage.sciLens.includeArchived` |

> 上述 3 個學年/封存篩選欄位由 `/teacher/dashboard/*` 與 `/teacher/classes` **共用同一份 AppContext state**，切換任一頁皆生效（詳見 spec-05 §1.5.3）。
| ~~`currentClass`~~ | — | — | **P3 移除**：用 `useClass(currentClassId).data` |
| ~~`quizzes`~~ | — | — | **P3 移除**：改用 `useQuizzes()` |
| `currentQuizId` | `string \| null` | `null` | 當前選中的題組 ID（純 UI 狀態） |
| ~~`assignments`~~ | — | — | **P3 移除**：改用 `useAssignments()` |
| ~~`studentAnswers`~~ | — | — | **P4 移除**：作答即時 POST 至 `/api/answers`，dashboard 從 DB 拉 |
| `studentName` | `string` | `'學生'` | 已被 `useAuth().currentUser.name` 取代，但保留相容 |
| `studentHistory` | `HistoryRecord[]` | `[]` | **P4 修改**：改為 session-local in-memory 快照（記錄本次作答，供「剛做完即看報告」免等後端）；長期歷史改由 `useStudentHistory(studentId)` 從 DB 拉 |
| `activeStudentReport` | `HistoryRecord \| null` | `null` | 當前查看的學生報告（仍用 in-memory 暫存當前報告） |

### 1.2 衍生值

| 欄位 | 型別 | 計算邏輯 |
|------|------|----------|
| `studentMisconceptions` | `string[]` | `studentAnswers.filter(a => a.diagnosis !== 'CORRECT').map(a => a.diagnosis)` |
| `correctCount` | `number` | `studentAnswers.filter(a => a.diagnosis === 'CORRECT').length` |

### 1.3 操作函式（P3 後保留的）

| 函式 | 參數 | 說明 |
|------|------|------|
| `setQuizQuestions(questions)` | `Question[]` | 更新精靈中的題目 |
| `setSelectedNodeIds(ids)` | `string[]` | 更新精靈中選定的節點 |
| `setNodeQuestionCounts(counts)` | `Record<string, number>` | 更新各節點的預期出題數；亦可傳入部分更新（單個節點）的物件 |
| `setCurrentClassId(id)` | `string \| null` | 切換篩選班級 |
| `setCurrentQuizId(id)` | `string \| null` | 切換當前題組 |
| `setCurrentSchoolYear(year)` | `number` | 切換 dashboard 學年度篩選；同步寫 localStorage |
| `setCurrentSemester(sem)` | `'first' \| 'second'` | 切換學期篩選 |
| `setIncludeArchivedClasses(flag)` | `boolean` | 切換是否顯示已封存班級 |
| `recordAnswer` / `removeMisconception` / `resetStudentAnswers` / `addToHistory` / `setActiveStudentReport` | — | 學生作答相關（P4 才搬 DB） |
| `mergeRetryIntoReport(questionId, { answer, followUpResult })` | `(number, { answer, followUpResult })` | **誤判補救「重新問這一題」用**（spec-05 §2.1.1）：替換 `activeStudentReport` 中同題的 `answer` 與 `followUpResult`，重算 `correctCount` 與 `misconceptions`。不建立新報告、不影響其他題；`activeStudentReport` 為空（如從歷史頁進來）時不動，重做資料已逐題存進 DB，由後端來源呈現 |

**P3 移除的 AppContext 函式（請改用 hooks）**：
- `updateClassStudents` → `useUpdateClassStudents().mutate({ classId, students })`
- `saveQuiz` → `useSaveQuiz().mutate(quiz)`
- `addAssignment` / `updateAssignment` / `removeAssignment` → `useAddAssignment / useUpdateAssignment / useRemoveAssignment`

### 1.4 React Query Hooks（P3 新增）

**檔案位置**：`src/hooks/`

統一使用 `@tanstack/react-query` v5。`QueryClientProvider` 在 `src/main.jsx` 包覆 `<App />` 之外。

```jsx
// src/hooks/useClasses.js
export function useClasses(filter) {
  // filter = { schoolYear?, semester?, includeArchived? }；省略時由 hook 自動帶入當前學年/學期/false
  return useQuery({
    queryKey: ['classes', filter],
    queryFn: () => api.get('/classes', { params: filter }),
  });
}
```

| Hook | 對應 API | Cache key | 備註 |
|------|---------|-----------|------|
| `useClasses(filter?)` | `GET /api/classes?school_year=&semester=&include_archived=` | `['classes', filter]` | **教師專屬**。回傳 `ClassBrief[]`：`{ id, name, grade, subject, color, textColor, studentCount, schoolYear, semester, status }` — **不包含** `students` 陣列。`filter` 省略時 hook 內部呼叫 `getCurrentSchoolYear()` / `getCurrentSemester()` 並設 `includeArchived=false`；傳空物件 `{}` 則 server 不過濾（顯示全部） |
| `useClass(classId)` | `GET /api/classes/{id}` | `['classes', classId]` | **教師專屬**。`ClassDetail` = `ClassBrief` + `students: StudentBrief[]`；可讀任何學年度的班級（含已封存） |
| `useCreateClass()` | `POST /api/classes` | invalidate `['classes']` | **教師**。Body：`{ name, grade, subject, color, textColor, schoolYear?, semester?, note? }`；省略 schoolYear/semester 時 server 自動帶入當前學年；server 自動產生 id（`class-A..Z` 取下一個） |
| `useUpdateClass()` | `PATCH /api/classes/{id}` | invalidate `['classes']`、`['classes', id]` | **教師**。Body 為部分更新；可帶 `name/grade/subject/color/textColor/schoolYear/semester/note`，傳 `note: null` 可清空備註 |
| `useArchiveClass()` | `POST /api/classes/{id}/archive` | invalidate `['classes']` | **教師**。設 status='archived'、archivedAt=now；不刪除任何 assignments / answers |
| `useUnarchiveClass()` | `POST /api/classes/{id}/unarchive` | invalidate `['classes']` | **教師**。還原為 status='active'、archivedAt=null |
| `useUpdateClassStudents()` | `PUT /api/classes/{id}/students` | invalidate `['classes']` | mutation |
| `useStudent(studentId)` | `GET /api/students/{id}` | `['students', id]` | **教師**：含明文密碼 |
| `useResetStudentPassword()` | `POST /api/students/{id}/reset-password` | invalidate `['students', id]` | mutation |
| `useQuizzes()` | `GET /api/quizzes` | `['quizzes']` | 教師看全部；學生只回自己班級已被派發的 |
| `useQuiz(quizId)` | `GET /api/quizzes/{id}` | `['quizzes', id]` | 含 questions + options；學生需該 quiz 已派至自己班級 |
| `useSaveQuiz()` | `POST` 或 `PUT /api/quizzes[/{id}]` | invalidate `['quizzes']` | upsert（教師） |
| `useDeleteQuiz()` | `DELETE /api/quizzes/{id}` | invalidate `['quizzes']` | （教師） |
| `useAssignments(filters?)` | `GET /api/assignments?...` | `['assignments', filters]` | filters: `{ classId, quizId }`；學生隱式只看自己班；回傳含 `completionRate / submittedCount / totalStudents`；**對學生身份額外回傳 `myDiagnosisCompleted`**，學生首頁據此判斷任務是否完成（跨刷新仍正確） |
| `useAddAssignment()` | `POST /api/assignments` | invalidate `['assignments']` | |
| `useUpdateAssignment()` | `PATCH /api/assignments/{id}` | invalidate `['assignments']` | |
| `useRemoveAssignment()` | `DELETE /api/assignments/{id}` | invalidate `['assignments']` | |
| `useGradeSummary()` | `POST /api/ai/grade-summary` | mutation only | N1，每次點擊重新呼叫；P4 後端從 DB 算統計 |
| `useClassSummary()` | `POST /api/ai/class-summary` | mutation only | N2；P4 後端從 DB 算統計 |
| **P4** ↓ | | | |
| `useClassAnswers(quizId, classId)` | `GET /api/quizzes/{id}/answers?classId=` | `['answers', quizId, classId]` | 教師端查班級作答 |
| `useClassFollowups(quizId, classId)` | `GET /api/quizzes/{id}/followups?classId=` | `['followups', quizId, classId]` | 教師端查該班完整 N3 追問對話（含 `conversationLog / aiSummary / finalStatus / misconceptionCode / reasoningQuality / statusChange`）；用於 SingleClassReport 底部的對話檢視 |
| `useQuizStats(quizId, classId?)` | `GET /api/quizzes/{id}/stats?classId=` | `['quiz-stats', quizId, classId]` | 取代 mock `getNodePassRates / getMisconceptionStudents`；two-tier 模式額外回傳 `quadrantStats`（`{ [questionId]: { TT, TF, FT, FF } }`）與 `mode`；節點通過率計算：two-tier 以 `quadrant==='TT'` 計算（無 quadrant 的舊資料 fallback `diagnosis`）|
| `useStudentHistory(studentId)` | `GET /api/students/{id}/history` | `['student-history', studentId]` | 學生個人作答歷史；每筆含 `causeIdsByMisconception`、`errorTypeByMisconception`、`aiSummaryByMisconception`、`statusChangeByMisconception`、`quoteByMisconception`（皆 `{misconceptionCode: ...}`）與 `questionResults`（`{questionId, nodeId, stem, selectedOptionContent, selectedTag, diagnosis, isCorrect}[]`，逐題對錯＋題幹＋所選選項，供報告「每一題的結果」**不依賴前端 mock 即可渲染任何真實題組**），用於 in-memory 快照失效（重新登入/重整）時還原成因徽章、錯誤類別、「給你的話」、想法轉變、引用與逐題結果。**同一題多筆作答（同一份題組重複施測）只取最新一筆**，題數與對錯數以唯一題目計 |
| `useRecordAnswer()` | `POST /api/answers` | invalidate stats / answers / history | 一次接受陣列；two-tier 作答時每筆需含 `reasonTag` 與 `quadrant` |
| `useRecordFollowups()` | `POST /api/answers/{id}/followup` 一次多筆 | invalidate stats / answers / history | |

---

## 2. 資料型別定義

### 2.1 Question（題目）
**來源**: `src/data/quizData.js`（前端編輯器 / mock 內部 shape；helper 定義於 `src/data/twoTier.js`）

題目依 `mode` 欄位分為兩種形態，由 `src/data/twoTier.js` 的 helper 函式統一處理 runtime 邏輯：

```typescript
// single 題（舊行為，mode 欄位省略或為 'single'）
interface SingleQuestion {
  id: number;                    // 題號（1-based，即 order_index）
  stem: string;                  // 題幹文字
  knowledgeNodeId: string;       // 對應知識節點 ID（如 'INe-Ⅱ-3-02'）
  options: Option[];             // 選項陣列（固定 4 個：A/B/C/D）
}

interface Option {
  tag: 'A' | 'B' | 'C' | 'D';  // 選項標籤
  content: string;               // 選項內容文字
  diagnosis: string;             // 'CORRECT' 或迷思概念 ID（如 'M02-1'）
}

// two-tier 題（雙層次診斷，Treagust 1988）
interface TwoTierQuestion {
  id: number;
  stem: string;
  knowledgeNodeId: string;
  mode: 'two-tier';
  // 第一層：選答案
  answerOptions: AnswerOption[];  // 標籤 A/B/C
  // 第二層：選理由
  reasonOptions: ReasonOption[];  // 標籤 甲/乙/丙（Unicode，避免與答案層混淆）
}

interface AnswerOption {
  tag: 'A' | 'B' | 'C';         // 答案層標籤（三選項）
  content: string;
  correct: boolean;              // true = 正解；DB 端存 diagnosis='CORRECT'|'WRONG' 哨兵
}

interface ReasonOption {
  tag: '甲' | '乙' | '丙';       // 理由層標籤（Unicode 中文，避免與答案層混淆）
  content: string;
  diagnosis: string;             // 'CORRECT' 或迷思 ID（如 'M02-1'）
  answerTag?: 'A' | 'B' | 'C';   // 此理由對應第一層哪個答案（出題結構標註）
}
// 出題規範：每個第一層答案（A/B/C）都需有 ≥1 個理由以 answerTag 對應。
// answerTag 僅為出題端結構標註與驗證之用；**學生作答時第二層仍顯示全部理由**，
// 不據 answerTag 過濾，四象限判定也不受其影響。
```

#### 四象限定義（two-tier 專用）

| 象限代碼 | 答案 | 理由 | 含義 | 迷思碼 |
|---------|------|------|------|--------|
| `TT` | 對 | 對 | 真理解 | 無（CORRECT） |
| `TF` | 對 | 錯 | 假陽性（答對但理由是迷思） | 理由選項的 diagnosis |
| `FT` | 錯 | 對 | 假陰性（答錯但理由正確，可能運氣） | 無（CORRECT） |
| `FF` | 錯 | 錯 | 真迷思 | 理由選項的 diagnosis |

**迷思碼歸屬原則**：迷思碼一律取自「錯誤理由」（TF/FF 帶 M-code；TT/FT 為 CORRECT 不掛迷思）。
**節點通過標準**：two-tier 模式下，節點「通過」＝ `quadrant === 'TT'`（不是只看 `diagnosis === 'CORRECT'`）。

### 2.2 Quiz（題組）
**來源**: `src/data/quizData.js` (`QUIZZES_DATA`)

```typescript
interface Quiz {
  id: string;                    // 題組 ID（如 'quiz-001'）
  title: string;                 // 題組標題
  mode: 'single' | 'two-tier';  // 題型模式（省略視為 'single'，向下相容）
  status: 'draft' | 'published'; // 狀態
  questionCount: number;         // 題目數量
  knowledgeNodeIds: string[];    // 涵蓋的知識節點 ID 列表（同屬一個單元）
  questions: Question[];         // 題目陣列（依 mode 可為 SingleQuestion | TwoTierQuestion）
  createdAt: string;             // 建立日期（YYYY-MM-DD）
}
```

> **題組的「所屬單元」不另存欄位**，而是由 `knowledgeNodeIds` 反推（每個節點都帶 `unitId`，且一份題組只綁一個單元）。QuizLibrary 編輯/複製時用 `useAllKnowledgeNodes()` 建 id→unitId 對應推導出 `selectedUnitId`。詳見 `docs/deviations.md`（2026-06-05）。

**預設資料**:
| ID | 標題 | mode | 題數 | 狀態 | 涵蓋節點 |
|----|------|------|------|------|----------|
| `quiz-001` | 水溶液 · 迷思診斷（第一次） | single | 5 | published | INe-Ⅱ-3-02, INe-Ⅱ-3-03, INe-Ⅱ-3-05, INe-Ⅲ-5-4, INe-Ⅲ-5-7 |
| `quiz-002` | 水溶液 · 迷思診斷（第二次） | single | 5 | published | INe-Ⅱ-3-02, INe-Ⅱ-3-03, INe-Ⅱ-3-05, INe-Ⅲ-5-4, INe-Ⅲ-5-7 |
| `quiz-003` | 水溶液 · 雙層次診斷（示範） | two-tier | 5 | published | INe-Ⅱ-3-02, INe-Ⅱ-3-03, INe-Ⅱ-3-05, INe-Ⅲ-5-4, INe-Ⅲ-5-7 |
| `quiz-004` | 水溶液 · 雙層次診斷（示範·第二份） | two-tier | 5 | published | INe-Ⅱ-3-02, INe-Ⅱ-3-03, INe-Ⅱ-3-05, INe-Ⅲ-5-4, INe-Ⅲ-5-7 |

### 2.3 Class（班級）
**來源**: `src/data/classData.js`

```typescript
interface Class {
  id: string;             // 班級 ID（如 'class-A'）
  name: string;           // 班級名稱（如 '五年甲班'）
  grade: string;          // 年級（如 '五年級'）
  subject: string;        // 科目（如 '自然科學'）
  color: string;          // 班級代表色（CSS HEX，如 '#C8EAAE'）
  textColor: string;      // 文字色（CSS HEX，如 '#3D5A3E'）
  // ── 學年度與生命週期（0011 migration / 新增） ────────────────
  schoolYear: number;     // 學年度（西元年）；114 學年度 = 2025（範圍 2025-08-01 ~ 2026-07-31）
  semester: 'first' | 'second'; // 上學期 / 下學期
  status: 'active' | 'archived'; // 目前任教 / 已封存（封存後從預設清單隱藏，但歷史資料保留）
  archivedAt: string | null;     // 封存時間 ISO 字串（後端 TIMESTAMPTZ 序列化）；status='active' 時必為 null
  note?: string;          // 教師備註（既有欄位，0004 migration）
  students: Student[];    // 學生名冊
}

interface Student {
  id: number;             // 學生 ID（1-based）
  name: string;           // 學生姓名
  seat: number;           // 座號
}
```

**學年度判定規則**（前後端共用，定義於 `src/utils/schoolYear.js` 與 `backend/app/utils/school_year.py`）：

```
給定日期 d：
  if d.month >= 8: schoolYear = d.year,        semester = 'first'
  if d.month <= 1: schoolYear = d.year - 1,    semester = 'first'
  else (2 ≤ month ≤ 7): schoolYear = d.year - 1, semester = 'second'
```

**預設資料**（demo seed，學年皆設為當前學年下學期、status='active'）:
| ID | 名稱 | 學生數 | 代表色 | 學年度 | 學期 | 狀態 |
|----|------|--------|--------|--------|------|------|
| `class-A` | 五年甲班 | 20 | #C8EAAE (淺綠) | 2025 | second | active |
| `class-B` | 五年乙班 | 18 | #BADDF4 (淺藍) | 2025 | second | active |
| `class-C` | 五年丙班 | 22 | #FCF0C2 (淺黃) | 2025 | second | active |

**生命週期規則**（詳見 spec-05 §1.5）：
- 建立班級時若未指定，預設 `schoolYear = getCurrentSchoolYear()`、`semester = getCurrentSemester()`、`status = 'active'`、`archivedAt = null`
- 「封存」是軟性操作：設 `status='archived'` 並寫入 `archivedAt`；歷史 assignments / answers / followups 不刪除
- 「還原」：設 `status='active'`、`archivedAt = null`
- 學期切換（同一班 5 上 → 5 下）：建議新建班級而非改 `semester`，避免破壞舊學期統計；舊班級可由教師決定是否封存

### 2.4 Assignment（派題記錄）
**來源**: `src/data/assignmentData.js`

```typescript
interface Assignment {
  id: string;             // 派題 ID（如 'assign-001'，新增時自動生成 'assign-{timestamp}'）
  type?: 'diagnosis';     // 派題類型，固定為 'diagnosis'（scenario / treatment 模組已下線）
  quizId: string;         // 診斷題組 ID
  classId: string;        // 班級 ID
  // ── 派發對象 ─────────────────────────────────
  // 'class' = 整班派發（diagnosis 唯一情境；studentIds 必為空陣列）
  targetType: 'class';
  studentIds: string[];   // 保留欄位，diagnosis 一律為空陣列
  assignedAt: string;     // 指派日期（YYYY-MM-DD）
  dueDate: string;        // 截止日期（YYYY-MM-DD）
  status: 'active' | 'completed'; // 狀態
  completionRate: number; // 完成率（0-100）
  submittedCount: number; // 已繳交人數
  totalStudents: number;  // 分母：全班人數
}
```

**注意**：
- 既有 `ASSIGNMENTS_DATA` 中所有資料 `type` 欄位為 `undefined`（視為 `'diagnosis'`，向下相容）
- Assignment 僅剩 `type: 'diagnosis'` 一種，scenario / treatment 模組已從實驗系統移除
- 診斷派題透過 `addAssignment({ type: 'diagnosis', quizId, classId, targetType: 'class', studentIds: [], ... })` 新增

**預設資料**:
| ID | 題組 | 班級 | targetType | 對象/完成率 |
|----|------|------|-----------|------------|
| `assign-001` | quiz-001 | class-A | class | 全班 100% (20/20) |
| `assign-002` | quiz-001 | class-B | class | 全班 72% (13/18) |
| `assign-003` | quiz-001 | class-C | class | 全班 45% (10/22) |
| `assign-004` | quiz-002 | class-A | class | 全班 85% (17/20) |

### 2.5 KnowledgeNode（知識節點）
**來源**: `src/data/knowledgeGraph.js`（**W5b 後**：陣列本身為**動態載入**，由 `src/main.jsx` 在 React render 之前 `await loadKnowledgeGraph()` 從 `GET /api/knowledge-nodes` 拉取並原地填入。所有既有 30+ consumer 維持同步 import，零修改。改 admin 端後須**手動 reload** 教師端頁面才會看到變化。）

```typescript
interface KnowledgeNode {
  id: string;                    // 節點 ID（如 'INe-Ⅱ-3-02'）
  name: string;                  // 節點名稱（如 '溶解現象'）
  description: string;           // 簡述
  level: 1 | 2 | 3 | 4;        // 難度層級
  prerequisites: string[];       // 先備知識節點 ID 列表
  misconceptions: Misconception[]; // 該節點下的迷思概念
  teachingStrategy?: string;     // 教學策略建議（部分節點有）
  studentHint?: string;          // 學生提示（部分節點有）
}

interface Misconception {
  id: string;                    // 迷思概念 ID（如 'M02-1'）
  label: string;                 // 簡短標籤
  detail: string;                // 教師端詳細說明
  studentDetail?: string;        // 學生端說明（部分有）
  confirmQuestion?: string;      // 確認問題（部分有）
}
```

**知識節點一覽**:

子主題 A — 水溶液中的變化（溶解）
| ID | 名稱 | Level | 先備知識 | 迷思概念數 |
|----|------|-------|----------|-----------|
| INe-Ⅱ-3-01 | 生活中溶解的現象 | 1 | 無 | 4 |
| INe-Ⅱ-3-02 | 溶解現象（看不見與沉澱） | 1 | INe-Ⅱ-3-01 | 4 |
| INe-Ⅱ-3-03 | 攪拌與溶解 | 2 | INe-Ⅱ-3-02 | 4 |
| INe-Ⅱ-3-04 | 不同物質的溶解程度不同 | 3 | INe-Ⅱ-3-05 | 4 |
| INe-Ⅱ-3-05 | 溶解量上限與沉澱 | 3 | INe-Ⅱ-3-03 | 4 |

子主題 B — 酸鹼反應
| ID | 名稱 | Level | 先備知識 | 迷思概念數 |
|----|------|-------|----------|-----------|
| INe-Ⅲ-5-1 | 水溶液包含溶質和溶劑 | 1 | 無 | 4 |
| INe-Ⅲ-5-2 | 辨別生活中的水溶液 | 2 | INe-Ⅲ-5-1 | 4 |
| INe-Ⅲ-5-3 | 石蕊試紙的正確使用方法 | 2 | INe-Ⅲ-5-2 | 4 |
| INe-Ⅲ-5-4 | 用石蕊試紙檢驗水溶液的酸鹼性 | 3 | INe-Ⅲ-5-3 | 4 |
| INe-Ⅲ-5-5 | 自製酸鹼指示劑（紫色高麗菜） | 3 | INe-Ⅲ-5-4 | 4 |
| INe-Ⅲ-5-6 | 自製酸鹼指示劑（蝶豆花） | 3 | INe-Ⅲ-5-4 | 4 |
| INe-Ⅲ-5-7 | 酸鹼解決生活問題 | 4 | INe-Ⅲ-5-5, INe-Ⅲ-5-6 | 4 |

**ID 前綴注意事項**:
- 子主題 A 使用 `INe-Ⅱ-3-*`（Ⅱ 為 Unicode 羅馬數字二 `Ⅱ` U+2161，**不是** ASCII 兩個 I）
- 子主題 B 使用 `INe-Ⅲ-5-*`（Ⅲ 為 Unicode 羅馬數字三 `Ⅲ` U+2162，**不是** ASCII 三個 I）
- 全庫年段一律用 Unicode 羅馬數字，2026-06-03 起已不再並存英文 II/III 寫法（詳見 `docs/deviations.md`）

#### 2.5.1 CustomMisconception（教師自訂迷思 — per-teacher 私有）

教師可在系統預設 48 條迷思之外，依個人教學經驗為任一節點新增自訂迷思。**每位教師只看得到自己建立的，不跨帳號共享**（後端以 `teacher_id` 過濾，spec-13 §9）。

```typescript
interface CustomMisconception {
  id: string;              // 'cm-{ts}-{teacherIdPrefix}'
  nodeId: string;          // 對應的 12 個合法知識節點 ID 之一
  label: string;           // 短標題（≤ 30 字）
  detail: string;          // 教師參考的詳細描述
  studentDetail: string;   // 學生視角描述
  confirmQuestion: string; // AI 用來向學生確認此迷思的提問
  createdAt: string;       // ISO date
}
```

**前端整合**：
- Hook：`useCustomMisconceptions()` / `useCreateCustomMisconception()` / `useDeleteCustomMisconception()`（`src/hooks/useCustomMisconceptions.js`）
- Helper：`mergeCustomsIntoNode(node, customs)`（`src/data/knowledgeGraph.js`）— 把該老師的自訂迷思合併進指定節點，每條帶 `isCustom: true` 旗標
- UI：`KnowledgeMap` 表格內顯示「自訂」徽章 + 刪除按鈕；右上角與每個節點 row 各有「+ 自訂迷思」入口

**API**（spec-10 §6）：`/api/misconceptions/custom`（GET / POST / DELETE，皆 `require_teacher`）

**範圍限制**（v1）：
- 學生端題組**目前不**自動帶入自訂迷思的 `confirmQuestion`（後端 `student_answers.diagnosis` 仍存原始 ID 字串）；之後可逐步把 `EditQuestionModal` / `CoveragePanel` 也改為合併後再渲染

### 2.6 StudentAnswer（學生作答記錄）
```typescript
interface StudentAnswer {
  questionId: number;     // 題號（即 order_index，1-based）
  selectedTag: string;    // 選擇的選項標籤（答案層：A/B/C；single 模式：A/B/C/D）
  reasonTag: string | null; // 理由層標籤（two-tier：甲/乙/丙；single 模式為 null）
  diagnosis: string;      // 診斷結果（'CORRECT' 或迷思概念 ID；two-tier 取自理由層）
  quadrant: 'TT' | 'TF' | 'FT' | 'FF' | null;
  // quadrant 說明：
  //   two-tier 題：TT / TF / FT / FF 四象限之一
  //   single 題：以答案對錯映射為 'TT'（答對）或 'FF'（答錯）；不會出現 TF / FT
  //   null：僅舊版資料（migration 0032 之前寫入，尚未補值）
}
```

**診斷碼來源說明**：
- `single` 模式：`diagnosis` 取自答案選項的 `diagnosis` 欄位（與舊版相同）
- `two-tier` 模式：`diagnosis` 取自**理由層**選項的 `diagnosis`，答案層僅貢獻 `quadrant` 計算，不決定迷思碼

### 2.7 HistoryRecord（學生歷史記錄）
```typescript
interface HistoryRecord {
  // 結構由 addToHistory() 呼叫者決定，目前 StudentQuiz 寫入內容如下：
  quizId: string;
  quizTitle: string;
  completedAt: string;             // 'YYYY/M/D HH:mm:ss'（zh-TW 格式）
  correctCount: number;            // 第二層診斷後的最終正確題數
  misconceptions: string[];        // 最終確認的迷思 ID 清單（去重）
  answers: StudentAnswer[];        // 各題作答（diagnosis 已依 statusChange 修正）
  followUpResults: FollowUpResult[]; // 第二層追問完整記錄
}
```

### 2.7.1 FollowUpResult（第二層 AI 追問結果）

每題追問完成後產出一筆 `FollowUpResult`，存於 `HistoryRecord.followUpResults`。

```typescript
interface FollowUpResult {
  questionId: number;            // 對應題號
  followUpRounds: number;        // 實際追問輪數（1-3）
  conversationLog: ConversationMessage[]; // AI/學生交替的完整對話
  diagnosis: FollowUpDiagnosis;
}

interface ConversationMessage {
  role: 'ai' | 'student';
  content: string;
}

interface FollowUpDiagnosis {
  finalStatus: 'CORRECT' | 'MISCONCEPTION' | 'UNCERTAIN';
  misconceptionCode: string | null;        // 確認的迷思 ID（如 'M02-1'）
  misconceptionSource: string | null;      // 學生在 R3 source 策略中陳述的來源
  reasoningQuality: 'SOLID' | 'PARTIAL' | 'WEAK' | 'GUESSING';
  // ↑ 'GUESSING'（AI 資訊不足硬給判斷）驅動學生報告 MisconceptionCard 低信心
  //   委婉呈現（粉框標題改「你這題可能有的想法」、label 前加「可能是」；
  //   純文案，不改判定資料）。詳見 spec-09 §12.4c。
  errorType: 'EXPLANATION' | 'DEFINITION' | 'OBSERVATION' | null;
  // ↑ 學生答錯的主導方向（spec-09 §12.4 / §12.4b）。第 1 輪 belief 先用此三類分類
  //   決定追問路徑（解釋型深追、定義/觀察型先引導再判斷），收尾時輸出同一型態。
  //   無法判讀回 null（教師可在報告手動覆寫）。常數 / labels / themes 定義
  //   於 src/data/errorTypes.js。學生報告依此型差異化回饋（ERROR_TYPE_FEEDBACK）
  //   與點擊徽章白話解釋（ERROR_TYPE_STUDENT_EXPLAIN）；詳見 spec-09 §12.4c、spec-03 §10。
  aiSummary: string;                       // AI 對該題的摘要說明
  statusChange: {
    from: string;                          // 第一層判定（'CORRECT' 或迷思 ID）
    to: string | null;                     // 第二層判定
    changeType: 'CONFIRMED' | 'UPGRADED' | 'DOWNGRADED' | 'DISCOVERED';
  };
}
```

**狀態變更說明**：

| changeType | 觸發情境 | 對 answers 的影響 |
|-----------|---------|------------------|
| CONFIRMED | 第一層與第二層判定一致 | 不變 |
| UPGRADED | 第一層判迷思但追問顯示正確理解 | 該題 diagnosis 改為 'CORRECT'（呼叫 removeMisconception） |
| DOWNGRADED | 第一層答對但追問顯示猜測／迷思 | 該題 diagnosis 改為 misconceptionCode |
| DISCOVERED | 追問中浮現第一層未偵測的新迷思 | 暫未實作（保留欄位） |

> **註**：原 §2.8 ScenarioQuestion、§2.9 ScenarioQuiz、§2.10 TreatmentMessage / TreatmentSession 對應的「概念釐清・補救」模組已從實驗系統移除，相關資料模型不再使用。詳見 `docs/deviations.md` 與 `spec-08`（已 DEPRECATED）。

---

## 3. 資料存取函式

### 3.1 題組與作答相關（檔案: `src/data/quizData.js`）

| 函式 | 參數 | 回傳值 | 說明 |
|------|------|--------|------|
| `getQuizQuestions(quizId)` | `string` | `Question[]` | 取得指定題組的所有題目 |
| `getClassAnswers(quizId, classId)` | `string, string` | `ClassAnswer[]` | 取得班級全部學生的作答資料 |
| `getQuestionStats(questionIndex, quizId?, classId?)` | `number, string, string` | `{A:n, B:n, C:n, D:n}` | 取得某題各選項的選答人數 |
| `getMisconceptionStudents(quizId?, classId?)` | `string, string` | `{[misconceptionId]: string[]}` | 取得各迷思概念對應的學生名單 |
| `getNodePassRates(quizId?, classId?)` | `string, string` | `{[nodeId]: number}` | 取得各知識節點的通過率 (%) |

### 3.2 知識節點相關（檔案: `src/data/knowledgeGraph.js`）

| 函式 | 參數 | 回傳值 | 說明 |
|------|------|--------|------|
| `getNodeById(id)` | `string` | `KnowledgeNode \| undefined` | 依 ID 取得知識節點 |
| `getMisconceptionById(mid)` | `string` | `Misconception & {nodeId, nodeName} \| null` | 依 ID 取得迷思概念及所屬節點 |

### ClassAnswer 結構
```typescript
interface ClassAnswer {
  studentId: number;        // 學生 ID
  studentName: string;      // 學生姓名
  answers: {
    questionId: number;     // 題號
    selectedTag: string;    // 選擇的選項
  }[];
}
```

---

## 4. Mock 資料機制

### 4.1 作答分佈 (ANSWER_DISTRIBUTIONS_MAP)
- 以 `{quizId}__{classId}` 為 key
- 值為二維陣列：`[題目][學生]`，每格為選項標籤 (A/B/C/D)
- 學生順序對應 `CLASS_STUDENTS[classId]` 陣列
- 目前有 4 組分佈：quiz-001×class-A/B/C, quiz-002×class-A

### 4.2 班級學生名冊 (CLASS_STUDENTS)
- quizData.js 內部獨立維護一份學生姓名列表
- 與 classData.js 的 CLASSES_DATA 中的 students 陣列名稱對應
- 用於 `getClassAnswers()` 中產生模擬作答資料

---

## 5. 教師端衍生資料

### 5.1 班級分類（`ClassCategory`）
**ORM**: `backend/app/db/models/class_category.py` → `class_categories` table（spec-11）
**Hooks**: `src/hooks/useClassCategories.js`
**API**: `/api/class-categories`（list / create / rename / delete / reorder）+ `PATCH /api/classes/{id}` 帶 `categoryId`

```typescript
interface ClassCategory {
  id: string;          // 後端產生：`cat_{16hex}`
  name: string;        // 教師自訂；同教師下 UNIQUE
  sortOrder: number;   // 教師自訂排序
  createdAt: string;
  updatedAt: string;
}

// Class（spec-04 §2.x）新增欄位：
//   categoryId: string | null  // null = 未分類
```

**操作**（hook 對應 API）:
- `useClassCategories()` → GET `/api/class-categories`
- `useCreateClassCategory()` → POST，body `{ name }`，重名回 409 `DUPLICATE_NAME`
- `useRenameClassCategory()` → PATCH `/api/class-categories/{id}`
- `useDeleteClassCategory()` → DELETE `/api/class-categories/{id}`；該分類下的 class 透過 FK `ON DELETE SET NULL` 自動變為未分類
- `useReorderClassCategories()` → PUT `/api/class-categories/reorder`，body `{ ids: [...] }`
- 移動班級：呼叫 `useUpdateClass()` 傳 `{ categoryId }`；傳 `null` 移出分類

**舊版 localStorage 自動遷移**：2026-05-29 之前曾使用過 `teacher_class_categories_v1:{teacherId}` 暫存版的教師，登入後 `ClassManagement` 會自動把舊資料 POST 到後端後清掉 key（詳見 `docs/deviations.md`）。
