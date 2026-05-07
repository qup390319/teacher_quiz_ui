# SPEC-11: Database Schema / 資料庫 Schema 規格

> 本文件定義 PostgreSQL 16 的完整 schema。所有表、欄位、約束、索引以本文件為單一真理來源。
> ORM 定義位於 `backend/app/db/models/`，與本文件保持一致。

---

## 1. 命名與通用約定

- 表名：snake_case 複數（`users`、`student_answers`）
- 欄位名：snake_case
- 主鍵 ID 命名規則：
  - **語意 ID**（前端需引用、URL 友善）：使用字串，例如 `class-A`、`quiz-001`、`scenario-001`、`assign-001`、`session-{ts}`、`INe-II-3-02`、`M02-1`
  - **代理 ID**（內部關聯，前端不暴露）：使用 `BIGSERIAL`
- 時間欄位：`TIMESTAMPTZ`，預設 `NOW()`
- JSON 欄位：用 `JSONB`（可索引、可查詢）
- 列舉值：用 `VARCHAR(N) + CHECK` 約束（不用 PostgreSQL ENUM type，避免 migration 麻煩）

---

## 2. 表清單

| # | 表名 | 用途 | 推進階段 |
|---|------|------|---------|
| 1 | `users` | 統一使用者帳號 | P1 |
| 2 | `teachers` | 教師專屬欄位 | P1 |
| 3 | `students` | 學生專屬欄位 | P1 |
| 4 | `classes` | 班級 | P1 |
| 5 | `quizzes` | 診斷考卷主檔 | P1（seed）/ P3（CRUD） |
| 6 | `quiz_questions` | 考卷題目 | P1 / P3 |
| 7 | `quiz_options` | 題目選項 | P1 / P3 |
| 8 | `scenario_quizzes` | 情境治療考卷 | P1 / P3 |
| 9 | `scenario_questions` | 情境題目 | P1 / P3 |
| 10 | `assignments` | 派發紀錄 | P1（seed）/ P3 |
| 10b | `assignment_students` | 個別學生派發關聯（情境派題用）| P5（個別學生派發） |
| 11 | `student_answers` | 學生作答 | P4 |
| 12 | `followup_results` | 追問結果 | P4 |
| 13 | `treatment_sessions` | 治療對話 session | P4 |
| 14 | `treatment_messages` | 治療對話訊息 | P4 |
| 15 | `ai_summary_cache` | RAGFlow 摘要快取 | P3 |

> 註：原本說 11 張表，實際拆細為 16 張（user / teacher / student 拆 3 張、ai cache 算 1 張、新增 assignment_students）。spec-10 §6 表格中的「11 張表」描述以本文件為準。

---

## 3. 表定義

### 3.1 `users`

```sql
CREATE TABLE users (
    id              VARCHAR(64)   PRIMARY KEY,           -- 使用 account 直接當 ID
    account         VARCHAR(64)   NOT NULL UNIQUE,
    password        VARCHAR(255)  NOT NULL,              -- 明文（依 P1 決策 Q2-C）
    role            VARCHAR(16)   NOT NULL,
    password_was_default BOOLEAN  NOT NULL DEFAULT TRUE, -- 是否還是預設密碼
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT users_role_chk CHECK (role IN ('teacher', 'student'))
);

CREATE INDEX users_role_idx ON users(role);
```

**邏輯**：`id = account`（兩者完全相同），方便除錯與引用。`password` 欄位以明文儲存。

### 3.2 `teachers`

```sql
CREATE TABLE teachers (
    user_id    VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 `classes`

```sql
CREATE TABLE classes (
    id          VARCHAR(32)   PRIMARY KEY,            -- 'class-A', 'class-B', 'class-C' (server-generated for new classes)
    name        VARCHAR(64)   NOT NULL,               -- '五年甲班'
    grade       VARCHAR(16)   NOT NULL,               -- '五年級'
    subject     VARCHAR(32)   NOT NULL,               -- '自然科學'
    color       VARCHAR(7)    NOT NULL,               -- '#C8EAAE'
    text_color  VARCHAR(7)    NOT NULL,               -- '#3D5A3E'
    teacher_id  VARCHAR(64)   REFERENCES users(id) ON DELETE SET NULL,  -- 0003 migration
    note        VARCHAR(200),                          -- 0004 migration: 教師備註，如「114 學年度」
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX classes_teacher_idx ON classes(teacher_id);
```

> **教師範圍隔離（0003 migration）**：`teacher_id` 是該班所屬教師。所有讀取
> 班級 / 學生 / 派題 / 治療紀錄 / N1 / N2 的 API 都會用 `Class.teacher_id ==
> current_teacher.id` 過濾，bbb001 等新教師看不到 aaa001 的示範資料；反之亦然。
> 共用的 `quizzes` / `scenario_quizzes` 不做隔離（系統範例題庫）。
> 0003 升級時會自動把所有既有班級回填為 `aaa001` 以保留既有 demo dashboard。

### 3.4 `students`

```sql
CREATE TABLE students (
    user_id      VARCHAR(64)  PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(64)  NOT NULL,
    seat         INTEGER      NOT NULL,
    class_id     VARCHAR(32)  NOT NULL REFERENCES classes(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT students_seat_pos CHECK (seat > 0)
);

CREATE UNIQUE INDEX students_class_seat_idx ON students(class_id, seat);
CREATE INDEX students_class_idx ON students(class_id);
```

**邏輯**：學生 `user_id` 即為帳號（如 `115001`），`name` 為姓名。座號在班內唯一。

### 3.5 `quizzes`

```sql
CREATE TABLE quizzes (
    id                  VARCHAR(32)   PRIMARY KEY,            -- 'quiz-001'
    title               VARCHAR(128)  NOT NULL,
    status              VARCHAR(16)   NOT NULL DEFAULT 'draft',
    knowledge_node_ids  TEXT[]        NOT NULL DEFAULT '{}',  -- ['INe-II-3-02', ...]
    created_by          VARCHAR(64)   REFERENCES users(id),   -- teacher user_id；nullable for seed
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT quizzes_status_chk CHECK (status IN ('draft', 'published'))
);

CREATE INDEX quizzes_status_idx ON quizzes(status);
CREATE INDEX quizzes_created_by_idx ON quizzes(created_by);
```

### 3.6 `quiz_questions`

```sql
CREATE TABLE quiz_questions (
    id                  BIGSERIAL    PRIMARY KEY,
    quiz_id             VARCHAR(32)  NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    order_index         INTEGER      NOT NULL,                  -- 1-based
    stem                TEXT         NOT NULL,
    knowledge_node_id   VARCHAR(32)  NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX quiz_questions_order_idx ON quiz_questions(quiz_id, order_index);
```

### 3.7 `quiz_options`

```sql
CREATE TABLE quiz_options (
    id           BIGSERIAL    PRIMARY KEY,
    question_id  BIGINT       NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    tag          CHAR(1)      NOT NULL,                  -- 'A' | 'B' | 'C' | 'D'
    content      TEXT         NOT NULL,
    diagnosis    VARCHAR(16)  NOT NULL,                  -- 'CORRECT' or 'M02-1' etc.
    CONSTRAINT quiz_options_tag_chk CHECK (tag IN ('A', 'B', 'C', 'D'))
);

CREATE UNIQUE INDEX quiz_options_question_tag_idx ON quiz_options(question_id, tag);
```

### 3.8 `scenario_quizzes`

```sql
CREATE TABLE scenario_quizzes (
    id                      VARCHAR(32)   PRIMARY KEY,           -- 'scenario-001'
    title                   VARCHAR(128)  NOT NULL,
    status                  VARCHAR(16)   NOT NULL DEFAULT 'draft',
    target_node_id          VARCHAR(32)   NOT NULL,
    target_misconceptions   TEXT[]        NOT NULL DEFAULT '{}',
    created_by              VARCHAR(64)   REFERENCES users(id),
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT scenario_quizzes_status_chk CHECK (status IN ('draft', 'published'))
);

CREATE INDEX scenario_quizzes_target_node_idx ON scenario_quizzes(target_node_id);
```

### 3.9 `scenario_questions`

```sql
CREATE TABLE scenario_questions (
    id                          BIGSERIAL    PRIMARY KEY,
    scenario_quiz_id            VARCHAR(32)  NOT NULL REFERENCES scenario_quizzes(id) ON DELETE CASCADE,
    order_index                 INTEGER      NOT NULL,
    title                       VARCHAR(128) NOT NULL,
    scenario_text               TEXT         NOT NULL,
    scenario_images             JSONB        NOT NULL DEFAULT '[]'::jsonb,
    scenario_image_zoomable     BOOLEAN      NOT NULL DEFAULT FALSE,
    initial_message             TEXT         NOT NULL,
    expert_model                TEXT         NOT NULL,
    target_misconceptions       TEXT[]       NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX scenario_questions_order_idx ON scenario_questions(scenario_quiz_id, order_index);
```

### 3.10 `assignments`

```sql
CREATE TABLE assignments (
    id                 VARCHAR(64)   PRIMARY KEY,                -- 'assign-001' or 'assign-{ts}'
    type               VARCHAR(16)   NOT NULL DEFAULT 'diagnosis',
    quiz_id            VARCHAR(32)   REFERENCES quizzes(id),
    scenario_quiz_id   VARCHAR(32)   REFERENCES scenario_quizzes(id),
    class_id           VARCHAR(32)   NOT NULL REFERENCES classes(id),
    -- 派發對象：'class' = 整班；'students' = 個別學生（spec-05 §3.4 / spec-04 §2.4）
    target_type        VARCHAR(16)   NOT NULL DEFAULT 'class',
    assigned_at        DATE          NOT NULL DEFAULT CURRENT_DATE,
    due_date           DATE          NOT NULL,
    status             VARCHAR(16)   NOT NULL DEFAULT 'active',
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT assignments_type_chk CHECK (type IN ('diagnosis', 'scenario')),
    CONSTRAINT assignments_status_chk CHECK (status IN ('active', 'completed')),
    CONSTRAINT assignments_target_type_chk CHECK (target_type IN ('class', 'students')),
    CONSTRAINT assignments_quiz_xor CHECK (
        (type = 'diagnosis' AND quiz_id IS NOT NULL AND scenario_quiz_id IS NULL)
     OR (type = 'scenario'  AND scenario_quiz_id IS NOT NULL AND quiz_id IS NULL)
    )
);

CREATE INDEX assignments_class_due_idx ON assignments(class_id, due_date);
CREATE INDEX assignments_quiz_idx ON assignments(quiz_id);
CREATE INDEX assignments_scenario_idx ON assignments(scenario_quiz_id);
```

### 3.10b `assignment_students`

當 `assignments.target_type = 'students'` 時，這張關聯表記錄被指派的學生清單。
診斷派題 (`target_type='class'`) 不寫此表（學生隱含為「該班全體」）。

```sql
CREATE TABLE assignment_students (
    assignment_id  VARCHAR(64) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id     VARCHAR(64) NOT NULL REFERENCES users(id),
    PRIMARY KEY (assignment_id, student_id)
);

CREATE INDEX assignment_students_student_idx ON assignment_students(student_id);
```

> 業務不變式（router 層強制；無 DB CHECK 因為跨表）：
> - 所有 `student_id` 必須屬於該 assignment 的 `class_id`
> - `target_type='students'` 時，`assignment_students` 至少 1 筆
> - `target_type='class'`   時，`assignment_students` 必為空

### 3.11 `student_answers`

```sql
CREATE TABLE student_answers (
    id              BIGSERIAL    PRIMARY KEY,
    assignment_id   VARCHAR(64)  NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      VARCHAR(64)  NOT NULL REFERENCES users(id),
    question_id     BIGINT       NOT NULL REFERENCES quiz_questions(id),
    selected_tag    CHAR(1)      NOT NULL,
    diagnosis       VARCHAR(16)  NOT NULL,                       -- 'CORRECT' or M-code
    answered_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT student_answers_tag_chk CHECK (selected_tag IN ('A', 'B', 'C', 'D'))
);

CREATE UNIQUE INDEX student_answers_unique_idx ON student_answers(assignment_id, student_id, question_id);
CREATE INDEX student_answers_student_idx ON student_answers(student_id);
```

### 3.12 `followup_results`

```sql
CREATE TABLE followup_results (
    id                    BIGSERIAL   PRIMARY KEY,
    student_answer_id     BIGINT      NOT NULL UNIQUE REFERENCES student_answers(id) ON DELETE CASCADE,
    conversation_log      JSONB       NOT NULL DEFAULT '[]'::jsonb,
    final_status          VARCHAR(32) NOT NULL,                  -- CORRECT | MISCONCEPTION | UNCERTAIN
    misconception_code    VARCHAR(16),                           -- nullable
    reasoning_quality     VARCHAR(16) NOT NULL,                  -- SOLID | PARTIAL | WEAK | GUESSING
    status_change         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    ai_summary            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT followup_status_chk CHECK (final_status IN ('CORRECT', 'MISCONCEPTION', 'UNCERTAIN')),
    CONSTRAINT followup_quality_chk CHECK (reasoning_quality IN ('SOLID', 'PARTIAL', 'WEAK', 'GUESSING'))
);
```

`conversation_log` JSONB schema：
```json
[
  { "role": "ai", "text": "...", "round": 1, "createdAt": "ISO" },
  { "role": "student", "text": "...", "round": 1, "createdAt": "ISO" }
]
```

### 3.13 `treatment_sessions`

```sql
CREATE TABLE treatment_sessions (
    id                       VARCHAR(64)  PRIMARY KEY,            -- 'session-{ts}'
    scenario_quiz_id         VARCHAR(32)  NOT NULL REFERENCES scenario_quizzes(id),
    student_id               VARCHAR(64)  NOT NULL REFERENCES users(id),
    status                   VARCHAR(16)  NOT NULL DEFAULT 'active',
    current_question_index   INTEGER      NOT NULL DEFAULT 1,
    started_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at             TIMESTAMPTZ,
    CONSTRAINT treatment_sessions_status_chk CHECK (status IN ('active', 'completed'))
);

CREATE UNIQUE INDEX treatment_sessions_unique_idx ON treatment_sessions(scenario_quiz_id, student_id);
```

### 3.14 `treatment_messages`

```sql
CREATE TABLE treatment_messages (
    id                     BIGSERIAL    PRIMARY KEY,
    session_id             VARCHAR(64)  NOT NULL REFERENCES treatment_sessions(id) ON DELETE CASCADE,
    question_index         INTEGER      NOT NULL,
    role                   VARCHAR(8)   NOT NULL,
    text                   TEXT         NOT NULL,
    phase                  VARCHAR(16),                     -- diagnosis|apprenticeship|completed (僅 ai)
    stage                  VARCHAR(16),                     -- claim|evidence|reasoning|revise|complete
    step                   INTEGER,
    hint_level             INTEGER,
    feedback               TEXT,
    requires_restatement   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT treatment_messages_role_chk CHECK (role IN ('ai', 'student')),
    CONSTRAINT treatment_messages_phase_chk CHECK (phase IS NULL OR phase IN ('diagnosis', 'apprenticeship', 'completed')),
    CONSTRAINT treatment_messages_stage_chk CHECK (stage IS NULL OR stage IN ('claim', 'evidence', 'reasoning', 'revise', 'complete')),
    CONSTRAINT treatment_messages_step_chk CHECK (step IS NULL OR (step BETWEEN 0 AND 7)),
    CONSTRAINT treatment_messages_hint_chk CHECK (hint_level IS NULL OR (hint_level BETWEEN 0 AND 3))
);

CREATE INDEX treatment_messages_session_q_idx ON treatment_messages(session_id, question_index, created_at);
```

### 3.15 `ai_summary_cache`

```sql
CREATE TABLE ai_summary_cache (
    id            BIGSERIAL    PRIMARY KEY,
    scope         VARCHAR(16)  NOT NULL,                 -- 'grade' | 'class'
    scope_id      VARCHAR(64)  NOT NULL,                 -- '*' for grade, class_id for class
    quiz_id       VARCHAR(32)  NOT NULL REFERENCES quizzes(id),
    payload       JSONB        NOT NULL,                 -- 摘要主體
    citations     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    generated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ai_summary_cache_scope_chk CHECK (scope IN ('grade', 'class'))
);

CREATE UNIQUE INDEX ai_summary_cache_unique_idx ON ai_summary_cache(scope, scope_id, quiz_id);
CREATE INDEX ai_summary_cache_expires_idx ON ai_summary_cache(expires_at);
```

---

## 4. Migration 策略

- 用 Alembic 管理。
- 初版（P1）：建上述全部表 + 索引（即使 P3 / P4 才用到的也一次建好，避免後續 migration 過多）。
- migration 檔命名：`alembic revision --autogenerate -m "description"`
- 生產環境：`alembic upgrade head` 由 backend container 啟動時執行（見 spec-10 §4.3）

---

## 5. Seed 資料（P1 階段）

由 `app/seed/seed.py` 灌入：

| 資料類別 | 內容 |
|---------|------|
| 教師 | `aaa001`（「示範老師」，密碼 `aaa001`，擁有所有 demo 班級）<br>`bbb001`（「黃老師」，密碼 `bbb001`，**正式上線使用**，無班級 / 學生 / 派題 / 作答） |
| 班級 | `class-A` / `class-B` / `class-C`（`teacher_id` 全部 = `aaa001`） |
| 學生 | 五年甲班 20 人（`115001~115020`）、五年乙班 18 人（`115101~115118`）、五年丙班 22 人（`115201~115222`） |
| 診斷考卷 | `quiz-001`、`quiz-002`（沿用 `src/data/quizData.js`） |
| 情境考卷 | `scenario-002`（沿用 `src/data/scenarioQuizData.js`，2026-05-07 後僅保留 1 份 demo） |
| 派題 | `assign-001` ~ `assign-004`（診斷整班）+ `assign-006`（情境，指定 2 位學生）|

學生帳號編號規則：
- 五年甲班：`115001` ~ `115020`（座號 1~20）
- 五年乙班：`115101` ~ `115118`（座號 1~18）
- 五年丙班：`115201` ~ `115222`（座號 1~22）
- 預設密碼一律等於帳號

執行方式：
```bash
uv run python -m app.seed.seed              # 重新灌（會 truncate 既有資料）
uv run python -m app.seed.seed --if-empty   # 僅當資料庫空才灌（容器啟動用）
```

---

## 6. 與既有 mock data 的對應

| 既有 mock 檔案 | 對應表 |
|---------------|--------|
| `src/data/classData.js`         | `classes` + `students` + `users` |
| `src/data/quizData.js`          | `quizzes` + `quiz_questions` + `quiz_options`；`ANSWER_DISTRIBUTIONS_MAP` → `student_answers`（P4 才寫入） |
| `src/data/assignmentData.js`    | `assignments` |
| `src/data/scenarioQuizData.js`  | `scenario_quizzes` + `scenario_questions` |
| `src/data/knowledgeGraph.js`    | **不入庫**（純常數，前後端皆從 `src/data/knowledgeGraph.js` 讀；P3 後考慮搬到後端 `app/data/`） |

> P3 完成後，`src/data/*.js` 若不再被前端引用，將砍除或保留為「型別定義 + 知識節點靜態常數」。
