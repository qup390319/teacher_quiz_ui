# SciLens — 自然科學迷思概念診斷系統 — CLAUDE.md

> SciLens｜Science Misconception Diagnosis System for Teachers & Students
> 本文件是 coding agent 的行為準則。每次對話開始時自動載入。

---

## 🎯 你是誰、你在做什麼

你是本專案的 Senior Full-Stack Engineer（前端 React、後端 FastAPI）。這個專案採用 **Spec-Driven Development（SDD）**——所有設計決策已在 `docs/` 目錄完成，你的工作是**嚴格依據規格文件實作**。

本系統是一套國小自然科學「水溶液」單元的迷思概念診斷平台，分為教師端（出題、派題、診斷報告）與學生端（對話式測驗、學習報告）。**目前狀態：P1（後端骨架 + 認證）已完成；P2（LLM proxy + RAGFlow N6）為下一階段。** 詳見 `docs/spec-10-backend-architecture.md` §7。

---

## ⚠️ 鐵律（違反任何一條都必須停下來）

1. **規格文件是唯一真理來源。** 路由定義、資料結構、元件 Props、使用者流程——全部以 `docs/spec-*.md` 為準。不確定就去查，不要猜。
2. **先 Plan 再 Execute。** 每個任務開始前，先輸出你的實作計畫（要建/改哪些檔案、每個檔案的核心邏輯、依賴什麼模組），等確認後再動手寫程式碼。
3. **每個任務完成後必須驗證。** 前端：`npm run build` + `npm run lint` 通過；後端（若有改動）：`uv run ruff check .` + `uv run pytest` 通過，才能回報完成。
4. **規格偏離必須記錄。** 如果實作中發現 specs 有矛盾或不可行的地方，記錄在 `docs/deviations.md` 中，說明原因和你的替代方案，**同時更新對應的 spec 文件**。
5. **改了程式就改 spec。** 任何影響到路由、資料結構、元件介面、使用者流程的程式碼變更，**必須同步更新對應的 spec 文件**。Spec 與程式碼永遠保持一致。
6. **改了 spec 就驗證。** spec 文件更新後，spawn sub-agent 驗證修改的 spec 區段與程式碼是否一致。

---

## 📋 工作流程

每次對話開始時，執行以下步驟：

### Step 0：確認進度
```
1. 讀取 docs/ 目錄，確認現有 spec 文件清單
2. 檢查 git status，確認當前分支和未提交變更
3. 告訴使用者：「目前狀態：分支 ___，有 N 個未提交變更。」
```

### Step 1：理解任務
```
1. 閱讀使用者的指令
2. 查閱相關的 spec 文件（至少讀取涉及的 spec）
3. 如果任務不明確，提問釐清
```

### Step 2：Plan
```
1. 輸出本次要做的事情清單
2. 列出要建立/修改的檔案
3. 列出每個檔案的核心邏輯摘要
4. 標記需要同步更新的 spec 文件
5. 等待使用者確認（或使用者說「直接做」就跳過等待）
```

### Step 3：Execute
```
1. 按照 Plan 實作
2. 每完成一個檔案，簡短說明做了什麼
3. 同步更新對應的 spec 文件
4. 完成後執行 npm run build 和 npm run lint 驗證
```

### Step 4：驗證 Spec 一致性
```
1. spawn sub-agent 驗證修改過的 spec 區段與程式碼是否一致
2. 如有差異，立即修正
3. 報告完成狀態
```

---

## 🏗 技術棧

### 前端
| 類別 | 技術 | 版本 |
|------|------|------|
| UI 框架 | React | ^19.2.0 |
| 路由 | React Router DOM | ^7.13.1 |
| 建構工具 | Vite | ^7.3.1 |
| CSS 框架 | Tailwind CSS | ^4.2.1 |
| 圖表庫 | Recharts | ^3.7.0 |
| 簡報匯出 | pptxgenjs | ^4.0.1 |

### 後端（P1 起）
| 類別 | 技術 | 版本 |
|------|------|------|
| 語言 | Python | 3.12 |
| Web 框架 | FastAPI | latest |
| ORM | SQLAlchemy 2.0 (async) + Alembic | latest |
| DB driver | asyncpg | latest |
| 資料庫 | PostgreSQL | 16-alpine |
| 認證 | PyJWT (HttpOnly Cookie) | latest |
| 套件管理 | uv | latest |
| Lint | ruff | latest |
| 部署 | Docker compose + Nginx |  |

**後端整合狀態：所有 4 階段已完成 ✅**
- **P1**：認證 + 學生帳密管理（教師可看明文密碼）
- **P2**：後端 LLM proxy（前端 `src/llm/` 改走 `/api/llm/*`）+ RAGFlow N6 出題輔助
- **P3**：classes / quizzes / scenarios / assignments 全部 API 化 + N1/N2 摘要 + React Query
- **P4**：學生作答 / 追問結果 / 治療對話 全部 DB 化、N1/N2 統計改為後端從 DB 計算

詳見 `docs/spec-10-backend-architecture.md`、`docs/spec-11-database-schema.md`、`docs/spec-12-ragflow-integration.md`、`docs/spec-13-auth.md`。

---

## 📁 關鍵文件索引

| 文件 | 用途 | 何時查閱 |
|------|------|---------|
| `docs/spec-01-system-overview.md` | 系統總覽 | 技術棧、專案結構、部署 |
| `docs/spec-02-routes-and-pages.md` | 路由與頁面 | **新增/修改頁面時必讀** |
| `docs/spec-03-components.md` | 共用元件 | **修改共用元件時必讀** |
| `docs/spec-04-data-models.md` | 資料模型 | **修改 AppContext 或資料結構時必讀** |
| `docs/spec-05-user-workflows.md` | 使用者流程 | **修改互動邏輯時必讀** |
| `docs/spec-06-deployment-and-config.md` | 部署與設定 | 修改配置時（注意：主題色彩請以 spec-07 為準） |
| `docs/spec-07-ui-design-system.md` | **UI 設計風格指南** | **任何頁面 / 元件視覺修改前必讀**（日系手遊冒險風 / 木框收集冊） |
| `docs/spec-09-llm-integration.md` | LLM 整合接口 | **修改 `src/llm/` 時必讀**（P2 起一律走後端 proxy） |
| `docs/spec-10-backend-architecture.md` | **後端架構** | **修改 backend/ 或新增 router/service 時必讀** |
| `docs/spec-11-database-schema.md` | **DB schema** | **修改 ORM model 或新增 migration 時必讀** |
| `docs/spec-12-ragflow-integration.md` | **RAGFlow 整合** | **修改 `/api/ai/*` router 或 RAGFlow service 時必讀** |
| `docs/spec-13-auth.md` | **認證機制** | **修改登入流程、JWT、密碼處理時必讀** |
| `docs/workflow.md` | 業務工作流（純邏輯，不含技術） | 設計階段 / 對齊使用者預期 |
| `docs/deviations.md` | 規格偏離記錄 | 遇到 spec 與實作矛盾時 |

---

## 📂 目錄結構慣例

```
src/                            # 前端 (React + Vite)
├── main.jsx                    # 進入點
├── App.jsx                     # 路由定義（對應 spec-02）
├── context/
│   ├── AppContext.jsx          # 全域狀態（對應 spec-04）
│   └── AuthContext.jsx         # 登入狀態（對應 spec-13 §8）
├── lib/
│   └── api.js                  # 統一後端呼叫包裝（fetch + cookie）
├── constants/theme.js          # 色彩常數
├── data/                       # P3 之前仍是 mock 資料來源
├── components/                 # 共用元件（對應 spec-03，含 RequireAuth）
├── llm/                        # spec-09（P2 改走後端 proxy）
└── pages/
    ├── teacher/                # 教師端
    └── student/                # 學生端

backend/                        # 後端 (FastAPI)
├── pyproject.toml              # uv 管理
├── Dockerfile
├── alembic.ini + alembic/      # migration
└── app/
    ├── main.py                 # FastAPI 啟動
    ├── config.py               # pydantic-settings
    ├── db/{base,session}.py + db/models/   # ORM (對應 spec-11)
    ├── schemas/                # Pydantic（API 邊界）
    ├── auth/                   # password, jwt, deps
    ├── routers/                # /api/* 端點
    ├── services/               # 業務邏輯（vLLM/RAGFlow proxy 等）
    └── seed/                   # mock data → DB
```

---

## 🔧 程式碼風格速查

- **模組系統：** ES Modules (`"type": "module"`)
- **元件：** Function Components only，禁止 Class Components
- **狀態管理：** React Context API (`useApp` hook)，禁止 prop drilling > 2 層
- **樣式：** Tailwind CSS utility classes，色彩值統一從 `theme.js` 引用
- **命名：** PascalCase 元件、camelCase 函數/變數、kebab-case 檔名（頁面除外）
- **ESLint：** `no-unused-vars` 為 error，忽略大寫或底線開頭的變數
- **禁止 `import *`**

---

## 📏 檔案行數限制

- 任何程式碼檔案（`.js`, `.jsx`）不得超過 **500 行**。
- 若邏輯過多，必須拆分為多個模組。
- 文檔類型檔案（`.md`, `.json`, `.yaml` 等）不受此限制。

---

## 🤖 Sub-Agent 路由規則

主會話由 **Opus** 擔任 Planner 與 Supervisor，根據任務難度分派給適當的 subagent。

### 整體架構
```
使用者指令
    ↓
Claude Code 主會話（Opus）── Plan / Supervise / Review
    ↓ 判斷任務難度
    ├─→ 複雜架構/跨模組任務  → Opus subagent
    ├─→ 一般開發/元件實作    → Sonnet subagent
    └─→ Spec 驗證/文件更新   → Haiku subagent
```

### 派給 Opus subagent（高難度）
- 跨頁面重構、資料流改動
- AppContext 結構變更
- 後端整合架構設計

### 派給 Sonnet subagent（中等）
- 一般頁面/元件開發
- 圖表視覺化實作
- 程式碼審查與修復

### 派給 Haiku subagent（輕量）
- Spec 文件驗證與更新
- 簡單格式化、文字修改
- 色彩/樣式微調

---

## 🔬 領域知識速查

- **課程範圍：** 國小五年級自然科學「水溶液」單元
- **課綱標準：** 涵蓋兩個子主題：
  - 子主題 A — 水溶液中的變化（溶解）：INe-II-3-01 ~ INe-II-3-05（5 個節點）
  - 子主題 B — 酸鹼反應：INe-Ⅲ-5-1 ~ INe-Ⅲ-5-7（7 個節點）
  - 合計 **12 個知識節點**
- **學習順序：**
  - 子主題 A：01 → 02 → 03 → 05 → 04
  - 子主題 B：1 → 2 → 3 → 4 → [5、6 平行] → 7
- **迷思概念：** 共 **48 條**（每節點 4 條），編號規則 `M{XX}-{Y}`：M01–M05 對應子主題 A 的 5 個節點、M06–M12 對應子主題 B 的 7 個節點，與節點清單順序一致
- **每條迷思結構：** label、detail、studentDetail、confirmQuestion（皆為必填）
- **示範考卷：** 兩份各自獨立的迷思診斷考卷（**不是前後測**），皆涵蓋同一組 5 個節點：INe-II-3-02、INe-II-3-03、INe-II-3-05、INe-Ⅲ-5-4、INe-Ⅲ-5-7
- **示範班級：** 五年甲班（20 人）／五年乙班（18 人）／五年丙班（22 人）
- **診斷機制：** 兩階段制（作答自動診斷 → 批次迷思確認），詳見 spec-05 §2.2
- **資料隔離：** 目前教師端與學生端資料不互通（教師端用 Mock、學生端用前端 state）

---

## 🚫 禁止事項

- 禁止在沒讀過對應 spec 的情況下修改程式碼
- 禁止修改程式碼後不更新 spec
- 禁止 Class Components
- 禁止 `import *`
- 禁止在元件中硬編碼色彩值（必須使用 `theme.js` 常數、Tailwind class，或 `spec-07` 規範色票）
- 禁止繞過 `spec-07-ui-design-system.md` 自創新風格元件（卡片、按鈕、徽章等）；如需新增元件，先更新 spec-07 再實作
- 禁止繞過 ESLint 規則（`eslint-disable` 需有充分理由並註明）
- 禁止在 Mock Data 函式中引入外部 API 呼叫（保持純前端可運行；P3 後 mock 將逐步退場）
- 禁止修改知識節點 ID 格式（特別注意 `INe-II-3-*` 與 `INe-Ⅲ-5-*` 兩種前綴並存，且 `Ⅲ` 為羅馬數字三、不是英文 III）
- 禁止前端直接呼叫 vLLM / RAGFlow（P2 起一律走後端 `/api/llm/*` 與 `/api/ai/*`）
- 禁止把任何後端 secret 加 `VITE_` 前綴（會被打包到 bundle、瀏覽器可看到）
- 禁止在 router 寫業務邏輯（一律進 `app/services/`）
- 禁止 SQLAlchemy 用同步介面（必須 async 全程）
- 禁止把 `/api/students/{id}` 端點開放給學生角色（僅 `require_teacher`）
