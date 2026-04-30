# SPEC-04: Data Models / 資料模型規格

## 1. 全域狀態 (AppContext)

**檔案**: `src/context/AppContext.jsx`

使用 React Context API (`createContext` + `useContext`)，提供 `useApp()` Hook 存取全域狀態。

### 1.1 狀態欄位

| 欄位 | 型別 | 初始值 | 說明 |
|------|------|--------|------|
| `role` | `'teacher' \| 'student' \| null` | `null` | 當前使用者角色 |
| `quizQuestions` | `Question[]` | `[...defaultQuestions]` | 出題精靈中正在編輯的題目 |
| `selectedNodeIds` | `string[]` | `['INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7']` | 出題精靈中選定的知識節點 |
| `classes` | `Class[]` | `CLASSES_DATA` | 所有班級資料 |
| `currentClassId` | `string \| null` | `null` | 當前篩選的班級 ID（null = 全部） |
| `currentClass` | `Class \| null` | 衍生值 | 當前選中的班級物件 |
| `quizzes` | `Quiz[]` | `QUIZZES_DATA` | 所有考卷 |
| `currentQuizId` | `string \| null` | `null` | 當前選中的考卷 ID |
| `assignments` | `Assignment[]` | `ASSIGNMENTS_DATA` | 所有派題記錄（含 `type: 'diagnosis' \| 'scenario'`） |
| `scenarioQuizzes` | `ScenarioQuiz[]` | `SCENARIO_QUIZZES_DATA` | 所有情境考卷（治療模組，spec-08） |
| `treatmentSessions` | `Record<string, TreatmentSession>` | `{}` | 治療對話 sessions，key = ``${scenarioQuizId}__${studentId}`` |
| `studentAnswers` | `StudentAnswer[]` | `[]` | 當前學生的作答記錄 |
| `studentName` | `string` | `'學生'` | 學生名稱（固定值） |
| `studentHistory` | `HistoryRecord[]` | `[]` | 學生過去的作答歷史 |
| `activeStudentReport` | `HistoryRecord \| null` | `null` | 當前查看的學生報告 |

### 1.2 衍生值

| 欄位 | 型別 | 計算邏輯 |
|------|------|----------|
| `currentClass` | `Class \| null` | `classes.find(c => c.id === currentClassId) ?? null` |
| `studentMisconceptions` | `string[]` | `studentAnswers.filter(a => a.diagnosis !== 'CORRECT').map(a => a.diagnosis)` |
| `correctCount` | `number` | `studentAnswers.filter(a => a.diagnosis === 'CORRECT').length` |

### 1.3 操作函式

| 函式 | 參數 | 說明 |
|------|------|------|
| `setRole(role)` | `'teacher' \| 'student' \| null` | 設定使用者角色 |
| `setQuizQuestions(questions)` | `Question[]` | 更新精靈中的題目 |
| `setSelectedNodeIds(ids)` | `string[]` | 更新精靈中選定的節點 |
| `setCurrentClassId(id)` | `string \| null` | 切換篩選班級 |
| `setCurrentQuizId(id)` | `string \| null` | 切換當前考卷 |
| `updateClassStudents(classId, students)` | `string, Student[]` | 更新班級學生名單 |
| `saveQuiz(quiz)` | `Quiz` | 新增或更新考卷（以 `id` 判斷） |
| `addAssignment(assignment)` | `Assignment` (不含 id) | 新增派題記錄（自動生成 `assign-{timestamp}` ID，`type` 缺省為 `'diagnosis'`） |
| `updateAssignment(id, updates)` | `string, Partial<Assignment>` | 部分更新派題記錄 |
| `removeAssignment(id)` | `string` | 刪除派題記錄 |
| `saveScenarioQuiz(scenarioQuiz)` | `ScenarioQuiz` | 新增或更新情境考卷（以 `id` 判斷，spec-08） |
| `startTreatmentSession(scenarioQuizId, studentId)` | `string, number` | 啟動或取得既有治療 session（key 以 `${scenarioQuizId}__${studentId}` 形成） |
| `appendTreatmentMessage(scenarioQuizId, studentId, questionIndex, message)` | `string, number, number, TreatmentMessage` | 追加一則對話訊息至指定題目 |
| `updateTreatmentQuestionState(scenarioQuizId, studentId, questionIndex, patch)` | `string, number, number, Partial` | 更新某題的 phase/step/stage/hintLevel/requiresRestatement |
| `advanceTreatmentQuestion(scenarioQuizId, studentId, nextIndex)` | `string, number, number` | 切換到下一題 |
| `completeTreatmentSession(scenarioQuizId, studentId)` | `string, number` | 標記 session 完成 |
| `getTreatmentSession(scenarioQuizId, studentId)` | `string, number` | 讀取單一 session |
| `recordAnswer(questionId, selectedTag, diagnosis)` | `number, string, string` | 記錄/更新學生作答（同題覆蓋） |
| `removeMisconception(diagnosisId)` | `string` | 將指定迷思診斷改為 'CORRECT'（學生否認後） |
| `resetStudentAnswers()` | — | 清空學生作答記錄 |
| `addToHistory(record)` | `HistoryRecord` | 新增歷史記錄並設為 activeStudentReport |
| `setActiveStudentReport(record)` | `HistoryRecord \| null` | 設定當前查看的報告 |

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
  assignedAt: string;     // 指派日期（YYYY-MM-DD）
  dueDate: string;        // 截止日期（YYYY-MM-DD）
  status: 'active' | 'completed'; // 狀態
  completionRate: number; // 完成率（0-100）
  submittedCount: number; // 已繳交人數
  totalStudents: number;  // 班級總人數
}
```

**注意**：
- 既有 `ASSIGNMENTS_DATA` 中所有資料 `type` 欄位為 `undefined`（視為 `'diagnosis'`，向下相容）
- 治療派題透過 `addAssignment({ type: 'scenario', scenarioQuizId, classId, ... })` 新增

**預設資料**:
| ID | 考卷 | 班級 | 完成率 |
|----|------|------|--------|
| `assign-001` | quiz-001 | class-A | 100% (20/20) |
| `assign-002` | quiz-001 | class-B | 72% (13/18) |
| `assign-003` | quiz-001 | class-C | 45% (10/22) |
| `assign-004` | quiz-002 | class-A | 85% (17/20) |

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
  // 結構由 addToHistory() 呼叫者決定
  // 通常包含：
  quizId: string;
  quizTitle: string;
  date: string;
  correctCount: number;
  totalQuestions: number;
  misconceptions: string[];
}
```

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

**預設資料**：5 份 demo 情境考卷（spec-08 §10）

| ID | 標題 | 目標節點 | 題數 |
|----|------|---------|------|
| `scenario-001` | 情境治療 · 溶解現象判斷 | INe-II-3-02 | 2 |
| `scenario-002` | 情境治療 · 飽和糖水甜度 | INe-II-3-03 | 2 |
| `scenario-003` | 情境治療 · 重量守恆與圖表判讀 | INe-II-3-05 | 2 |
| `scenario-004` | 情境治療 · 酸鹼中和與生活應用 | INe-Ⅲ-5-4 | 3 |
| `scenario-005` | 情境治療 · 水在酸鹼反應的角色 | INe-Ⅲ-5-7 | 3 |

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
