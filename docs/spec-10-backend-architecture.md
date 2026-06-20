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
    │   ├── treatment.py
    │   └── adaptive.py     # 適性派題相關 schemas
    ├── auth/
    │   ├── __init__.py
    │   ├── password.py     # plaintext compare（P1）
    │   ├── jwt.py          # 簽發 / 驗證 JWT
    │   └── deps.py         # Depends：get_current_user / require_teacher / require_student / require_admin
    ├── routers/
    │   ├── __init__.py
    │   ├── auth.py         # /api/auth/login, /logout, /me, /password
    │   ├── admin_users.py  # /api/admin/users/*（W2，admin 角色專屬）
    │   ├── admin_classes.py # /api/admin/classes/*（W3，跨教師班級總覽）
    │   ├── admin_units.py  # /api/admin/units/*（W4，單元 CRUD）
    │   ├── admin_quizzes.py # /api/admin/quizzes/*（W6，跨教師題組 + 系統範例切換）
    │   ├── admin_knowledge_nodes.py # /api/admin/knowledge-nodes/*（W5a，節點 CRUD + Excel 匯入）
    │   ├── admin_misconceptions.py  # /api/admin/misconceptions/*（W5a，迷思 update/delete）
    │   ├── units.py        # /api/units/*（W4，公開讀，任何登入者）
    │   ├── knowledge_nodes.py       # /api/knowledge-nodes/*（W5a，公開讀，含迷思）
    │   ├── students.py     # /api/students/*（含明文密碼端點）
    │   ├── classes.py      # /api/classes/*（P3）
    │   ├── quizzes.py      # /api/quizzes/*（P3）
    │   ├── scenarios.py    # /api/scenarios/*（已下線；router 註解於 main.py）
    │   ├── assignments.py  # /api/assignments/*（P3）
    │   ├── answers.py      # /api/answers/*（P4）
    │   ├── treatment.py    # /api/treatment/*（已下線；router 註解於 main.py）
    │   ├── llm.py          # /api/llm/*（P2）
    │   ├── ai.py           # /api/ai/*（P2 / P3）
    │   └── adaptive.py     # /api/adaptive/*（適性派題）
    ├── data/
    │   └── knowledge_graph.py  # 12 節點靜態先備圖譜 + BFS + topo sort
    ├── services/
    │   ├── __init__.py
    │   ├── llm_service.py            # P2
    │   ├── ragflow_service.py        # P2
    │   ├── diagnosis_service.py      # P4
    │   ├── summary_service.py        # P3
    │   ├── cause_analysis_service.py # P4
    │   └── adaptive_service.py       # 適性派題（先備精熟度 + 推薦邏輯）
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

### 2.1 services/ 詳細說明

| 服務檔案 | 階段 | 職責 |
|---------|------|------|
| `llm_service.py` | P2 ✅ | 統一 vLLM proxy 接口；內部轉換 prompt 格式、呼叫 vLLM、解析回應 |
| `ragflow_service.py` | P2 ✅ | 統一 RAGFlow proxy 接口；呼叫出題輔助（N6）與摘要（N1/N2）端點 |
| `diagnosis_service.py` | P4 ✅ | 驅動兩階段診斷流程（自動診斷 + 迷思確認）；計算節點通過率、迷思命中學生清單 |
| `stats_service.py` | P4 ✅ | 計算班級統計（節點通過率 / 迷思分佈 / 追問品質）；two-tier 題組的節點通過率以 `quadrant==='TT'` 計算（無 quadrant 的舊資料 fallback `diagnosis`）；額外聚合 `quadrant_stats`（`{ question_id → { TT/TF/FT/FF: count } }`） |
| `summary_service.py` | P3 ✅ | 彙整學生作答 → 生成摘要（呼叫 RAGFlow N1/N2）；快取到 `AiSummaryCache` 表 |
| `cause_analysis_service.py` | P4 ✅ | 分析學生迷思成因（透過 LLM）；接收追問對話日誌、迷思資訊與 8 個成因分類，產生 structured prompt，呼叫 LLM 取得分析，解析 JSON 回應提取成因 ID；LLM 不可用時優雅回傳空清單 |
| `adaptive_service.py` | ✅ | 適性派題服務；根據學生歷史作答計算各節點精熟度，結合知識圖譜先備關係產生先備狀態報告與適性推薦（詳見 §10） |

### 2.2 data/ 詳細說明

| 資料模組 | 說明 |
|---------|------|
| `knowledge_graph.py` | 靜態知識節點先備圖譜（鏡射前端 `src/data/knowledgeGraph.js`）；包含 12 節點定義（`NODES` dict）、BFS 遞移先備查詢 `get_all_prerequisites()`、Kahn's algorithm 拓撲排序 `topo_sort()` |

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
| `LLM_PRIMARY` | 否 | `openai` | LLM 主供應商（`openai`\|`vllm`） |
| `LLM_FALLBACK_ENABLED` | 否 | `true` | 主供應商失敗時自動改用另一個 |
| `OPENAI_BASE_URL` | 否 | `https://api.openai.com/v1` | OpenAI 相容根 URL |
| `OPENAI_MODEL_NAME` | 否 | `gpt-5-mini` | 主模型名 |
| `OPENAI_API_KEY_FILE` | 否 | `/run/secrets/openai_api_key` | **機密檔路徑**；key 不走 env（見下） |
| `OPENAI_API_KEY` | 否 | `（空）` | 僅本機非 docker 開發退路；正式環境用機密檔 |
| `OPENAI_PARAM_STYLE` | 否 | `reasoning` | `reasoning`(gpt-5*)\|`legacy`(gpt-4o 等) |
| `OPENAI_REASONING_EFFORT` | 否 | `minimal` | minimal\|low\|medium\|high |
| `OPENAI_MIN_COMPLETION_TOKENS` | 否 | `1024` | reasoning 模型輸出 token 下限 |
| `VLLM_BASE_URL` | P2 起 | `https://vllm-193.hsueh.tw/v1` | 備援：後端呼叫 vLLM |
| `VLLM_MODEL_NAME` | P2 起 | `/models/gemma-4-26B-A4B-it` | 模型名 |
| `VLLM_API_KEY` | P2 起 | `dummy` | vLLM key |
| `RAGFLOW_ENDPOINT` | P2 起 | `https://ragflow-thesisflow.hsueh.tw` | RAGFlow 根 URL |
| `RAGFLOW_AGENT_ID` | P2 起 | `5f5cc79e3afb11f1b0be26501d5adb82` | Agent ID |
| `RAGFLOW_API_KEY` | P2 起 | `ragflow-...` | API key（不加 VITE_ 前綴） |

> **安全性**：所有後端變數**不得**冠上 `VITE_` 前綴。前端只透過後端 API 取得這些服務的回應，原始 endpoint 與 key 永不暴露於瀏覽器。
>
> **OpenAI key 不走環境變數**：key 以 docker secret 檔案掛載到 `/run/secrets/openai_api_key`，由 `OPENAI_API_KEY_FILE` 指向；`settings.openai_api_key` 優先讀檔。避免 token 經 env（`/proc`、log、錯誤堆疊）外洩。建立方式見 spec-09 §7.3。

---

## 4. 啟動與部署

### 4.1 本地開發

```bash
# 在 backend/ 目錄
uv sync                                  # 安裝依賴
uv run alembic upgrade head              # 套用所有 migration
uv run python -m app.seed.seed           # 灌入 mock data（教師 aaa001 demo + bbb001 黃老師空白、三班學生）
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
| `admin` | `GET /api/admin/users` | W2 | 帳號列表（admin 專屬，支援 role / q / active 篩選） |
| `admin` | `GET /api/admin/users/{id}` | W2 | 單一帳號詳情（含明文密碼） |
| `admin` | `POST /api/admin/users` | W2 | 新增教師（account + name；密碼預設＝帳號） |
| `admin` | `PATCH /api/admin/users/{id}/disable` | W2 | 停用帳號（記錄 disabled_at / disabled_by；不可停用 admin） |
| `admin` | `PATCH /api/admin/users/{id}/enable` | W2 | 啟用帳號 |
| `admin` | `POST /api/admin/users/{id}/reset-password` | W2 | 重設密碼為帳號 |
| `admin` | `GET /api/admin/classes` | W3 | 跨教師班級總覽（支援 teacher_id / school_year / semester / status 篩選） |
| `admin` | `GET /api/admin/classes/{id}` | W3 | 班級詳情（admin 不受 teacher_id 隔離） |
| `admin` | `GET /api/admin/classes/{id}/teacher` | W3 | 取得班級所屬教師（id / account / name） |
| `classes` | `POST /api/classes/{id}/students/import-excel/preview` | W3 | Dry-run：解析 .xlsx 並回傳預覽（不寫 DB） |
| `classes` | `POST /api/classes/{id}/students/import-excel` | W3 | 從 .xlsx 匯入學生名冊（**僅空班可用**，否則 409 CLASS_NOT_EMPTY） |
| `admin` | `GET /api/admin/units` | W4 | 單元列表（admin 可看全部含封存）；每個 `UnitBrief` 內嵌 `parentNodes` 摘要（精簡大節點，依 sort_order；一支 JOIN 一次撈齊，供清單列顯示用） |
| `admin` | `POST /api/admin/units` | W4 | 新增單元（自動 slug；UNIT_CODE_EXISTS 防重複） |
| `admin` | `PATCH /api/admin/units/{id}` | W4 | 編輯單元名稱 / 年段 / 簡介 / 排序 |
| `admin` | `POST /api/admin/units/{id}/archive\|unarchive` | W4 | 封存／啟用（系統內建單元 409 `UNIT_IS_SYSTEM_CURRENT`） |
| `admin` | `DELETE /api/admin/units/{id}` | W4 | 永久刪除（系統內建單元 409） |
| `admin` | `GET /api/admin/units/{id}/parent-nodes` | ✅ 2026-05-29 | 列出本教學單元附掛的大節點（依 sort_order；含次主題名稱方便 UI 顯示） |
| `admin` | `POST /api/admin/units/{id}/parent-nodes` | ✅ 2026-05-29 | 批次新增 `{ parentNodeIds: [...] }`；idempotent，已存在的略過；不存在的 id 回 404 `PARENT_NODE_NOT_FOUND:...` |
| `admin` | `DELETE /api/admin/units/{id}/parent-nodes/{parentNodeId}` | ✅ 2026-05-29 | 解除單一綁定；找不到視為成功（idempotent） |
| `admin` | `PUT /api/admin/units/{id}/parent-nodes/reorder` | ✅ 2026-05-29 | 批次重排 `{ parentNodeIds: [...] }`；未列出的維持原相對順序排在後面 |
| `units` | `GET /api/units` | W4（2026-06-05 補 `parentNodes`） | 公開讀（任何登入者）：給教師端題組選擇器、學生端首頁分區用。支援 `?type=unit` 只取教學單元。每個 `UnitBrief` 內嵌 `parentNodes`（`unit_parent_nodes` JOIN，與 admin 端一致）——教師端出題選教學單元後靠此反查知識節點（`parentNodeId`），因 `knowledge_nodes.unit_id` 指向次主題而非教學單元 |
| `admin` | `GET /api/admin/knowledge-nodes` | W5a | 節點列表（依 unitId / unassigned / gradeBand 篩選；含迷思） |
| `admin` | `GET /api/admin/knowledge-nodes/{id}` | W5a | 單一節點詳情 |
| `admin` | `POST /api/admin/knowledge-nodes` | W5a | 新增節點 |
| `admin` | `PATCH /api/admin/knowledge-nodes/{id}` | W5a | 編輯節點（含 prerequisites） |
| `admin` | `DELETE /api/admin/knowledge-nodes/{id}` | W5a | 刪除節點（系統 seed 回 409） |
| `admin` | `POST /api/admin/knowledge-nodes/bulk-positions` | W5a | 批次儲存畫布座標（拖曳結束 debounced 呼叫） |
| `admin` | `POST /api/admin/knowledge-nodes/bulk-assign-unit` | W5a | 批次指派節點到單元（未分配池用） |
| `admin` | `POST /api/admin/knowledge-nodes/bulk-set-canvas` | W5c | 批次加入畫布 / 移回節點庫（onCanvas=true/false） |
| `admin` | `GET/POST/PATCH/DELETE /api/admin/parent-nodes` | W7a | 大節點 CRUD（unit_id / code / name / display_order / prerequisites） |
| `admin` | `POST /api/admin/parent-nodes/bulk-reorder` | W7a | 批次更新 display_order（拖曳排序） |
| `parent-nodes` | `GET /api/parent-nodes?unitId=...` | W7a | 公開讀；給三欄式 UI / 未來教師端用 |
| `admin` | `POST /api/admin/units/import-docx/preview` | W7b | Dry-run 解析 .docx 或 .zip（含多個 docx），回傳階層 |
| `admin` | `POST /api/admin/units/import-docx` | W7b | 寫入 DB；mode=merge / skip / create；自動 attach 既有未分配節點；**不建立空殼大節點**（某大節點的小節點全已屬其他單元時略過，避免同代碼重複，回傳 `shellsSkipped` 計數） |
| `admin` | `GET /api/admin/knowledge-nodes?onCanvas=true\|false` | W5c | 新增 query：篩選畫布上的或節點庫內的節點 |
| `admin` | `POST /api/admin/knowledge-nodes/import-excel/preview` | W5a | Excel dry-run 預覽 |
| `admin` | `POST /api/admin/knowledge-nodes/import-excel` | W5a | Excel 正式匯入（全部進未分配池） |
| `admin` | `POST /api/admin/knowledge-nodes/{nodeId}/misconceptions` | W5a | 新增迷思 |
| `admin` | `PATCH/DELETE /api/admin/misconceptions/{id}` | W5a | 編輯 / 刪除迷思 |
| `knowledge-nodes` | `GET /api/knowledge-nodes` | W5a→W5b | W5b 起改為**完全公開讀**：給教師端 / 學生端，前端 main.jsx 在 boot 階段拉取 |
| `admin` | `GET /api/admin/quizzes` | W6 | 跨教師題組列表（含 owner 姓名） |
| `admin` | `PATCH /api/admin/quizzes/{id}/sample` | W6 | 切換 is_sample 旗標 |
| `quizzes` | `GET /api/quizzes` (modified) | W6 | response 加 `isSample` / `createdBy` 兩欄 |
| `students` | `GET /api/students/{id}` | P1 | 取單一學生（含明文密碼，僅教師；**僅該教師班級內的學生**） |
| `students` | `POST /api/students/{id}/reset-password` | P1 | 教師重設學生密碼為帳號（僅自己班級的學生） |
| `classes` | `GET /api/classes` | P3 ✅ | **教師範圍隔離**：只回傳 `teacher_id == current_teacher.id` 的班級 |
| `classes` | `POST /api/classes` | ✅ | 教師建立空班；server 自動產生 id；新建班級的 `teacher_id` = 建立者 |
| `classes` | `PATCH /api/classes/{class_id}` | ✅ | 教師編輯班級資訊（name/grade/subject/color/textColor/note/schoolYear/semester/**categoryId** 部分更新；非自己班級回 404；`categoryId` 不屬於該教師回 404 `CATEGORY_NOT_FOUND`） |
| `class-categories` | `GET /api/class-categories` | ✅ | 教師私有：列出自訂分類（依 sort_order） |
| `class-categories` | `POST /api/class-categories` | ✅ | 新增分類 `{ name }`；重名回 409 `DUPLICATE_NAME` |
| `class-categories` | `PATCH /api/class-categories/{id}` | ✅ | 改名 |
| `class-categories` | `DELETE /api/class-categories/{id}` | ✅ | 刪除；該分類下班級的 `category_id` 經 FK `ON DELETE SET NULL` 自動回到「未分類」 |
| `class-categories` | `PUT /api/class-categories/reorder` | ✅ | 批次重排，body `{ ids: [...] }`；未列出的維持原相對順序排在後面 |
| `classes` | `GET /api/classes/{class_id}` | P3 ✅ | 班級詳情含學生（非自己班級回 404） |
| `classes` | `PUT /api/classes/{class_id}/students` | P3 ✅ | 整批替換學生名冊（非自己班級回 404） |
| `quizzes` | `GET /api/quizzes` / `GET /api/quizzes/{id}` | P3 ✅ | 教師看全部；**學生只看自己班級已被派發的**（透過 Assignment 表過濾） |
| `quizzes` | `POST/PUT/DELETE /api/quizzes[/{id}]` | P3 ✅ | 教師專屬（CRUD）；**PUT 採 smart upsert**（match by `order_index` 在原 `quiz_questions.id` 上 in-place UPDATE，保持題序穩定讓既有作答對齊）；刪除題目前以 `(assignment.quiz_id, order_index)` 反查、有作答則回 409 `QUESTION_HAS_ANSWERS`（`student_answers.question_id` 存題序 order_index、非 FK；spec-11 §3.11） |
| `scenarios` | `GET /api/scenarios` / `GET /api/scenarios/{id}` | **已下線（router 註解於 main.py）** | 概念釐清模組已從實驗系統移除；router 實作檔仍保留 |
| `scenarios` | `POST/PUT/DELETE /api/scenarios[/{id}]` | **已下線（router 註解於 main.py）** | 同上 |
| `assignments` | `GET /api/assignments` | P3 ✅ | **教師範圍隔離**：教師只看 `class_id` 屬於自己班級的派題；學生隱式過濾為自己班級。回傳含 **`completionRate / submittedCount / totalStudents`** 即時統計；對學生身份額外回傳 **`myDiagnosisCompleted`**（該生是否**答完該題組所有題目、且每一題追問對話都已結束**＝該題有對應 `followup_results`；只答一半中途離開 → `false`，視為未完成、留在待完成區），用於學生首頁判斷任務是否做完，跨刷新仍正確 |
| `assignments` | `POST/PATCH/DELETE /api/assignments[/{id}]` | P3 ✅ | 教師專屬；POST/PATCH 寫入前驗證 `class_id` 屬於自己 |
| `answers` | `POST /api/answers` | P4 ✅ | 學生作答（接收陣列以批次寫入）；two-tier 題每筆含 `reason_tag` + `quadrant` |
| `answers` | `POST /api/answers/{id}/followup` | P4 ✅ | 追問結果回寫（驅動 statusChange） |
| `answers` | `GET /api/quizzes/{quiz_id}/answers?classId=` | P4 ✅ | 教師查班級作答；two-tier 額外回傳每筆的 `reasonTag` + `quadrant`（含於 `StudentQuestionResult.selectedReasonContent` / `quadrant`） |
| `answers` | `GET /api/quizzes/{quiz_id}/followups?classId=` | P4 ✅ | 教師查該班完整 N3 追問對話紀錄（含 `conversationLog / aiSummary / finalStatus / misconceptionCode / reasoningQuality / statusChange`），給單班報告底部「學生第二層追問對話完整紀錄」區塊使用 |
| `answers` | `GET /api/quizzes/{quiz_id}/stats?classId=` | P4 ✅ | 取代前端 mock `getNodePassRates / getMisconceptionStudents`；two-tier 額外回傳 `quadrantStats`（`{ [questionId]: { TT, TF, FT, FF } }`）與 `mode`；節點通過率改用 `quadrant==='TT'`（無 quadrant 的舊資料 fallback `diagnosis`） |
| `answers` | `GET /api/students/{id}/history` | P4 ✅ | 學生作答歷史；每筆額外回傳 `causeIdsByMisconception`、`errorTypeByMisconception`、`aiSummaryByMisconception`、`statusChangeByMisconception`、`quoteByMisconception`（皆 `{misconceptionCode: ...}`），讓學生診斷報告在 in-memory 快照失效（重新登入/重整/切換分頁）後仍能還原成因徽章、錯誤類別、「給你的話」(aiSummary)、想法轉變標記與「你在對話中提到」引用。`quoteByMisconception` 由後端從 `conversation_log` 依與前端 `getStudentQuote` 相同規則挑出（學生發言 role 同時支援 `student`/`user`）。**所有 `*ByMisconception` map 一律以該題 `answer.diagnosis`（報告迷思卡使用的碼）為 key，掛上該題自己 followup 的產出**——不以 `followup.misconception_code`（LLM 結論碼）為 key，因兩者在部分資料不一致會導致卡片查不到。另回傳 `questionResults`（`{questionId, nodeId, stem, selectedOptionContent, selectedTag, diagnosis, isCorrect}[]`）供報告「每一題的結果」逐題呈現。**`questionId` 為卷內題序（order_index），題組由 assignment 判定**（`StudentAnswer.question_id` 是卷序非全域 PK，見 spec-11 §3.11）；builder 以 `order_index → 該題組 QuizQuestion` 補上 `nodeId / stem / selectedOptionContent`，讓**前端不依賴 mock `getQuizQuestions` 即可渲染任何真實教師題組**（節點由全域 `/api/knowledge-nodes` 以 nodeId 查 studentHint/迷思）。同題多筆作答取 `answered_at` 最新一筆。**同一題若有多筆作答（同份題組重複施測，如同一學生在 assign-001 與 assign-004 各做一次 quiz-001），builder 以 `answered_at` 取每題最新一筆**，避免題數/對錯數被重複列灌水 |
| `treatment` | `POST /api/treatment/sessions/start` | **已下線（router 註解於 main.py）** | 概念釐清模組已從實驗系統移除；router 實作檔仍保留 |
| `treatment` | `GET /api/treatment/sessions/{id}` | **已下線（router 註解於 main.py）** | 同上 |
| `treatment` | `GET /api/treatment/sessions/by-key/{scenario_quiz_id}/{student_id}` | **已下線（router 註解於 main.py）** | 同上 |
| `treatment` | `POST /api/treatment/sessions/{id}/messages` | **已下線（router 註解於 main.py）** | 同上 |
| `treatment` | `PATCH /api/treatment/sessions/{id}/advance` | **已下線（router 註解於 main.py）** | 同上 |
| `treatment` | `POST /api/treatment/sessions/{id}/complete` | **已下線（router 註解於 main.py）** | 同上 |
| `treatment` | `GET /api/teachers/treatment-logs?classId=&scenarioQuizId=` | **已下線（router 註解於 main.py）** | 同上 |
| `treatment` | `GET /api/teachers/treatment-logs/{session_id}` | **已下線（router 註解於 main.py）** | 同上 |
| `llm` | `POST /api/llm/chat` | P2 ✅ | vLLM proxy（N3 診斷追問） |
| `llm` | `POST /api/llm/chat/stream` | P2 ✅ | SSE 串流 |
| `ai` | `POST /api/ai/distractor-suggest` | P2 ✅ | RAGFlow（N6） |
| `ai` | `POST /api/ai/grade-summary` | P3 ✅ | RAGFlow（N1） |
| `ai` | `POST /api/ai/class-summary` | P3 ✅ | RAGFlow（N2） |
| `misconceptions` | `GET /api/misconceptions/custom` | ✅ | **教師私有**：列出該老師自訂迷思（spec-04 §2.5.1） |
| `misconceptions` | `POST /api/misconceptions/custom` | ✅ | 新增自訂迷思（`teacher_id` 由 cookie 帶入；驗證 `nodeId` ∈ 12 節點） |
| `misconceptions` | `DELETE /api/misconceptions/custom/{id}` | ✅ | 只能刪自己的；他人/不存在皆回 404，避免列舉攻擊 |
| `adaptive` | `GET /api/adaptive/prerequisite-status` | ✅ | 查詢班級學生對目標節點的先備精熟狀態（詳見 §10） |
| `adaptive` | `GET /api/adaptive/recommend` | ✅ | 產生 per-student 適性派題推薦（diagnosis / review 兩種模式） |
| `adaptive` | `GET /api/adaptive/sorted-nodes` | ✅ | 依先備關係拓撲排序指定節點 |
| `adaptive` | `POST /api/adaptive/polish-stem` | ✅ | AI 潤飾題幹（透過 vLLM proxy） |
| `adaptive` | `POST /api/adaptive/suggest-options` | ✅ | AI 產生 4 選項（1 正確 + 3 干擾，透過 vLLM proxy） |

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

## 10. 適性派題模組（Adaptive Dispatching）

教師派題前，系統可依據學生歷史作答自動判斷先備知識精熟度，並推薦適合每位學生的診斷/複習節點。

### 10.1 知識圖譜資料模組

**檔案**：`backend/app/data/knowledge_graph.py`

靜態 Python dict `NODES`，鏡射前端 `src/data/knowledgeGraph.js`，包含 12 個知識節點及其先備關係：

- 子主題 A（水溶液中的變化）：`INe-Ⅱ-3-01` → `02` → `03` → `05` → `04`（5 節點）
- 子主題 B（酸鹼反應）：`INe-Ⅲ-5-1` → `2` → `3` → `4` → [`5`, `6` 平行] → `7`（7 節點）

每個節點包含 `name`（節點名稱）、`level`（層級深度）、`subtopic`（A/B）、`prerequisites`（直接先備 ID 陣列）。

提供兩個工具函式：

| 函式 | 說明 |
|------|------|
| `get_all_prerequisites(node_id)` | BFS 遞移查詢：回傳該節點所有先備節點（由根到近），不含自身 |
| `topo_sort(node_ids)` | Kahn's algorithm 拓撲排序：依先備關係排序給定的節點子集；同層級以 (subtopic, level, id) 排序確保結果確定性 |

### 10.2 適性派題服務

**檔案**：`backend/app/services/adaptive_service.py`

#### 核心邏輯

1. **精熟度計算** `_student_node_mastery(db, student_id)`：join `StudentAnswer` + `QuizQuestion`，回傳 `{nodeId: {total, correct}}`。精熟百分比 = `correct / total * 100`，四捨五入。
2. **精熟閾值**（threshold）預設 70%，可由查詢參數覆寫。`total == 0`（無作答紀錄）視為未精熟。

#### 先備狀態報告

`get_class_prerequisite_status(db, class_id, target_node_ids, threshold)` → 回傳全班每位學生的先備精熟狀態：

- 蒐集目標節點的所有遞移先備（不含目標自身）
- 對每位學生逐一檢查各先備節點的精熟度
- 產出：`ready`（全部先備精熟）、`weak_nodes`（未達標先備清單）、每個先備的 `mastered / mastery_pct / missing`

#### 適性推薦

`get_adaptive_recommendations(db, class_id, target_node_ids, mode, threshold)` → 兩種派題模式：

| 模式 | 策略 |
|------|------|
| `diagnosis`（診斷） | 依拓撲序檢查目標節點；遇到未達標節點時**向上溯源**到未精熟的先備，插入推薦清單頭部；一旦某個先備未通過，停止派發更下游的目標節點（`skip`） |
| `review`（複習） | 蒐集所有先備 + 目標節點的完整鏈，從最基礎的先備開始，推薦所有未達標節點 |

### 10.3 適性派題端點

**Router**：`backend/app/routers/adaptive.py`，掛載於 `/api/adaptive/`

所有端點皆需 `require_teacher`。

| 端點 | 方法 | 查詢參數 | 說明 |
|------|------|---------|------|
| `/api/adaptive/prerequisite-status` | GET | `classId`, `nodeIds`（逗號分隔）, `threshold`（預設 70） | 回傳全班先備精熟狀態報告 |
| `/api/adaptive/recommend` | GET | `classId`, `nodeIds`, `mode`（diagnosis/review）, `threshold` | 回傳 per-student 推薦/跳過節點清單與原因說明 |
| `/api/adaptive/sorted-nodes` | GET | `nodeIds` | 回傳拓撲排序後的節點 ID + 節點名稱/層級資訊 |
| `/api/adaptive/polish-stem` | POST | Body: `{stem, nodeId, nodeName}` | AI 潤飾題幹（詳見 spec-09 §14.1） |
| `/api/adaptive/suggest-options` | POST | Body: `{stem, nodeId, nodeName, misconceptions[]}` | AI 產生 4 選項（詳見 spec-09 §14.2） |

### 10.4 Pydantic Schemas

**檔案**：`backend/app/schemas/adaptive.py`

| Schema | 用途 |
|--------|------|
| `NodeMastery` | 單一節點精熟度（nodeId, nodeName, level, totalQuestions, correctCount, masteryPct） |
| `PrerequisiteStatus` | 先備節點狀態（nodeId, nodeName, mastered, masteryPct, missing） |
| `StudentPrerequisiteReport` | 單一學生的先備報告（studentId, studentName, seat, ready, prerequisites[], weakNodes[]） |
| `ClassPrerequisiteResponse` | prerequisite-status 端點回應（classId, targetNodeIds, masteryThreshold, students[]） |
| `AdaptiveRecommendation` | 單一學生的推薦（studentId, studentName, seat, recommendedNodeIds[], skipNodeIds[], reason） |
| `AdaptiveRecommendResponse` | recommend 端點回應（classId, mode, sortedNodeIds, students[]） |
| `PolishStemRequest` / `PolishStemResponse` | AI 潤飾題幹（request: stem + nodeId + nodeName；response: polished） |
| `SuggestOptionsRequest` / `SuggestOptionsResponse` | AI 產生選項（request: stem + nodeId + nodeName + misconceptions[]；response: options[]） |
| `SuggestedOption` | 單一選項（tag: A/B/C/D, content, diagnosis） |

---

## 9. 禁止事項

- 禁止前端直接呼叫 vLLM / RAGFlow（P2 起一律走後端 proxy）
- 禁止把任何後端 secret 加 `VITE_` 前綴
- 禁止在 router 寫業務邏輯（一律進 services/）
- 禁止繞過 Pydantic schema 直接 dump ORM 物件給前端
- 禁止用同步 SQLAlchemy 介面（要 async 全程）
- 禁止把學生明文密碼端點開放給學生角色（僅 require_teacher）
