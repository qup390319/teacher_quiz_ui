"""
Export backend + DB plan as a reviewable PDF.
Uses Microsoft JhengHei (msjh.ttc) for Traditional Chinese rendering.
Output: docs/backend-plan.pdf
"""
import os
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# --- Font registration -------------------------------------------------------
FONT_DIR = "C:/Windows/Fonts"
try:
    pdfmetrics.registerFont(TTFont("CJK", f"{FONT_DIR}/msjh.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont("CJK-Bold", f"{FONT_DIR}/msjhbd.ttc", subfontIndex=0))
    print("[font] using Microsoft JhengHei")
except Exception as e:
    print(f"[font] msjh.ttc failed ({e}), trying mingliu.ttc")
    pdfmetrics.registerFont(TTFont("CJK", f"{FONT_DIR}/mingliu.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont("CJK-Bold", f"{FONT_DIR}/mingliub.ttc", subfontIndex=0))

CJK = "CJK"
CJK_B = "CJK-Bold"

# --- Styles ------------------------------------------------------------------
ss = getSampleStyleSheet()

S_TITLE = ParagraphStyle(
    "Title", parent=ss["Title"], fontName=CJK_B, fontSize=22,
    leading=28, alignment=TA_CENTER, spaceAfter=6,
)
S_SUBTITLE = ParagraphStyle(
    "Subtitle", parent=ss["Normal"], fontName=CJK, fontSize=10,
    leading=14, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=18,
)
S_H1 = ParagraphStyle(
    "H1", parent=ss["Heading1"], fontName=CJK_B, fontSize=16,
    leading=22, spaceBefore=18, spaceAfter=8, textColor=colors.HexColor("#1f3a5f"),
)
S_H2 = ParagraphStyle(
    "H2", parent=ss["Heading2"], fontName=CJK_B, fontSize=13,
    leading=18, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor("#2d5a8a"),
)
S_BODY = ParagraphStyle(
    "Body", parent=ss["Normal"], fontName=CJK, fontSize=10,
    leading=16, spaceAfter=4, alignment=TA_LEFT,
)
S_BULLET = ParagraphStyle(
    "Bullet", parent=S_BODY, leftIndent=14, bulletIndent=2,
)
S_CODE = ParagraphStyle(
    "Code", parent=ss["Code"], fontName=CJK, fontSize=8.5,
    leading=12, leftIndent=8, backColor=colors.HexColor("#f4f5f7"),
    borderColor=colors.HexColor("#dfe2e6"), borderWidth=0.5, borderPadding=6,
    spaceAfter=8,
)
S_CALLOUT = ParagraphStyle(
    "Callout", parent=S_BODY, leftIndent=10, rightIndent=10,
    backColor=colors.HexColor("#fff8e1"), borderColor=colors.HexColor("#f0c419"),
    borderWidth=1, borderPadding=10, spaceBefore=6, spaceAfter=10,
)
S_CONFIRM = ParagraphStyle(
    "Confirm", parent=S_BODY, leftIndent=10, rightIndent=10,
    backColor=colors.HexColor("#fde4e4"), borderColor=colors.HexColor("#d9534f"),
    borderWidth=1, borderPadding=10, spaceBefore=6, spaceAfter=10,
    fontSize=10.5, leading=17,
)


def P(text, style=S_BODY):
    return Paragraph(text, style)


def H1(text):
    return Paragraph(text, S_H1)


def H2(text):
    return Paragraph(text, S_H2)


def code(text):
    return Preformatted(text, S_CODE)


def make_table(data, col_widths, header=True, font_size=9):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("FONT", (0, 0), (-1, -1), CJK, font_size),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#bbbbbb")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style += [
            ("FONT", (0, 0), (-1, 0), CJK_B, font_size),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ]
    t.setStyle(TableStyle(style))
    return t


# --- Output path -------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
out_path = os.path.join(ROOT, "docs", "backend-plan.pdf")

doc = SimpleDocTemplate(
    out_path, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm,
    topMargin=2 * cm, bottomMargin=2 * cm,
    title="SciLens 後端 + DB 計畫", author="SciLens",
)

story = []

# ===== Cover =================================================================
story.append(Paragraph("SciLens 後端 + 資料庫 計畫", S_TITLE))
story.append(Paragraph(
    "FastAPI &nbsp;|&nbsp; PostgreSQL &nbsp;|&nbsp; RAGFlow &nbsp;|&nbsp; vLLM Proxy &nbsp;|&nbsp; 漸進式 4 階段推進",
    S_SUBTITLE,
))
story.append(P(
    "本文件整理本次討論決定的後端與資料庫設計，並列出推進 P1 之前需要你確認的 3 件事。"
    "請先看完文件最後一頁的「需要你確認」章節，回覆後即可動工。", S_BODY,
))

# ===== 1. 整體技術選擇 ========================================================
story.append(H1("1. 整體技術選擇"))
tech_data = [
    ["類別", "方案", "理由"],
    ["後端框架", "FastAPI（Python 3.12）",
     "async 原生、Pydantic 整合、auto OpenAPI、與 RAGFlow 同生態"],
    ["資料驗證", "Pydantic v2", "FastAPI 內建，型別嚴謹"],
    ["ORM", "SQLAlchemy 2.0（async）+ Alembic（migration）",
     "Python 業界標準、async 完整"],
    ["DB driver", "asyncpg", "高效能 async PostgreSQL driver"],
    ["資料庫", "PostgreSQL 16",
     "JSONB 直接塞對話、未來可加 pgvector"],
    ["認證", "JWT (HttpOnly Cookie)；密碼以 argon2-cffi hash",
     "argon2 比 bcrypt 更現代、抗 GPU 暴破"],
    ["外部 HTTP", "httpx (AsyncClient)",
     "給 vLLM / RAGFlow 用，async 友善"],
    ["套件管理", "uv（推薦）或 pip + requirements.txt",
     "uv 比 pip 快 10x、鎖檔清楚"],
    ["開發伺服器", "uvicorn + --reload", "FastAPI 標配"],
    ["部署", "既有 docker-compose 加 backend / postgres 兩個 service",
     "不動既有架構"],
    ["LLM 呼叫", "後端 proxy 給 vLLM；前端 src/llm/ 改成呼叫後端",
     "配合「全走後端 proxy」的決策"],
    ["RAGFlow", "後端代理呼叫，key 不暴露給瀏覽器",
     "安全、可加快取"],
]
story.append(make_table(tech_data, col_widths=[3 * cm, 5.5 * cm, 8 * cm]))

# ===== 2. 後端目錄結構 =======================================================
story.append(H1("2. 後端目錄結構"))
story.append(code("""backend/
├── pyproject.toml                 # 依賴與 ruff / pytest 設定
├── uv.lock                        # 依賴鎖檔
├── Dockerfile
├── alembic.ini
├── alembic/
│   └── versions/                  # migration 檔
└── app/
    ├── main.py                    # FastAPI app 啟動點
    ├── config.py                  # 環境變數讀取（pydantic-settings）
    ├── db/
    │   ├── base.py                # SQLAlchemy Base
    │   ├── session.py             # async session 工廠
    │   └── models/                # SQLAlchemy ORM models
    │       ├── user.py
    │       ├── class_.py
    │       ├── quiz.py
    │       ├── scenario.py
    │       ├── assignment.py
    │       ├── answer.py
    │       └── treatment.py
    ├── schemas/                   # Pydantic schemas（API 輸入輸出）
    ├── auth/
    │   ├── jwt.py                 # JWT 簽發 / 驗證
    │   ├── password.py            # argon2 hash / verify
    │   └── deps.py                # FastAPI Depends：當前使用者
    ├── routers/
    │   ├── auth.py                # /api/auth/login, /logout, /me
    │   ├── classes.py             # /api/classes/*
    │   ├── students.py            # /api/students/*
    │   ├── quizzes.py             # /api/quizzes/*
    │   ├── scenarios.py           # /api/scenarios/*
    │   ├── assignments.py         # /api/assignments/*
    │   ├── answers.py             # /api/answers/*
    │   ├── treatment.py           # /api/treatment/*
    │   ├── llm.py                 # /api/llm/*（N3/N4/N5 走 vLLM proxy）
    │   └── ai.py                  # /api/ai/*（N1/N2/N6 走 RAGFlow）
    ├── services/
    │   ├── llm_service.py         # vLLM chat / chatStream（httpx）
    │   ├── ragflow_service.py     # RAGFlow Agent converse 呼叫
    │   ├── diagnosis_service.py   # 學生作答 → 診斷邏輯
    │   └── summary_service.py     # N1/N2 摘要組裝
    ├── seed/
    │   └── seed.py                # 把現有 mock data 灌進 DB
    └── tests/"""))

# ===== 3. DB Schema ==========================================================
story.append(H1("3. 資料庫 Schema（11 張表）"))
story.append(P(
    "下列為 PostgreSQL 表格摘要。實際欄位型別 / 預設值 / 約束會在 P1 階段於 "
    "spec-11-database-schema.md 中完整定義。", S_BODY,
))
story.append(code("""users (id, account [unique], password_hash, role 'teacher'|'student',
       password_was_default, created_at, updated_at)

teachers (user_id PK FK→users, name)

classes (id, name, grade, subject, color, text_color, created_at)

students (user_id PK FK→users, name, seat, class_id FK→classes)

quizzes (id, title, status 'draft'|'published', created_by FK→teachers,
         knowledge_node_ids text[], created_at, updated_at)

quiz_questions (id, quiz_id FK, stem, knowledge_node_id, order_index)

quiz_options (id, question_id FK, tag 'A'|'B'|'C'|'D', content, diagnosis)

scenario_quizzes (id, title, status, target_node_id, target_misconceptions text[],
                  created_by FK→teachers, created_at, updated_at)

scenario_questions (id, scenario_quiz_id FK, order_index, scenario_text,
                    scenario_images jsonb, scenario_image_zoomable,
                    initial_message, expert_model, target_misconceptions text[])

assignments (id, type 'diagnosis'|'scenario',
             quiz_id FK?, scenario_quiz_id FK?, class_id FK,
             assigned_at, due_date, status 'active'|'completed', created_at)

student_answers (id, assignment_id FK, student_id FK, question_id FK,
                 selected_tag, diagnosis, answered_at)

followup_results (id, student_answer_id FK [unique],
                  conversation_log jsonb,    -- 完整追問對話
                  final_status, reasoning_quality,
                  status_change jsonb, ai_summary,
                  created_at)

treatment_sessions (id, scenario_quiz_id FK, student_id FK,
                    status, current_question_index,
                    started_at, completed_at)

treatment_messages (id, session_id FK, question_index, role 'ai'|'student',
                    text, phase, stage, step, hint_level, feedback,
                    requires_restatement, created_at)

ai_summary_cache (id, scope 'grade'|'class', scope_id, quiz_id FK,
                  payload jsonb, citations jsonb, generated_at, expires_at)"""))

story.append(H2("索引（P1 migration 加入）"))
idx_data = [
    ["索引", "用途"],
    ["users(account) UNIQUE", "登入查詢"],
    ["assignments(class_id, due_date)", "班級任務列表查詢"],
    ["student_answers(assignment_id, student_id) UNIQUE", "防重複作答"],
    ["treatment_sessions(scenario_quiz_id, student_id) UNIQUE",
     "同一學生對同一情境僅一個 session"],
    ["treatment_messages(session_id, question_index, created_at)",
     "對話依序讀取"],
    ["ai_summary_cache(scope, scope_id, quiz_id) UNIQUE", "摘要快取查找"],
]
story.append(make_table(idx_data, col_widths=[8 * cm, 8.5 * cm]))

# ===== 4. API 路由 ===========================================================
story.append(PageBreak())
story.append(H1("4. API 路由總覽"))
story.append(code("""# 認證
POST   /api/auth/login              { account, password } → set HttpOnly cookie
POST   /api/auth/logout
GET    /api/auth/me                 → 當前使用者資料
PATCH  /api/auth/password           修改自己的密碼

# 班級與學生
GET    /api/classes
GET    /api/classes/{class_id}
POST   /api/classes/{class_id}/students        新增學生
DELETE /api/classes/{class_id}/students/{id}   移除學生
POST   /api/students/{id}/reset-password       教師重設學生密碼為預設

# 診斷考卷
GET    /api/quizzes
POST   /api/quizzes                 新增（含 questions + options）
GET    /api/quizzes/{id}
PUT    /api/quizzes/{id}
DELETE /api/quizzes/{id}

# 情境治療考卷
GET    /api/scenarios
POST   /api/scenarios
GET    /api/scenarios/{id}
PUT    /api/scenarios/{id}
DELETE /api/scenarios/{id}

# 派發
GET    /api/assignments?type=&class_id=&quiz_id=
POST   /api/assignments
PATCH  /api/assignments/{id}        修改截止日
DELETE /api/assignments/{id}

# 學生作答
GET    /api/students/me/assignments              學生看自己被派的任務
POST   /api/answers                              一題一筆
POST   /api/answers/{id}/followup                追問結果回寫
GET    /api/quizzes/{quiz_id}/answers?class_id=  教師查班級彙整

# 治療對話
POST   /api/treatment/sessions/start             { scenario_quiz_id }
POST   /api/treatment/sessions/{id}/messages     一輪對話往返
PATCH  /api/treatment/sessions/{id}/advance      切到下一題
POST   /api/treatment/sessions/{id}/complete
GET    /api/teachers/treatment-logs?class_id=&scenario_quiz_id=
GET    /api/teachers/treatment-logs/{session_id}

# LLM proxy（N3 / N4 / N5）
POST   /api/llm/chat                { messages, temperature?, max_tokens? }
POST   /api/llm/chat/stream         SSE 串流

# AI（RAGFlow，N1 / N2 / N6）
POST   /api/ai/grade-summary        { quiz_id }                          → N1
POST   /api/ai/class-summary        { quiz_id, class_id }                → N2
POST   /api/ai/distractor-suggest   { node_id, misconception_id, current_text } → N6"""))

# ===== 5. RAGFlow 整合 =======================================================
story.append(H1("5. RAGFlow 整合細節"))
story.append(P("<b>服務檔</b>：app/services/ragflow_service.py"))
story.append(P("<b>協定</b>：依 RAGFlow HTTP API（converse-with-agent）"))
story.append(P(
    "&nbsp;&nbsp;• POST {endpoint}/api/v1/agents/{agent_id}/sessions &nbsp;→&nbsp; 建 session<br/>"
    "&nbsp;&nbsp;• POST {endpoint}/api/v1/agents/{agent_id}/completions &nbsp;→&nbsp; 對話",
    S_BULLET,
))
story.append(Spacer(1, 4))
story.append(P("<b>後端環境變數（不加 VITE_ 前綴，瀏覽器看不到）</b>"))
story.append(code("""RAGFLOW_ENDPOINT=https://ragflow-thesisflow.hsueh.tw
RAGFLOW_AGENT_ID=5f5cc79e3afb11f1b0be26501d5adb82
RAGFLOW_API_KEY=ragflow-your-api-key-here"""))

story.append(H2("Session 策略與快取"))
ragflow_data = [
    ["節點", "Session 策略", "快取策略"],
    ["N1 全年級摘要", "每次摘要建一次性 session，不重用",
     "寫進 ai_summary_cache，預設 6 小時失效；學生新作答時 invalidate"],
    ["N2 單班摘要", "每次摘要建一次性 session，不重用",
     "同上（key = quiz_id + class_id）"],
    ["N6 出題輔助", "教師備課期間維持同一 session 連續詢問",
     "不快取（每次條件都不同）"],
]
story.append(make_table(ragflow_data, col_widths=[3 * cm, 5.5 * cm, 8 * cm]))

# ===== 6. Docker compose =====================================================
story.append(H1("6. Docker compose 變更"))
story.append(P("既有 frontend service 不動，新增 postgres / backend 兩個 service。"))
story.append(code("""services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: pg_isready

  backend:
    build: ./backend
    depends_on: [postgres]
    environment:
      DATABASE_URL, JWT_SECRET,
      VLLM_BASE_URL, VLLM_API_KEY, VLLM_MODEL_NAME,
      RAGFLOW_ENDPOINT, RAGFLOW_AGENT_ID, RAGFLOW_API_KEY
    ports: ['8000:8000']

  frontend:    # 既有，改成依賴 backend
    depends_on: [backend]"""))

# ===== 7. 4 階段推進 =========================================================
story.append(PageBreak())
story.append(H1("7. 漸進式推進（4 階段）"))
phase_data = [
    ["階段", "範圍", "驗收標準"],
    ["P1\n後端骨架 + 認證",
     "docker-compose 加 postgres + backend；SQLAlchemy models；"
     "Alembic 初始 migration；seed 教師 aaa001 + 三班學生帳號（115001…）；"
     "/api/auth/login；前端 LoginPage 改接後端；JWT cookie 流程",
     "aaa001/aaa001 登入進教師端；\n115001/115001 登入進學生端"],
    ["P2\nLLM proxy + RAGFlow（N6）",
     "後端 /api/llm/chat 與 /chat/stream（vLLM proxy）；"
     "/api/ai/distractor-suggest（N6, RAGFlow）；"
     "前端 src/llm/ 改寫為呼叫後端；"
     "出題精靈步驟二加「建議干擾選項」按鈕",
     "教師出題時點按鈕能拿到 RAGFlow 回傳的選項建議 + 引用"],
    ["P3\n核心資料 API 化",
     "classes / students / quizzes / scenarios / assignments 全部從 mock 改成讀 DB；"
     "前端 AppContext 對應改寫；"
     "同時做 /api/ai/grade-summary、/api/ai/class-summary（N1/N2）",
     "教師建的考卷、派的題能跨裝置看到；"
     "診斷儀表板顯示 N1/N2 RAGFlow 摘要"],
    ["P4\n學生作答資料貫通",
     "學生作答 / 追問對話 / 治療 session 全寫 DB；"
     "教師端診斷儀表板顯示真實學生資料；"
     "治療紀錄頁讀真實 session",
     "學生作完、教師重整就看得到"],
]
story.append(make_table(phase_data, col_widths=[3 * cm, 8 * cm, 5.5 * cm], font_size=8.5))

story.append(P(
    "<b>每階段完成後</b>：新增/更新對應 spec 文件（spec-10 ~ 13）；"
    "前端跑 npm run build + lint 通過；後端跑 pytest + ruff check 通過。",
    S_BODY,
))

# ===== 8. 注意事項與決策點 ====================================================
story.append(H1("8. 注意事項與決策點"))
notes = [
    "<b>1. AppContext 重寫範圍</b>：目前前端 AppContext 是 in-memory mock。"
    "P3/P4 改 API 後 AppContext 需要重寫（從「直接持有資料」改成「fetch + cache」）。"
    "P3 會提案是否引入 React Query / SWR。",

    "<b>2. 學生密碼策略 ⚠️</b>：你原本要求「教師可看學生密碼」與安全 hash 機制衝突。"
    "建議改寫為：DB 只存 hash；教師「重設密碼」時以「帳號字串」重新 hash 並標記 "
    "password_was_default=true；教師端僅顯示「目前為預設密碼 / 已自行修改」標籤 "
    "+ 提供「重設為預設」按鈕。<b>請於下一頁確認</b>。",

    "<b>3. 既有 src/llm/ 改寫</b>：config.js 砍掉 vllm-specific 設定、改讀 "
    "VITE_BACKEND_URL；vllmProvider.js 改成 backendProvider.js，呼叫後端 "
    "/api/llm/chat。spec-09 同步更新。",

    "<b>4. 既有 src/data/*Data.js</b>：P3 後不再被前端使用。"
    "改成「seed 來源」搬到 backend/app/seed/，前端僅保留型別定義（或全部砍掉）。",

    "<b>5. CORS</b>：dev 階段後端要開 http://localhost:3000；"
    "prod 階段 nginx 反代到 backend，前端走相對路徑就不用開 CORS。",
]
for n in notes:
    story.append(P("• " + n, S_BULLET))
    story.append(Spacer(1, 4))

# ===== 9. 需要你確認 =========================================================
story.append(PageBreak())
story.append(H1("9. 需要你確認的 3 件事"))
story.append(P(
    "請於下方三題各回覆即可，確認後我會先寫 spec-10 / spec-11 / spec-13 三份 spec，"
    "再開始動工 P1。", S_BODY,
))
story.append(Spacer(1, 8))

confirms = [
    ("Q1 — 技術棧確認",
     "FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL 16 + asyncpg + "
     "argon2 + JWT cookie，這個組合 OK 嗎？<br/><br/>"
     "套件管理用 <b>uv</b>（推薦，快且鎖檔清楚）還是傳統 "
     "<b>pip + requirements.txt</b>？"),

    ("Q2 — 學生密碼處理方式",
     "「教師可看學生密碼」與「DB 只存 hash」相衝突。<br/>"
     "請選擇下列其一：<br/><br/>"
     "<b>(A)</b> 接受改寫：教師端只看「目前為預設密碼 / 已自行修改」標籤，"
     "提供「重設為預設」按鈕。<b>（推薦，安全標準做法）</b><br/><br/>"
     "<b>(B)</b> 強制學生第一次登入後改密碼，教師端僅顯示「初始密碼 = 帳號」+ 重設按鈕。<br/><br/>"
     "<b>(C)</b> 堅持要看明文 → 需另存一份明文於 DB，安全性大幅下降，"
     "且日後若資料外洩會連帶曝光所有學生密碼。"),

    ("Q3 — 推進順序",
     "<b>(A)</b> 照順序 P1 → P2 → P3 → P4 跑（建議；資料層先打穩）。<br/><br/>"
     "<b>(B)</b> 先做 P2 的 N6（RAGFlow 出題輔助）作為獨立 demo 給指導教授看，"
     "其餘照順序 P1 → P3 → P4。<br/><br/>"
     "&nbsp;&nbsp;&nbsp;&nbsp;<i>說明：選 (B) 的話 N6 會先以「不需登入」的形式做出來，"
     "之後 P1 完成再加上權限檢查。多花約 0.5 天工，但能更早給指導教授看到 RAGFlow 成果。</i>"),
]
for title, body in confirms:
    story.append(P(f"<b>{title}</b>", S_H2))
    story.append(P(body, S_CONFIRM))

story.append(Spacer(1, 12))
story.append(P(
    "<i>本文件由本次對話內容自動產出。原始 workflow 文件請參考 docs/workflow.md。</i>",
    ParagraphStyle("Footer", parent=S_BODY, alignment=TA_CENTER,
                   fontSize=9, textColor=colors.grey),
))

# --- Build -------------------------------------------------------------------
doc.build(story)
print(f"[ok] PDF saved: {out_path}")
print(f"[ok] file size: {os.path.getsize(out_path):,} bytes")
