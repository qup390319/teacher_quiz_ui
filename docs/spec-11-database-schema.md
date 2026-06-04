# SPEC-11: Database Schema / 資料庫 Schema 規格

> 本文件定義 PostgreSQL 16 的完整 schema。所有表、欄位、約束、索引以本文件為單一真理來源。
> ORM 定義位於 `backend/app/db/models/`，與本文件保持一致。

---

## 1. 命名與通用約定

- 表名：snake_case 複數（`users`、`student_answers`）
- 欄位名：snake_case
- 主鍵 ID 命名規則：
  - **語意 ID**（前端需引用、URL 友善）：使用字串，例如 `class-A`、`quiz-001`、`scenario-001`、`assign-001`、`session-{ts}`、`INe-Ⅱ-3-02`、`M02-1`
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
| 4b | `class_categories` | 教師自訂班級分類 | 2026-05-29 (0020) |
| 5 | `quizzes` | 診斷題組主檔 | P1（seed）/ P3（CRUD） |
| 6 | `quiz_questions` | 題組題目 | P1 / P3 |
| 7 | `quiz_options` | 題目選項 | P1 / P3 |
| 8 | `scenario_quizzes` | 概念釐清治療題組 | **已下線（保留 schema 不動）** |
| 9 | `scenario_questions` | 概念釐清題目 | **已下線（保留 schema 不動）** |
| 10 | `assignments` | 派發紀錄 | P1（seed）/ P3 |
| 10b | `assignment_students` | 個別學生派發關聯 | **已下線（保留 schema 不動）** |
| 11 | `student_answers` | 學生作答 | P4 |
| 12 | `followup_results` | 追問結果 | P4 |
| 13 | `treatment_sessions` | 治療對話 session | **已下線（保留 schema 不動）** |
| 14 | `treatment_messages` | 治療對話訊息 | **已下線（保留 schema 不動）** |
| 15 | `ai_summary_cache` | RAGFlow 摘要快取 | P3 |
| 16 | `custom_misconceptions` | 教師私有自訂迷思（spec-04 §2.5.1） | post-P4 |
| 17 | `units` | 課程單元（高 / 中 / 低年級分區；W5+ 知識節點與題組會關聯到此） | W4 |
| 18 | `knowledge_nodes` | 小節點（可選擇所屬單元、含畫布座標、先備關係） | W5a |
| 19 | `misconceptions` | 節點的迷思概念（含學生視角、AI 二次確認問句） | W5a |
| 20 | `parent_nodes` | 大節點 / 課綱內容細目（介於 unit 與 knowledge_node 的階層） | W7a |
| 21 | `unit_parent_nodes` | 教學單元 ↔ 大節點 M:N 綁定 | 2026-05-29 (0021) |
| — | （seed） | 14 個高年級教學單元（type='unit'）+ 對應 parent_node M:N | 2026-05-29 (0022) |

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
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE, -- 0012 migration: 管理員可停用帳號
    disabled_at     TIMESTAMPTZ,                          -- 0012 migration: 停用時間
    disabled_by     VARCHAR(64),                          -- 0012 migration: 停用此帳號的管理員 id
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT users_role_chk CHECK (role IN ('teacher', 'student', 'admin')) -- 0012 migration: 加入 'admin'
);

CREATE INDEX users_role_idx ON users(role);
```

**邏輯**：`id = account`（兩者完全相同），方便除錯與引用。`password` 欄位以明文儲存。

**停用機制（0012 migration）**：`is_active=false` 的帳號無法登入（後端在 `/api/auth/login` 與 `get_current_user` 都檢查）；但所有歷史資料（班級、題組、派題、作答、追問、治療 session）完整保留，不做 cascade。教師被停用後，他建立的班級與題組對學生端依然可見（學生作答歷史不受影響）。`disabled_by` 記錄執行停用操作的管理員 `users.id`，用於稽核。**沒有設 FK** 是為了允許歷史 admin 帳號被刪除後仍保留 audit trail（與 `treatments_*` 同樣手法）。

**admin 角色**：系統管理員（`role='admin'`）。預設 seed 一個 `admin001` / `admin001`（migration 0012 + seed.py）。admin 不關聯到 `teachers` / `students` 子表。

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
    id           VARCHAR(32)   PRIMARY KEY,            -- 'class-A', 'class-B', 'class-C' (server-generated for new classes)
    name         VARCHAR(64)   NOT NULL,               -- '五年甲班'
    grade        VARCHAR(16)   NOT NULL,               -- '五年級'
    subject      VARCHAR(32)   NOT NULL,               -- '自然科學'
    color        VARCHAR(7)    NOT NULL,               -- '#C8EAAE'
    text_color   VARCHAR(7)    NOT NULL,               -- '#3D5A3E'
    teacher_id   VARCHAR(64)   REFERENCES users(id) ON DELETE SET NULL,  -- 0003 migration
    category_id  VARCHAR(40)   REFERENCES class_categories(id) ON DELETE SET NULL,  -- 0020 migration: 教師自訂分類；NULL = 未分類
    note         VARCHAR(200),                          -- 0004 migration: 教師備註，如「114 學年度」
    school_year  INTEGER       NOT NULL DEFAULT 2025,   -- 0011 migration: 學年度（西元年；114 學年度 = 2025）
    semester     VARCHAR(8)    NOT NULL DEFAULT 'second', -- 0011 migration: 'first' | 'second'
    status       VARCHAR(16)   NOT NULL DEFAULT 'active', -- 0011 migration: 'active' | 'archived'
    archived_at  TIMESTAMPTZ,                            -- 0011 migration: status='archived' 時設值
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT classes_semester_chk CHECK (semester IN ('first', 'second')),
    CONSTRAINT classes_status_chk   CHECK (status   IN ('active', 'archived')),
    CONSTRAINT classes_archived_consistency_chk
        CHECK ((status = 'archived' AND archived_at IS NOT NULL)
            OR (status = 'active'   AND archived_at IS NULL))
);
CREATE INDEX classes_teacher_idx       ON classes(teacher_id);
CREATE INDEX classes_term_idx          ON classes(teacher_id, school_year, semester, status); -- 0011 migration
CREATE INDEX classes_category_idx      ON classes(category_id); -- 0020 migration
```

> **教師範圍隔離（0003 migration）**：`teacher_id` 是該班所屬教師。所有讀取
> 班級 / 學生 / 派題 / 治療紀錄 / N1 / N2 的 API 都會用 `Class.teacher_id ==
> current_teacher.id` 過濾，bbb001 等新教師看不到 aaa001 的示範資料；反之亦然。
> 共用的 `quizzes` / `scenario_quizzes` 不做隔離（系統範例題庫）。
> 0003 升級時會自動把所有既有班級回填為 `aaa001` 以保留既有 demo dashboard。

> **學年度與封存（0011 migration）**：班級新增「學年/學期/狀態/封存時間」四欄位。
> 升級時將既有 class-A/B/C 回填 `school_year=2025, semester='second', status='active', archived_at=NULL`，與 seed 預設一致。
> `GET /api/classes` 預設只回 `school_year=$current, semester=$current, status='active'` 的班級；
> 帶 `include_archived=true` 可同時回封存班級。`POST /api/classes/{id}/archive` 與 `/unarchive`
> 為狀態切換端點（不刪資料）；assignments / answers / followups / treatment_sessions 不受班級
> 封存影響，仍依 FK 保留以供歷史查閱。詳見 spec-05 §1.5。

> **教師自訂分類（0020 migration）**：班級新增 `category_id` FK → `class_categories(id)`，`ON DELETE SET NULL`。
> 教師可自定分類並把班級拖到任意分類；未分類班級 `category_id IS NULL`。
> `PATCH /api/classes/{id}` 接受 `{ categoryId: "cat_xxx" | null }`；後端會驗證 `category` 屬於該老師，
> 否則回 404 `CATEGORY_NOT_FOUND`。

### 3.3b `class_categories`（0020 migration）

```sql
CREATE TABLE class_categories (
    id          VARCHAR(40)  PRIMARY KEY,                                -- 'cat_{16hex}'
    teacher_id  VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(64)  NOT NULL,                                   -- 教師自訂，UNIQUE per teacher
    sort_order  INTEGER      NOT NULL DEFAULT 0,                         -- 教師自訂排序
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT class_categories_teacher_name_uq UNIQUE (teacher_id, name)
);
CREATE INDEX class_categories_teacher_order_idx ON class_categories(teacher_id, sort_order);
```

> **設計動機**：原本以 localStorage 暫存的「班級分類」功能（2026-05-29 deviations 條目）正式落地。
> 教師可建立任意數量分類、自訂名稱與排序、拖曳班級跨分類移動；資料隨帳號跨裝置同步。
> 教師被刪除 → 分類 CASCADE 刪除；分類被刪除 → 該分類下的班級 `category_id` SET NULL（不會丟掉班級資料）。
> 從 localStorage 升級到後端的一次性遷移由前端 `ClassManagement` 掛載時自動執行，詳見 spec-04 §5.1。

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
    knowledge_node_ids  TEXT[]        NOT NULL DEFAULT '{}',  -- ['INe-Ⅱ-3-02', ...]
    created_by          VARCHAR(64)   REFERENCES users(id),   -- teacher user_id；nullable for seed
    is_sample           BOOLEAN       NOT NULL DEFAULT FALSE, -- W6 migration 0016：admin 標記為系統範例
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

> **已下線（保留 schema 不動）**：概念釐清模組已從實驗系統移除，但 DB schema 仍保留以維持資料完整性與 migration 歷史。後端 router 已於 `main.py` 註解，前端不再使用。

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

> **已下線（保留 schema 不動）**：同 §3.8。

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

> **已下線（保留 schema 不動）**：原為概念釐清個別學生派發使用，模組移除後此表不再有寫入；schema 保留以維持 migration 歷史。

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

> **已下線（保留 schema 不動）**：概念釐清模組已從實驗系統移除，後端 router 已於 `main.py` 註解，前端不再寫入；schema 保留以維持資料完整性與 migration 歷史。

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

> **已下線（保留 schema 不動）**：同 §3.13。

```sql
CREATE TABLE treatment_messages (
    id                     BIGSERIAL    PRIMARY KEY,
    session_id             VARCHAR(64)  NOT NULL REFERENCES treatment_sessions(id) ON DELETE CASCADE,
    question_index         INTEGER      NOT NULL,
    role                   VARCHAR(8)   NOT NULL,
    text                   TEXT         NOT NULL,
    phase                  VARCHAR(16),                     -- diagnosis|apprenticeship|cer|completed (僅 ai；cer 由 alembic 0008 引入)
    stage                  VARCHAR(16),                     -- claim|evidence|reasoning|revise|complete
    step                   INTEGER,
    hint_level             INTEGER,
    feedback               TEXT,
    requires_restatement   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT treatment_messages_role_chk CHECK (role IN ('ai', 'student')),
    CONSTRAINT treatment_messages_phase_chk CHECK (phase IS NULL OR phase IN ('diagnosis', 'apprenticeship', 'cer', 'completed')),
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

### 3.16 `custom_misconceptions`

教師私有的自訂迷思（spec-04 §2.5.1）。每位教師只能讀寫自己的記錄。

```sql
CREATE TABLE custom_misconceptions (
    id                VARCHAR(48) PRIMARY KEY,                -- 'cm-{ts}-{teacherIdPrefix}'
    teacher_id        VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id           VARCHAR(32) NOT NULL,                   -- 12 個合法節點 ID 之一（軟限制，後端在 router 驗證）
    label             VARCHAR(64) NOT NULL,                   -- 短標題
    detail            TEXT        NOT NULL,                   -- 教師參考的詳細描述
    student_detail    TEXT        NOT NULL,                   -- 學生視角描述
    confirm_question  TEXT        NOT NULL,                   -- AI 確認題
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX custom_misconceptions_teacher_idx ON custom_misconceptions(teacher_id);
CREATE INDEX custom_misconceptions_teacher_node_idx ON custom_misconceptions(teacher_id, node_id);
```

**Migration**：`20260509_0005_custom_misconceptions.py`（已 upgrade）。

**隔離保證**：
- 所有 router 端點都用 `WHERE teacher_id = current_user.id` 過濾
- 寫入時 `teacher_id` 永遠取 cookie 帶來的當前 user，前端傳值會被忽略
- 刪除時若 record 不屬於當前老師，回 404（不洩漏存在性）

### 3.17 `units`（W4，migration 0013）

```sql
CREATE TABLE units (
    id                 VARCHAR(64)  PRIMARY KEY,           -- 'unit-water-solution'
    code               VARCHAR(64)  NOT NULL UNIQUE,       -- 'water-solution'
    name               VARCHAR(64)  NOT NULL,              -- '水溶液'
    grade_band         VARCHAR(16)  NOT NULL,              -- 'lower' | 'middle' | 'upper'
    description        TEXT,
    display_order      INTEGER      NOT NULL DEFAULT 0,
    status             VARCHAR(16)  NOT NULL DEFAULT 'active', -- 'active' | 'archived'
    type               VARCHAR(16)  NOT NULL DEFAULT 'subtheme', -- 'unit' | 'subtheme'
    is_system_current  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT units_grade_band_chk CHECK (grade_band IN ('lower','middle','upper')),
    CONSTRAINT units_status_chk     CHECK (status     IN ('active','archived')),
    CONSTRAINT units_type_chk       CHECK (type       IN ('unit','subtheme'))
);

CREATE INDEX units_grade_band_idx ON units(grade_band, display_order);
```

**邏輯**：
- `is_system_current=true` 標記系統現有 12 個 hard-coded 知識節點所屬的單元（W4 為「水溶液」）。此旗標的單元**不可封存、不可刪除**，避免破壞既有題組與診斷流程；後端在 archive / delete 端點檢查並回 409 `UNIT_IS_SYSTEM_CURRENT`
- W5 知識節點 DB 化後，`knowledge_nodes` 表會加 `unit_id` FK；屆時 `is_system_current` 可改為由節點關聯動態判定，本欄位作為過渡
- **`type` 欄位區分兩種記錄**：
  - `type='unit'`：教學單元（如「水溶液」「空氣與燃燒」），在「單元管理」頁面管理；教師端選單元時看到的就是這層
  - `type='subtheme'`：108 課綱次主題（如「物質的形態、性質及分類（Ab）」「波動、光及聲音（Ka）」），在「知識節點 > 階層結構」管理；docx 匯入預設建立此類型
  - 兩者透過 `unit_parent_nodes`（§3.21）M:N 連結；同一個次主題下的大節點可以拆/併到不同教學單元

**Seed 歷史**：
- migration 0013 預先 seed 12 個高年級單元（太陽與光的折射 / 植物世界 / 空氣與燃燒 / 聲音與樂器 / 觀測星空 / 水溶液 / 動物大觀園 / 力與運動 / 多變的天氣 / 地表的變化 / 電磁作用 / 熱對物質的影響）；其中 11 個 placeholder 在 W7a-W7b 期間經 admin UI 清除，僅留「水溶液」
- migration 0022（2026-05-29）以「康軒風格但避開其專有修辭」為原則，重新 seed 14 個國小高年級教學單元並 attach 對應次主題的 parent_nodes：

  | display_order | 學期 | 教學單元 | 對應次主題 / 拆分依據 |
  |---|---|---|---|
  | 1 | 五上 | 太陽與光的探究 | Ka 拆光：parent_codes ∈ {INe-Ⅲ-7 色光, INe-Ⅲ-8 光的折射} |
  | 2 | 五上 | 植物的世界 | （Db 次主題下實際只有動物 parent；植物相關 parent 後續手動指派） |
  | 3 | 五上 | 空氣與燃燒 | Ec 氣體 全部 |
  | 4 | 五上 | 力與運動 | Eb 力與運動 全部 |
  | 5 | 五下 | 觀測星空 | Fb 地球與太空 全部 |
  | 6 | 五下 | 動物的世界 | Db 拆動物：parent_codes ∈ {INb-Ⅲ-6 動物形態} |
  | 7 | 五下 | 熱與保溫 | Bb 溫度與熱量 全部 |
  | 8 | 五下 | 聲音與樂器 | Ka 拆聲音：parent_codes ∈ {INe-Ⅲ-6 聲音性質} |
  | 9 | 六上 | 天氣的變化 | Ib 天氣與氣候變化 全部 |
  | 10 | 六上 | 地表的變化 | Ia + Hb + Fa 合併 |
  | 11 | 六上 | 水溶液（既有，由 0022 由 display_order=6 調整為 11） | — |
  | 12 | 六上 | 電磁作用 | Kc 電磁現象 全部 |
  | 13 | 六下 | 簡單機械 | （課綱無直接對應的大節點；空殼） |
  | 14 | 六下 | 物質的變化 | Ja + Jc 合併 |
  | 15 | 六下 | 生物與環境 | Bd + Fc + Lb 合併 |

  > 命名原則：避開康軒專有修辭（「面面觀／奧祕／大地／美麗」），保留課綱原文（「空氣與燃燒／力與運動／水溶液／電磁作用／簡單機械／物質的變化／生物與環境」）。docx 匯入造成的 parent_node 資料雜訊（如 Eb 力與運動 下混入 INc-II/INd-II 等跨次主題節點）保留給 admin 透過「管理大節點」 modal 手動清整。

### 3.18 `knowledge_nodes`（W5a，migration 0014）

```sql
CREATE TABLE knowledge_nodes (
    id                VARCHAR(64)  PRIMARY KEY,                -- admin 自訂；同單元內唯一
    unit_id           VARCHAR(64)  REFERENCES units(id) ON DELETE SET NULL, -- NULL = 未分配
    grade_band        VARCHAR(16)  NOT NULL,                   -- 'lower' | 'middle' | 'upper'
    parent_code       VARCHAR(32),                              -- 大節點編碼，如 'INe-Ⅱ-3'
    parent_name       TEXT,                                     -- 大節點名稱（學習內容描述）
    name              VARCHAR(256) NOT NULL,                    -- 小節點名稱
    description       TEXT,
    video_title       VARCHAR(256),                             -- 課綱影片標題
    video_url         VARCHAR(512),                             -- 課綱影片網址
    teaching_strategy TEXT,                                       -- W5b: 教師教學策略（migration 0015）
    student_hint      TEXT,                                       -- W5b: 學生提示（migration 0015）
    learning_order    INTEGER      NOT NULL DEFAULT 0,          -- 同單元同 parent_code 下的順序
    prerequisites     TEXT[]       NOT NULL DEFAULT '{}',       -- 先備節點 id 陣列（同單元內）
    canvas_x          DOUBLE PRECISION,                          -- 畫布座標；NULL = 走自動排版
    canvas_y          DOUBLE PRECISION,
    is_system_seed    BOOLEAN      NOT NULL DEFAULT FALSE,      -- 12 個既有水溶液節點 = TRUE
    on_canvas         BOOLEAN      NOT NULL DEFAULT FALSE,      -- W5c migration 0017：新建節點預設不上畫布
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT knowledge_nodes_grade_band_chk CHECK (grade_band IN ('lower','middle','upper'))
);

CREATE INDEX knowledge_nodes_unit_idx   ON knowledge_nodes(unit_id);
CREATE INDEX knowledge_nodes_grade_idx  ON knowledge_nodes(grade_band);
CREATE INDEX knowledge_nodes_parent_idx ON knowledge_nodes(parent_code);
```

**邏輯**：
- migration 0014 把 `src/data/knowledgeGraph.js` 既有 12 個水溶液節點 seed 進 DB（全部標 `is_system_seed=true`、`unit_id='unit-water-solution'`）
- W5a 階段教師端 / 學生端仍從前端 hard-code 讀取；admin 透過 `/admin/knowledge-nodes` 頁可看與編輯，**修改在 admin 端可看到**，教師端要等 W5b 拔掉 hard-code 才同步
- `is_system_seed=true` 節點**可編輯但不可刪**（admin_knowledge_nodes router 在 DELETE 時檢查並回 409 `NODE_IS_SYSTEM_SEED`）
- `canvas_x` / `canvas_y` 為 NULL 時，前端 `KnowledgeNodeCanvas` 用「parent_code 分欄、learning_order 分列」自動排版；admin 拖曳節點後 debounced 500ms 寫回
- Excel 匯入時所有新節點以 `unit_id=NULL` 寫入「未分配池」，admin 可在 UI 上以大節點分組批次指派

### 3.19 `misconceptions`（W5a，migration 0014）

```sql
CREATE TABLE misconceptions (
    id               VARCHAR(64)  PRIMARY KEY,                  -- 例 'M01-1'
    node_id          VARCHAR(64)  NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    label            VARCHAR(256) NOT NULL,                     -- 短標題
    detail           TEXT,                                       -- 教師視角描述
    student_detail   TEXT,                                       -- 學生視角描述
    confirm_question TEXT,                                       -- AI 二次確認問句
    is_default       BOOLEAN      NOT NULL DEFAULT TRUE,        -- 系統預設 vs 教師自訂
    owner_id         VARCHAR(64)  REFERENCES users(id) ON DELETE SET NULL, -- 自訂時填教師 id
    display_order    INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (node_id, id)
);

CREATE INDEX misconceptions_node_idx ON misconceptions(node_id);
```

**邏輯**：
- migration 0014 從 hard-code seed 48 條既有迷思（M01-1 ~ M12-4，每節點 4 條，`is_default=true`）
- W5b 之後會把既有 `custom_misconceptions` 表（教師自訂）整合進來，用 `is_default=false` + `owner_id` 區分

### 3.20 `parent_nodes`（W7a，migration 0018）

```sql
CREATE TABLE parent_nodes (
    id              VARCHAR(64)  PRIMARY KEY,                  -- 'pnode-water-solution-ine-3' (slug 自動產生)
    unit_id         VARCHAR(64)  REFERENCES units(id) ON DELETE SET NULL,
    code            VARCHAR(64)  NOT NULL,                      -- 'INe-Ⅱ-3'
    name            TEXT         NOT NULL,                      -- '認識水溶液中的變化（溶解）'
    description     TEXT,
    display_order   INTEGER      NOT NULL DEFAULT 0,            -- 同單元內大節點之間的順序
    prerequisites   TEXT[]       NOT NULL DEFAULT '{}',         -- 同單元內其他大節點 id（大節點間先備）
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (unit_id, code)
);

CREATE INDEX parent_nodes_unit_idx ON parent_nodes(unit_id);
```

**邏輯**：
- 對應 108 課綱 docx 中的「課綱內容細目指標」(如 INe-Ⅱ-3、INe-Ⅲ-5)，介於次主題（unit）與知識節點（knowledge_node）之間
- migration 0018 自動從既有 `knowledge_nodes.parent_code` 字串升級：依 (unit_id, parent_code) distinct 建 parent_node、依文件順序 backfill `display_order`
- `knowledge_nodes` 加 `parent_node_id` FK 並回填；`parent_code` / `parent_name` 仍保留作 denormalized cache（公開 API 不必 join）
- W7b（後續）：Word docx 匯入會用此 schema 一次建立 unit + parent_nodes + knowledge_nodes 完整階層。匯入時**不建立空殼大節點**：若某大節點底下的小節點全已屬其他單元（無任何新節點或未分配節點會掛上來），則略過該大節點不建，從源頭避免產生同代碼重複（呼應 §3.20 不變量；端點回傳 `shellsSkipped` 計數）。既有已分配節點一律不搬動。
- **不變量**：`parent_nodes.unit_id` 應指向**次主題**（`units.type='subtheme'`），而非教學單元（`type='unit'`）。早期（migration 0014/0018）從原型水溶液節點升級的 legacy 大節點曾誤指向教學單元 `unit-water-solution`，與課綱 docx 匯入建立的正規次主題節點形成同 code 重複；**migration 0025（2026-06-03）已去重**：保留正規次主題節點、把 legacy 的 `knowledge_nodes`/`unit_parent_nodes` 引用重指過去後刪除 legacy（含 fresh-DB 防呆：canonical 不存在即略過）。**migration 0026（2026-06-04）補正連帶問題**：0025 僅改了那 12 個示範知識節點的 `parent_node_id`，`unit_id` 仍停在教學單元，使三欄編輯器（先以次主題 `unit_id` 抓節點）在 Jb/Jd 下看不到它們；0026 把 5 個改 `unit_id=unit-jb`、7 個改 `unit_id=unit-jd`，並 `on_canvas=false` + 清空座標（退出畫布待重排）。同理 `knowledge_nodes.unit_id` 亦應指向次主題。詳見 `docs/deviations.md`。

### 3.21 `unit_parent_nodes`（2026-05-29，migration 0021）

```sql
CREATE TABLE unit_parent_nodes (
    unit_id         VARCHAR(64)  NOT NULL REFERENCES units(id)        ON DELETE CASCADE,
    parent_node_id  VARCHAR(64)  NOT NULL REFERENCES parent_nodes(id) ON DELETE CASCADE,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (unit_id, parent_node_id)
);

CREATE INDEX unit_parent_nodes_unit_idx ON unit_parent_nodes(unit_id, sort_order);
```

**邏輯**：
- M:N 中介表，讓**教學單元**（`units.type='unit'`）可以**附掛**多個課綱大節點（`parent_nodes`）。
- 與 `parent_nodes.unit_id`（大節點的「原次主題」歸屬）**分開**：原 FK 不動，本表只追加教學用的綁定。
- 一個大節點可同時被多個教學單元綁定；刪除 unit 或 parent_node 都會 CASCADE 清掉對應綁定，但不會影響另一邊的本體資料。
- `sort_order` 由 admin 在 `UnitParentNodesModal`（spec-02 §3.7）拖曳維護。

**清單內嵌摘要**：`GET /api/admin/units` 回傳的每個 `UnitBrief` 內嵌 `parentNodes`（精簡欄位 `parentNodeId` / `code` / `name` / `sortOrder`，依 `sort_order` 排序），讓單元管理頁每列可直接顯示「包含哪些大節點」而不必逐單元再查（一支 JOIN 查詢一次撈齊）。公開端點 `GET /api/units` 不填充此欄位（回空陣列）。

**對應 router**：`spec-10 §6` 的 `GET/POST/DELETE/PUT /api/admin/units/{id}/parent-nodes`。

---

## 4. Migration 策略

- 用 Alembic 管理。
- 初版（P1）：建上述全部表 + 索引（即使 P3 / P4 才用到的也一次建好，避免後續 migration 過多）。
- migration 檔命名：`alembic revision --autogenerate -m "description"`
- 生產環境：`alembic upgrade head` 由 backend container 啟動時執行（見 spec-10 §4.3）

**現有 migration 清單**（按時間順序）：

| Revision | 描述 |
|---------|------|
| `0001` | initial schema（spec-11 §3 全表初始版本） |
| `0002` | 新增 `assignment_students` 表 |
| `0003` | `classes.teacher_id` + 教師範圍隔離（既有班級回填 `aaa001`） |
| `0004` | `classes.note`（教師備註） |
| `0005` ~ `0010` | custom_misconceptions / followup cause_ids / treatment phase CER / FK cascades 等 |
| **`0011`** | **`classes.school_year` + `semester` + `status` + `archived_at` + `classes_term_idx`**（學年度與封存）<br>升級回填：所有現有班級 `school_year=2025, semester='second', status='active', archived_at=NULL` |

---

## 5. Seed 資料（P1 階段）

由 `app/seed/seed.py` 灌入：

| 資料類別 | 內容 |
|---------|------|
| 教師 | `aaa001`（「示範老師」，密碼 `aaa001`，擁有所有 demo 班級）<br>`bbb001`（「黃老師」，密碼 `bbb001`，**正式上線使用**，無班級 / 學生 / 派題 / 作答） |
| 班級 | `class-A` / `class-B` / `class-C`（`teacher_id` 全部 = `aaa001`） |
| 學生 | 五年甲班 20 人（`115001~115020`）、五年乙班 18 人（`115101~115118`）、五年丙班 22 人（`115201~115222`） |
| 診斷題組 | `quiz-001`、`quiz-002`（沿用 `src/data/quizData.js`） |
| 概念釐清題組 | `scenario-002`（沿用 `src/data/scenarioQuizData.js`，2026-05-07 後僅保留 1 份 demo） |
| 派題 | `assign-001` ~ `assign-004`（診斷整班）+ `assign-006`（概念釐清，指定 2 位學生）|

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
