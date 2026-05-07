# SPEC-04: Data Models / 資料模型規格

## 0. 全域狀態總覽

| 來源 | 檔案 | 用途 | 起始版本 |
|------|------|------|---------|
| `AuthContext` | `src/context/AuthContext.jsx` | 當前登入者（role / name / id 等）+ login/logout | P1 |
| `AppContext` | `src/context/AppContext.jsx` | UI 狀態（出題精靈、目前選中的 quiz/class）+ 治療 sessions（P4 前用 in-memory） | 既有；**P3 大幅瘦身** |
| **React Query hooks** | `src/hooks/*.js` | classes / quizzes / scenarios / assignments / N1+N2 摘要的 fetch + cache + mutation | **P3 新增** |

> **P1 重要變更**：原先 `AppContext.role / setRole` 已移除。任何元件需要當前角色，請改用 `useAuth().role`。
>
> **P3 重要變更**：原先 AppContext 直接持有的 `classes / quizzes / scenarioQuizzes / assignments` 與所有對應的 setters / save / add / update / remove 函式**全部移除**。改由 React Query hooks 提供：
> - `useClasses()` / `useClass(classId)` / `useCreateClass()` / `useUpdateClass()` / `useUpdateClassStudents()`
> - `useQuizzes()` / `useQuiz(quizId)` / `useSaveQuiz()` / `useDeleteQuiz()`
> - `useScenarios()` / `useScenario(id)` / `useSaveScenario()` / `useDeleteScenario()`
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
| `selectedNodeIds` | `string[]` | `['INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7']` | 出題精靈中選定的知識節點 |
| `editingQuizId` | `string \| null` | `null` | 出題精靈當前正在編輯的 quiz id：`null` = 新建 / 複製模式（儲存走 POST）；有值 = 編輯既有 quiz（儲存走 PUT，含自動暫存覆蓋同一份）。由 QuizLibrary 的「編輯／繼續編輯」設置；「複製為新考卷」與 TeacherDashboard 的「新增考卷／推薦題組」皆會清空此值 |
| `editingQuizStatus` | `'draft' \| 'published' \| null` | `null` | 編輯時帶入的原始 status，用於 Step2Edit 判定是否啟用自動暫存（`published` 卷自動暫存停用，避免被降級為 draft） |
| ~~`classes`~~ | — | — | **P3 移除**：改用 `useClasses()` |
| `currentClassId` | `string \| null` | `null` | 當前篩選的班級 ID（純 UI 狀態，配合 dashboard URL query 同步） |
| ~~`currentClass`~~ | — | — | **P3 移除**：用 `useClass(currentClassId).data` |
| ~~`quizzes`~~ | — | — | **P3 移除**：改用 `useQuizzes()` |
| `currentQuizId` | `string \| null` | `null` | 當前選中的考卷 ID（純 UI 狀態） |
| ~~`assignments`~~ | — | — | **P3 移除**：改用 `useAssignments()` |
| ~~`scenarioQuizzes`~~ | — | — | **P3 移除**：改用 `useScenarios()` |
| ~~`treatmentSessions`~~ | — | — | **P4 移除**：改用 `useTreatmentSession() / useStartTreatmentSession() / useAppendTreatmentMessage()` 等 |
| ~~`studentAnswers`~~ | — | — | **P4 移除**：作答即時 POST 至 `/api/answers`，dashboard 從 DB 拉 |
| `studentName` | `string` | `'學生'` | 已被 `useAuth().currentUser.name` 取代，但保留相容 |
| ~~`studentHistory`~~ | — | — | **P4 移除**：改用 `useStudentHistory(studentId)` 從 DB 拉 |
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
| `setCurrentClassId(id)` | `string \| null` | 切換篩選班級 |
| `setCurrentQuizId(id)` | `string \| null` | 切換當前考卷 |
| `startTreatmentSession` / `appendTreatmentMessage` / `updateTreatmentQuestionState` / `advanceTreatmentQuestion` / `completeTreatmentSession` / `getTreatmentSession` | — | 治療 session 管理（P4 才搬 DB） |
| `recordAnswer` / `removeMisconception` / `resetStudentAnswers` / `addToHistory` / `setActiveStudentReport` | — | 學生作答相關（P4 才搬 DB） |

**P3 移除的 AppContext 函式（請改用 hooks）**：
- `updateClassStudents` → `useUpdateClassStudents().mutate({ classId, students })`
- `saveQuiz` → `useSaveQuiz().mutate(quiz)`
- `addAssignment` / `updateAssignment` / `removeAssignment` → `useAddAssignment / useUpdateAssignment / useRemoveAssignment`
- `saveScenarioQuiz` → `useSaveScenario().mutate(scenario)`

### 1.4 React Query Hooks（P3 新增）

**檔案位置**：`src/hooks/`

統一使用 `@tanstack/react-query` v5。`QueryClientProvider` 在 `src/main.jsx` 包覆 `<App />` 之外。

```jsx
// src/hooks/useClasses.js
export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes'),
  });
}
```

| Hook | 對應 API | Cache key | 備註 |
|------|---------|-----------|------|
| `useClasses()` | `GET /api/classes` | `['classes']` | **教師專屬**。回傳 `ClassBrief[]`：`{ id, name, grade, subject, color, textColor, studentCount }` — **不包含** `students` 陣列 |
| `useClass(classId)` | `GET /api/classes/{id}` | `['classes', classId]` | **教師專屬**。`ClassDetail` = `ClassBrief` + `students: StudentBrief[]` |
| `useCreateClass()` | `POST /api/classes` | invalidate `['classes']` | **教師**。Body：`{ name, grade, subject, color, textColor, note? }`；server 自動產生 id（`class-A..Z` 取下一個） |
| `useUpdateClass()` | `PATCH /api/classes/{id}` | invalidate `['classes']`、`['classes', id]` | **教師**。Body 為部分更新；可帶 `name/grade/subject/color/textColor/note`，傳 `note: null` 可清空備註 |
| `useUpdateClassStudents()` | `PUT /api/classes/{id}/students` | invalidate `['classes']` | mutation |
| `useStudent(studentId)` | `GET /api/students/{id}` | `['students', id]` | **教師**：含明文密碼 |
| `useResetStudentPassword()` | `POST /api/students/{id}/reset-password` | invalidate `['students', id]` | mutation |
| `useQuizzes()` | `GET /api/quizzes` | `['quizzes']` | 教師看全部；學生只回自己班級已被派發的 |
| `useQuiz(quizId)` | `GET /api/quizzes/{id}` | `['quizzes', id]` | 含 questions + options；學生需該 quiz 已派至自己班級 |
| `useSaveQuiz()` | `POST` 或 `PUT /api/quizzes[/{id}]` | invalidate `['quizzes']` | upsert（教師） |
| `useDeleteQuiz()` | `DELETE /api/quizzes/{id}` | invalidate `['quizzes']` | （教師） |
| `useScenarios()` | `GET /api/scenarios` | `['scenarios']` | 教師看全部；學生只回自己班級已被派發的 |
| `useScenario(id)` | `GET /api/scenarios/{id}` | `['scenarios', id]` | 學生需該 scenario 已派至自己班級 |
| `useSaveScenario()` | `POST` 或 `PUT /api/scenarios[/{id}]` | invalidate `['scenarios']` | upsert（教師） |
| `useDeleteScenario()` | `DELETE /api/scenarios/{id}` | invalidate `['scenarios']` | （教師） |
| `useAssignments(filters?)` | `GET /api/assignments?...` | `['assignments', filters]` | filters: `{ type, classId, quizId, scenarioQuizId }`；學生隱式只看自己班，且 `targetType='students'` 時需 `student.id ∈ studentIds` 才看得到；回傳含 `targetType / studentIds / completionRate / submittedCount / totalStudents`（scenario 分母 = 指派學生數）；**對學生身份額外回傳 `myDiagnosisCompleted` / `myScenarioCompleted`**，學生首頁據此判斷任務是否完成（跨刷新仍正確） |
| `useAddAssignment()` | `POST /api/assignments` | invalidate `['assignments']` | |
| `useUpdateAssignment()` | `PATCH /api/assignments/{id}` | invalidate `['assignments']` | |
| `useRemoveAssignment()` | `DELETE /api/assignments/{id}` | invalidate `['assignments']` | |
| `useGradeSummary()` | `POST /api/ai/grade-summary` | mutation only | N1，每次點擊重新呼叫；P4 後端從 DB 算統計 |
| `useClassSummary()` | `POST /api/ai/class-summary` | mutation only | N2；P4 後端從 DB 算統計 |
| **P4** ↓ | | | |
| `useClassAnswers(quizId, classId)` | `GET /api/quizzes/{id}/answers?classId=` | `['answers', quizId, classId]` | 教師端查班級作答 |
| `useClassFollowups(quizId, classId)` | `GET /api/quizzes/{id}/followups?classId=` | `['followups', quizId, classId]` | 教師端查該班完整 N3 追問對話（含 `conversationLog / aiSummary / finalStatus / misconceptionCode / reasoningQuality / statusChange`）；用於 SingleClassReport 底部的對話檢視 |
| `useQuizStats(quizId, classId?)` | `GET /api/quizzes/{id}/stats?classId=` | `['quiz-stats', quizId, classId]` | 取代 mock `getNodePassRates / getMisconceptionStudents` |
| `useStudentHistory(studentId)` | `GET /api/students/{id}/history` | `['student-history', studentId]` | 學生個人作答歷史 |
| `useRecordAnswer()` | `POST /api/answers` | invalidate stats / answers / history | 一次接受陣列 |
| `useRecordFollowups()` | `POST /api/answers/{id}/followup` 一次多筆 | invalidate stats / answers / history | |
| `useStartTreatmentSession()` | `POST /api/treatment/sessions/start` | mutation | 回傳 sessionId（已存在則拿既有） |
| `useTreatmentSession(sessionId)` | `GET /api/treatment/sessions/{id}` | `['treatment-sessions', id]` | 完整 session + messages |
| `useTreatmentSessionByKey(scenarioQuizId, studentId)` | `GET /api/treatment/sessions/by-key/...` | `['treatment-sessions', scenarioQuizId, studentId]` | 學生端 ScenarioChat 用 |
| `useAppendTreatmentMessage()` | `POST /api/treatment/sessions/{id}/messages` | invalidate session | optimistic-friendly |
| `useAdvanceTreatmentQuestion()` | `PATCH /api/treatment/sessions/{id}/advance` | invalidate session | |
| `useCompleteTreatmentSession()` | `POST /api/treatment/sessions/{id}/complete` | invalidate session + treatment-logs | |
| `useTreatmentLogs(filters)` | `GET /api/teachers/treatment-logs?...` | `['treatment-logs', filters]` | 教師端列表 |
| `useTreatmentLog(sessionId)` | `GET /api/teachers/treatment-logs/{id}` | `['treatment-logs', sessionId]` | 教師端詳情 |

---

## 2. 資料型別定義

### 2.1 Question（題目）
**來源**: `src/data/quizData.js`

```typescript
interface Question {
  id: number;                    // 題號（1-based）
  stem: string;                  // 題幹文字
  knowledgeNodeId: string;       // 對應知識節點 ID（如 'INe-II-3-02'）
  options: Option[];             // 選項陣列（固定 4 個：A/B/C/D）
}

interface Option {
  tag: 'A' | 'B' | 'C' | 'D';  // 選項標籤
  content: string;               // 選項內容文字
  diagnosis: string;             // 'CORRECT' 或迷思概念 ID（如 'M02-1'）
}
```

### 2.2 Quiz（考卷）
**來源**: `src/data/quizData.js` (`QUIZZES_DATA`)

```typescript
interface Quiz {
  id: string;                    // 考卷 ID（如 'quiz-001'）
  title: string;                 // 考卷標題
  status: 'draft' | 'published'; // 狀態
  questionCount: number;         // 題目數量
  knowledgeNodeIds: string[];    // 涵蓋的知識節點 ID 列表
  questions: Question[];         // 題目陣列
  createdAt: string;             // 建立日期（YYYY-MM-DD）
}
```

**預設資料**:
| ID | 標題 | 題數 | 狀態 | 涵蓋節點 |
|----|------|------|------|----------|
| `quiz-001` | 水溶液 · 迷思診斷（第一次） | 5 | published | INe-II-3-02, INe-II-3-03, INe-II-3-05, INe-Ⅲ-5-4, INe-Ⅲ-5-7 |
| `quiz-002` | 水溶液 · 迷思診斷（第二次） | 5 | published | INe-II-3-02, INe-II-3-03, INe-II-3-05, INe-Ⅲ-5-4, INe-Ⅲ-5-7 |

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
  students: Student[];    // 學生名冊
}

interface Student {
  id: number;             // 學生 ID（1-based）
  name: string;           // 學生姓名
  seat: number;           // 座號
}
```

**預設資料**:
| ID | 名稱 | 學生數 | 代表色 |
|----|------|--------|--------|
| `class-A` | 五年甲班 | 20 | #C8EAAE (淺綠) |
| `class-B` | 五年乙班 | 18 | #BADDF4 (淺藍) |
| `class-C` | 五年丙班 | 22 | #FCF0C2 (淺黃) |

### 2.4 Assignment（派題記錄）
**來源**: `src/data/assignmentData.js`

```typescript
interface Assignment {
  id: string;             // 派題 ID（如 'assign-001'，新增時自動生成 'assign-{timestamp}'）
  type?: 'diagnosis' | 'scenario'; // 派題類型，缺省為 'diagnosis'（spec-08）
  quizId?: string;        // 診斷考卷 ID（type='diagnosis' 時必填）
  scenarioQuizId?: string;// 情境考卷 ID（type='scenario' 時必填）
  classId: string;        // 班級 ID
  // ── 派發對象（spec-05 §3.4）─────────────────────────────────
  // 'class'    = 整班派發（diagnosis 預設；studentIds 必為空陣列）
  // 'students' = 個別學生派發（scenario 預設；studentIds 至少 1 位）
  targetType: 'class' | 'students';
  studentIds: string[];   // 指派的學生 user_id 列表（targetType='students' 時必填）
  assignedAt: string;     // 指派日期（YYYY-MM-DD）
  dueDate: string;        // 截止日期（YYYY-MM-DD）
  status: 'active' | 'completed'; // 狀態
  completionRate: number; // 完成率（0-100）
  submittedCount: number; // 已繳交人數（已作答 / 已完成的指派學生數）
  totalStudents: number;  // 分母：targetType='class' = 全班人數；'students' = studentIds.length
}
```

**注意**：
- 既有 `ASSIGNMENTS_DATA` 中所有資料 `type` 欄位為 `undefined`（視為 `'diagnosis'`，向下相容）
- 診斷派題透過 `addAssignment({ type: 'diagnosis', quizId, classId, targetType: 'class', studentIds: [], ... })` 新增
- 情境派題以**個別學生**為單位：`addAssignment({ type: 'scenario', scenarioQuizId, classId, targetType: 'students', studentIds: [...], ... })`
- 學生端 `useAssignments` 過濾規則：班級命中 + （`targetType='class'` 或 `student.id ∈ studentIds`）

**預設資料**:
| ID | 考卷 | 班級 | targetType | 對象/完成率 |
|----|------|------|-----------|------------|
| `assign-001` | quiz-001 | class-A | class | 全班 100% (20/20) |
| `assign-002` | quiz-001 | class-B | class | 全班 72% (13/18) |
| `assign-003` | quiz-001 | class-C | class | 全班 45% (10/22) |
| `assign-004` | quiz-002 | class-A | class | 全班 85% (17/20) |
| `assign-006` | scenario-002 | class-A | students | 2 位 0% |

### 2.5 KnowledgeNode（知識節點）
**來源**: `src/data/knowledgeGraph.js`

```typescript
interface KnowledgeNode {
  id: string;                    // 節點 ID（如 'INe-II-3-02'）
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
| INe-II-3-01 | 生活中溶解的現象 | 1 | 無 | 4 |
| INe-II-3-02 | 溶解現象（看不見與沉澱） | 1 | INe-II-3-01 | 4 |
| INe-II-3-03 | 攪拌與溶解 | 2 | INe-II-3-02 | 4 |
| INe-II-3-04 | 不同物質的溶解程度不同 | 3 | INe-II-3-05 | 4 |
| INe-II-3-05 | 溶解量上限與沉澱 | 3 | INe-II-3-03 | 4 |

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
- 子主題 A 使用 `INe-II-3-*`（II 為阿拉伯化羅馬數字「2」）
- 子主題 B 使用 `INe-Ⅲ-5-*`（Ⅲ 為 Unicode 羅馬數字三 `Ⅲ`，**不是** ASCII 三個 I）
- 兩個前綴並存，比對 ID 時需注意字元差異

### 2.6 StudentAnswer（學生作答記錄）
```typescript
interface StudentAnswer {
  questionId: number;     // 題號
  selectedTag: string;    // 選擇的選項標籤（A/B/C/D）
  diagnosis: string;      // 診斷結果（'CORRECT' 或迷思概念 ID）
}
```

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

### 2.8 ScenarioQuestion（情境題，治療模組）
**來源**: `src/data/scenarioQuizData.js`

```typescript
interface ScenarioQuestion {
  index: number;                    // 題目順序（1-based）
  title: string;                    // 標題（如 '論證議題 1'）
  scenarioText: string;             // 情境敘述（多行，\n 為段落分隔）
  scenarioImages?: string[];        // 情境圖片 import 路徑（0~2 張）
  scenarioImageZoomable?: boolean;  // 是否可點擊放大
  initialMessage: string;           // AI 開場提問（對應 stage=claim, step=1）
  targetMisconceptions: string[];   // 本題針對的迷思 ID（如 ['M02-1']）
  expertModel: string;              // 專家示範範文（apprenticeship modeling 用）
}
```

### 2.9 ScenarioQuiz（情境考卷，治療模組）
**來源**: `src/data/scenarioQuizData.js` (`SCENARIO_QUIZZES_DATA`)

```typescript
interface ScenarioQuiz {
  id: string;                       // 'scenario-001' 格式
  title: string;                    // 考卷標題
  status: 'draft' | 'published';
  targetNodeId: string;             // 主目標節點 ID
  targetMisconceptions: string[];   // 全部目標迷思 ID 集合
  createdAt: string;                // YYYY-MM-DD
  questions: ScenarioQuestion[];
}
```

**預設資料**：1 份 demo 情境考卷（spec-08 §10）

| ID | 標題 | 目標節點 | 題數 |
|----|------|---------|------|
| `scenario-002` | 情境治療 · 飽和糖水甜度 | INe-II-3-03 | 2 |

### 2.10 TreatmentMessage / TreatmentSession（治療對話狀態）
**來源**: AppContext 內部 state（不存於資料檔）

```typescript
interface TreatmentMessage {
  id: string;
  role: 'ai' | 'student';
  text: string;
  // 若 role='ai'，可附加該回合的 bot response 標註：
  phase?: 'diagnosis' | 'apprenticeship' | 'completed';
  step?: number;
  stage?: 'claim' | 'evidence' | 'reasoning' | 'revise' | 'complete';
  hintLevel?: 0 | 1 | 2 | 3;
  feedback?: string;
  requiresRestatement?: boolean;
  createdAt: string;                // ISO timestamp
}

interface TreatmentQuestionState {
  messages: TreatmentMessage[];
  phase: 'diagnosis' | 'apprenticeship' | 'completed';
  step: number;                     // 0~7（0 表示尚未開始）
  stage: 'claim' | 'evidence' | 'reasoning' | 'revise' | 'complete';
  hintLevel: 0 | 1 | 2 | 3;
  requiresRestatement: boolean;
}

interface TreatmentSession {
  id: string;                       // 'session-{timestamp}'
  scenarioQuizId: string;
  studentId: number;
  currentQuestionIndex: number;     // 1-based
  perQuestion: { [index: number]: TreatmentQuestionState };
  status: 'active' | 'completed';
  startedAt: string;                // ISO timestamp
  completedAt: string | null;
}
```

**儲存方式**：AppContext 中以 `treatmentSessions: { [key]: TreatmentSession }` 字典存放，
key 為 ``${scenarioQuizId}__${studentId}``（同一學生對同一情境考卷 → 同一 session 累積）。

---

## 3. 資料存取函式

### 3.1 考卷與作答相關（檔案: `src/data/quizData.js`）

| 函式 | 參數 | 回傳值 | 說明 |
|------|------|--------|------|
| `getQuizQuestions(quizId)` | `string` | `Question[]` | 取得指定考卷的所有題目 |
| `getClassAnswers(quizId, classId)` | `string, string` | `ClassAnswer[]` | 取得班級全部學生的作答資料 |
| `getQuestionStats(questionIndex, quizId?, classId?)` | `number, string, string` | `{A:n, B:n, C:n, D:n}` | 取得某題各選項的選答人數 |
| `getMisconceptionStudents(quizId?, classId?)` | `string, string` | `{[misconceptionId]: string[]}` | 取得各迷思概念對應的學生名單 |
| `getNodePassRates(quizId?, classId?)` | `string, string` | `{[nodeId]: number}` | 取得各知識節點的通過率 (%) |

### 3.2 知識節點相關（檔案: `src/data/knowledgeGraph.js`）

| 函式 | 參數 | 回傳值 | 說明 |
|------|------|--------|------|
| `getNodeById(id)` | `string` | `KnowledgeNode \| undefined` | 依 ID 取得知識節點 |
| `getMisconceptionById(mid)` | `string` | `Misconception & {nodeId, nodeName} \| null` | 依 ID 取得迷思概念及所屬節點 |

### 3.3 情境考卷相關（檔案: `src/data/scenarioQuizData.js`，spec-08）

| 函式 | 參數 | 回傳值 | 說明 |
|------|------|--------|------|
| `getScenarioQuiz(scenarioQuizId)` | `string` | `ScenarioQuiz \| null` | 依 ID 取得情境考卷 |
| `getScenarioQuestions(scenarioQuizId)` | `string` | `ScenarioQuestion[]` | 取得情境考卷的題目陣列 |
| `getScenarioQuizzesByNode(nodeId)` | `string` | `ScenarioQuiz[]` | 依目標節點推薦情境考卷 |
| `getScenarioQuizzesByMisconception(misconceptionId)` | `string` | `ScenarioQuiz[]` | 依目標迷思推薦情境考卷 |

### 3.4 治療 Bot（檔案: `src/data/treatmentBot.js`，spec-08 §2）

| 函式 | 參數 | 回傳值 | 說明 |
|------|------|--------|------|
| `runTreatmentTurn(state, userMessage)` | `TreatmentState, string` | `BotResponse` | 推進一輪對話（mock，未來換真 LLM 切換點） |
| `makeInitialTurn(scenarioQuizId, questionIndex)` | `string, number` | 初始 state + 開場 message | 學生切到該題時呼叫 |

**常數**：`STEPS_PER_QUESTION = 7`、`PHASE_LABEL`、`STAGE_LABEL`

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
