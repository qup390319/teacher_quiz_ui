# SPEC-10: Backend Architecture / 後端架構規格

> 本文件定義 SciLens 後端服務的整體架構。後端負責：認證、資料持久化、LLM proxy、RAGFlow 代理。
> 前端 → 後端的協定見 §6；資料庫 schema 細節見 spec-11；認證細節見 spec-13；RAGFlow 整合見 spec-12（P2 階段才寫）。

---

## 1. 技術棧

| 類別 | 技術 | 版本 / 備註 |
|------|------|-------------|
| 語言 | Python | 3.12 |
| Web 框架 | FastAPI | 最新穩定版 |
| 資料驗證 | Pydantic | v2 |
| ORM | SQLAlchemy | 2.0 async API |
| Migration | Alembic | 最新穩定版 |
| DB driver | asyncpg | PostgreSQL async |
| 資料庫 | PostgreSQL | 16-alpine |
| HTTP client | httpx | AsyncClient（呼叫 vLLM / RAGFlow） |
| 套件管理 | uv | 用 `uv sync` / `uv add` |
| 開發伺服器 | uvicorn | `--reload` 開發；生產用 `--workers N` |
| Lint / Format | ruff | 兼任 linter + formatter |
| 測試 | pytest + pytest-asyncio + httpx.AsyncClient | smoke tests |
| 認證 | JWT (HttpOnly Cookie) | 詳見 spec-13 |
| 密碼策略 | **明文存放**（依 P1 決策 Q2-C） | 詳見 spec-13 §3 |

---

## 2. 目錄結構

```
backend/
├── pyproject.toml          # 依賴 + ruff + pytest 設定
├── uv.lock                 # uv 鎖檔
├── Dockerfile              # python:3.12-slim 多階段建構
├── alembic.ini             # Alembic 設定
├── alembic/
│   ├── env.py              # async migration runner
│   └── versions/           # migration 版本檔
└── app/
    ├── __init__.py
    ├── main.py             # FastAPI app + 啟動
    ├── config.py           # pydantic-settings 環境變數讀取
    ├── db/
    │   ├── __init__.py
    │   ├── base.py         # SQLAlchemy DeclarativeBase
    │   ├── session.py      # async engine + sessionmaker
    │   └── models/         # 每張表一個檔
    │       ├── __init__.py # re-export 全部 model
    │       ├── user.py     # User, Teacher, Student
    │       ├── class_.py   # Class
    │       ├── quiz.py     # Quiz, QuizQuestion, QuizOption
    │       ├── scenario.py # ScenarioQuiz, ScenarioQuestion
    │       ├── assignment.py
    │       ├── answer.py   # StudentAnswer, FollowupResult
    │       ├── treatment.py # TreatmentSession, TreatmentMessage
    │       └── cache.py    # AiSummaryCache
    ├── schemas/            # Pydantic schemas（API 輸入輸出）
    │   ├── __init__.py
    │   ├── auth.py
    │   ├── user.py
    │   ├── class_.py
    │   ├── quiz.py
    │   ├── scenario.py
    │   ├── assignment.py
    │   ├── answer.py
    │   └── treatment.py
    ├── auth/
    │   ├── __init__.py
    │   ├── password.py     # plaintext compare（P1）
    │   ├── jwt.py          # 簽發 / 驗證 JWT
    │   └── deps.py         # Depends：get_current_user / require_teacher / require_student
    ├── routers/
    │   ├── __init__.py
    │   ├── auth.py         # /api/auth/login, /logout, /me, /password
    │   ├── students.py     # /api/students/*（含明文密碼端點）
    │   ├── classes.py      # /api/classes/*（P3）
    │   ├── quizzes.py      # /api/quizzes/*（P3）
    │   ├── scenarios.py    # /api/scenarios/*（P3）
    │   ├── assignments.py  # /api/assignments/*（P3）
    │   ├── answers.py      # /api/answers/*（P4）
    │   ├── treatment.py    # /api/treatment/*（P4）
    │   ├── llm.py          # /api/llm/*（P2）
    │   └── ai.py           # /api/ai/*（P2 / P3）
    ├── services/
    │   ├── __init__.py
    │   ├── llm_service.py       # P2
    │   ├── ragflow_service.py   # P2
    │   ├── diagnosis_service.py # P4
    │   └── summary_service.py   # P3
    ├── seed/
    │   ├── __init__.py
    │   └── seed.py         # 把 src/data/*Data.js 轉成 SQL 灌入
    └── tests/
        ├── __init__.py
        ├── conftest.py     # fixture：DB session、test client
        └── test_auth.py    # P1 smoke test
```

**目錄職責邊界**：
- `routers/` 只做 HTTP 介面與 schema 轉換，業務邏輯一律進 `services/`
- `db/models/` 只放 ORM 定義，禁止寫業務邏輯
- `schemas/` 是 API 邊界的 Pydantic 型別，與 `db/models/` 是兩套（防止 ORM 細節漏到 API）

---

## 3. 環境變數

| 變數 | 必填 | 範例 | 說明 |
|------|------|------|------|
| `DATABASE_URL` | 是 | `postgresql+asyncpg://scilens:scilens@postgres:5432/scilens` | asyncpg DSN |
| `JWT_SECRET` | 是 | `（dev 階段隨機 32 字元）` | 簽 JWT 用 |
| `JWT_EXPIRES_HOURS` | 否 | `24` | JWT 有效期，預設 24h |
| `COOKIE_SECURE` | 否 | `false`（dev）/ `true`（prod） | HttpOnly cookie 是否要求 HTTPS |
| `COOKIE_SAMESITE` | 否 | `lax`（dev）/ `strict`（prod） | SameSite 政策 |
| `CORS_ORIGINS` | 否 | `http://localhost:3000` | 逗號分隔；prod 經 nginx 反代可留空 |
| `VLLM_BASE_URL` | P2 起 | `https://vllm-193.hsueh.tw/v1` | 後端呼叫 vLLM |
| `VLLM_MODEL_NAME` | P2 起 | `/models/gemma-4-26B-A4B-it` | 模型名 |
| `VLLM_API_KEY` | P2 起 | `dummy` | vLLM key |
| `RAGFLOW_ENDPOINT` | P2 起 | `https://ragflow-thesisflow.hsueh.tw` | RAGFlow 根 URL |
| `RAGFLOW_AGENT_ID` | P2 起 | `5f5cc79e3afb11f1b0be26501d5adb82` | Agent ID |
| `RAGFLOW_API_KEY` | P2 起 | `ragflow-...` | API key（不加 VITE_ 前綴） |

> **安全性**：所有後端變數**不得**冠上 `VITE_` 前綴。前端只透過後端 API 取得這些服務的回應，原始 endpoint 與 key 永不暴露於瀏覽器。

---

## 4. 啟動與部署

### 4.1 本地開發

```bash
# 在 backend/ 目錄
uv sync                                  # 安裝依賴
uv run alembic upgrade head              # 套用所有 migration
uv run python -m app.seed.seed           # 灌入 mock data（教師 aaa001、三班學生）
uv run uvicorn app.main:app --reload --port 8000
```

### 4.2 Docker compose

新增兩個 service：`postgres`、`backend`。既有 `frontend` service 不動。

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: scilens
      POSTGRES_USER: scilens
      POSTGRES_PASSWORD: scilens
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scilens"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://scilens:scilens@postgres:5432/scilens
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "8000:8000"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - backend
    ports:
      - "3000:80"

volumes:
  pgdata:
```

### 4.3 Container 內啟動順序

`backend` 容器啟動時自動執行：
1. `alembic upgrade head`（套用 migration，缺表自動建）
2. `python -m app.seed.seed --if-empty`（DB 空才灌 seed）
3. `uvicorn app.main:app --host 0.0.0.0 --port 8000`

由 `Dockerfile` CMD 統一封裝，避免人為遺漏。

---

## 5. 與前端的整合

### 5.1 開發階段 (Vite dev server)

- 前端跑在 `http://localhost:3000`
- 後端跑在 `http://localhost:8000`
- 透過 Vite proxy 把 `/api/*` 轉到後端，避免 CORS：

```js
// vite.config.js（P1 會更新）
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
  },
}
```

前端所有 API 呼叫**一律走相對路徑** `/api/...`，dev / prod 共用程式碼。

### 5.2 生產階段 (Nginx)

`nginx.conf` 加 reverse proxy：

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 5.3 認證 cookie

- 後端 `/api/auth/login` 成功後 set HttpOnly cookie：`scilens_session=<JWT>`
- 前端不做任何 token 管理，全靠 cookie 自動帶
- 後端 protected routes 用 `Depends(get_current_user)` 從 cookie 解 JWT

### 5.4 錯誤格式

統一 JSON 錯誤格式：
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "帳號或密碼錯誤",
  "details": {}
}
```

HTTP status code：
- `400`：請求格式錯誤
- `401`：未登入
- `403`：已登入但無權限
- `404`：資源不存在
- `409`：衝突（例如重複建立）
- `422`：Pydantic 驗證失敗（FastAPI 預設）
- `500`：後端內部錯誤

---

## 6. API 路由總覽（依推進階段標註）

| Router | 端點 | 階段 | 描述 |
|--------|------|------|------|
| `auth` | `POST /api/auth/login` | P1 | 帳密登入，回傳 user + set cookie |
| `auth` | `POST /api/auth/logout` | P1 | 清除 cookie |
| `auth` | `GET /api/auth/me` | P1 | 取得當前登入者資料 |
| `auth` | `PATCH /api/auth/password` | P1 | 自己改密碼 |
| `students` | `GET /api/students/{id}` | P1 | 取單一學生（含明文密碼，僅教師） |
| `students` | `POST /api/students/{id}/reset-password` | P1 | 教師重設學生密碼為帳號 |
| `classes` | `GET /api/classes` | P3 ✅ | 教師看自己班級 |
| `classes` | `GET /api/classes/{class_id}` | P3 ✅ | 班級詳情含學生 |
| `classes` | `PUT /api/classes/{class_id}/students` | P3 ✅ | 整批替換學生名冊 |
| `quizzes` | `GET /api/quizzes` / `GET /api/quizzes/{id}` | P3 ✅ | 教師看全部；**學生只看自己班級已被派發的**（透過 Assignment 表過濾） |
| `quizzes` | `POST/PUT/DELETE /api/quizzes[/{id}]` | P3 ✅ | 教師專屬（CRUD） |
| `scenarios` | `GET /api/scenarios` / `GET /api/scenarios/{id}` | P3 ✅ | 教師看全部；**學生只看自己班級已被派發的** |
| `scenarios` | `POST/PUT/DELETE /api/scenarios[/{id}]` | P3 ✅ | 教師專屬（CRUD） |
| `assignments` | `GET /api/assignments` | P3 ✅ | 教師看全部；學生隱式過濾為自己班級。回傳含 **`completionRate / submittedCount / totalStudents`** 即時統計（從 `student_answers` + `students` 表 group by 算出；scenario 則查 `treatment_sessions` status='completed'） |
| `assignments` | `POST/PATCH/DELETE /api/assignments[/{id}]` | P3 ✅ | 教師專屬 |
| `answers` | `POST /api/answers` | P4 ✅ | 學生作答（接收陣列以批次寫入） |
| `answers` | `POST /api/answers/{id}/followup` | P4 ✅ | 追問結果回寫（驅動 statusChange） |
| `answers` | `GET /api/quizzes/{quiz_id}/answers?classId=` | P4 ✅ | 教師查班級作答 |
| `answers` | `GET /api/quizzes/{quiz_id}/stats?classId=` | P4 ✅ | 取代前端 mock `getNodePassRates / getMisconceptionStudents` |
| `answers` | `GET /api/students/{id}/history` | P4 ✅ | 學生作答歷史 |
| `treatment` | `POST /api/treatment/sessions/start` | P4 ✅ | 啟動治療 session |
| `treatment` | `GET /api/treatment/sessions/{id}` | P4 ✅ | 取單一 session（含 messages） |
| `treatment` | `GET /api/treatment/sessions/by-key/{scenario_quiz_id}/{student_id}` | P4 ✅ | 給學生端用 |
| `treatment` | `POST /api/treatment/sessions/{id}/messages` | P4 ✅ | 一輪對話 |
| `treatment` | `PATCH /api/treatment/sessions/{id}/advance` | P4 ✅ | 切下一題 |
| `treatment` | `POST /api/treatment/sessions/{id}/complete` | P4 ✅ | 標記完成 |
| `treatment` | `GET /api/teachers/treatment-logs?classId=&scenarioQuizId=` | P4 ✅ | 教師端列表 |
| `treatment` | `GET /api/teachers/treatment-logs/{session_id}` | P4 ✅ | 教師端詳情 |
| `llm` | `POST /api/llm/chat` | P2 ✅ | vLLM proxy（N3/N4/N5） |
| `llm` | `POST /api/llm/chat/stream` | P2 ✅ | SSE 串流 |
| `ai` | `POST /api/ai/distractor-suggest` | P2 ✅ | RAGFlow（N6） |
| `ai` | `POST /api/ai/grade-summary` | P3 ✅ | RAGFlow（N1） |
| `ai` | `POST /api/ai/class-summary` | P3 ✅ | RAGFlow（N2） |

> P1 端點以外，其餘僅在後端骨架中保留 router 檔（裡面可能只有 `# TODO P2/P3/P4`），不實作。

---

## 7. 推進階段 (P1~P4)

| 階段 | 範圍 | 對應 spec 文件 |
|------|------|----------------|
| **P1** ✅ | 後端骨架、Postgres + Alembic、Auth、Login → cookie、學生明文密碼端點、前端 Login 接後端、AuthContext | spec-10、spec-11、spec-13 |
| **P2** ✅ | LLM proxy（取代前端直呼 vLLM）、RAGFlow N6（出題輔助） | spec-12（新增）、spec-09（更新） |
| **P3** ✅ | classes / quizzes / scenarios / assignments 全部 API 化、N1 + N2 摘要、引入 React Query | spec-04（瘦身）+ spec-12（補完 N1/N2） |
| **P4** ✅ | 學生作答 / 追問 / 治療對話全部 DB 化；N1/N2 後端從 DB 算統計 | spec-04（瘦身）+ spec-12（簡化 N1/N2 schema） |

---

## 8. 與既有 spec 的關係

| 既有 spec | 受影響範圍 |
|-----------|-----------|
| spec-01 系統總覽 | §3.4 後端整合狀態：從「純前端 Mock」改為「FastAPI + PostgreSQL，分 P1~P4 推進」 |
| spec-02 路由 | 新增 `/api/*` 路由群（後端）、前端新增「受保護路由」概念 |
| spec-04 資料模型 | P3 起 AppContext 從 in-memory 改為 fetch + cache；新增 AuthContext |
| spec-05 工作流 | §2.1 認證流程從「假登入」改為「帳密登入後 JWT cookie」 |
| spec-06 部署 | docker-compose 加 postgres + backend，前後端分服務 |
| spec-09 LLM 整合 | P2 起 `src/llm/` 不再直呼 vLLM，改呼叫後端 `/api/llm/*` |

---

## 9. 禁止事項

- 禁止前端直接呼叫 vLLM / RAGFlow（P2 起一律走後端 proxy）
- 禁止把任何後端 secret 加 `VITE_` 前綴
- 禁止在 router 寫業務邏輯（一律進 services/）
- 禁止繞過 Pydantic schema 直接 dump ORM 物件給前端
- 禁止用同步 SQLAlchemy 介面（要 async 全程）
- 禁止把學生明文密碼端點開放給學生角色（僅 require_teacher）
