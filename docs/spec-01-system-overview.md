# SPEC-01: System Overview / 系統總覽

## 1. 專案名稱
**SciLens**（codename: teacher_quiz_0223）— 自然科學迷思概念診斷系統（Science Misconception Diagnosis System）

## 2. 專案目的
本系統為一套教育科技前端應用程式，專為國中自然科學教師設計，用於：
- 建立與管理「迷思概念診斷試卷」
- 將試卷派發給不同班級的學生
- 收集學生作答結果並自動進行迷思概念診斷
- 以視覺化儀表板呈現班級與個人的診斷結果
- 提供對應迷思概念的教學策略建議

學生端則提供：
- 對話式的診斷測驗介面
- 個人學習健康報告
- 迷思概念確認與反思機制

## 3. 技術架構

### 3.1 前端技術棧
| 類別 | 技術 | 版本 |
|------|------|------|
| UI 框架 | React | ^19.2.0 |
| 路由 | React Router DOM | ^7.13.1 |
| 建構工具 | Vite | ^7.3.1 |
| CSS 框架 | Tailwind CSS | ^4.2.1 |
| 圖表庫 | Recharts | ^3.7.0 |
| 簡報匯出 | pptxgenjs | ^4.0.1 |
| 瀏覽器自動化 | Puppeteer | ^24.39.1 |

### 3.2 開發工具
| 類別 | 技術 | 版本 |
|------|------|------|
| 建構工具 | Vite | ^7.3.1 |
| React 插件 | @vitejs/plugin-react | ^5.1.1 |
| CSS 框架 | Tailwind CSS | ^4.2.1 |
| Tailwind Vite 插件 | @tailwindcss/vite | ^4.2.1 |
| Linter | ESLint | ^9.39.1 |
| ESLint 推薦規則 | @eslint/js | ^9.39.1 |
| React Hooks Linting | eslint-plugin-react-hooks | ^7.0.1 |
| Hot Reload | eslint-plugin-react-refresh | ^0.4.24 |
| 全域變數定義 | globals | ^16.5.0 |
| TypeScript 型別（僅定義用） | @types/react | ^19.2.7 |
| TypeScript 型別（僅定義用） | @types/react-dom | ^19.2.3 |

### 3.3 部署架構
- **建構階段**: Node.js 22-alpine 執行 `npm ci` + `npm run build`
- **服務階段**: Nginx alpine 提供靜態檔服務
- **容器化**: Docker + docker-compose
- **對外端口**: 3000 (映射至容器內 80)
- **健康檢查**: `GET /health` → 200 "ok"

### 3.4 後端整合狀態（P1 起）

| 階段 | 範圍 | 狀態 |
|------|------|------|
| **P1** | 後端骨架（FastAPI + PostgreSQL）、認證（帳密 + JWT cookie）、學生帳密管理 | ✅ 已完成 |
| **P2** | LLM proxy（取代前端直呼 vLLM）、RAGFlow N6 出題輔助 | ⏳ 規劃中 |
| **P3** | classes / quizzes / scenarios / assignments 全部 API 化、N1/N2 摘要（RAGFlow） | ⏳ 規劃中 |
| **P4** | 學生作答 / 追問 / 治療對話 DB 化 | ⏳ 規劃中 |

詳見：
- `docs/spec-10-backend-architecture.md` — 後端整體架構
- `docs/spec-11-database-schema.md` — DB schema（15 張表）
- `docs/spec-13-auth.md` — 認證機制（含明文密碼決策說明）

### 3.5 後端技術棧

| 類別 | 技術 |
|------|------|
| 語言 | Python 3.12 |
| Web 框架 | FastAPI |
| ORM | SQLAlchemy 2.0 (async) + Alembic |
| DB driver | asyncpg |
| 資料庫 | PostgreSQL 16-alpine |
| 認證 | PyJWT + HttpOnly Cookie |
| 套件管理 | uv |
| Lint / Format | ruff |
| 測試 | pytest + pytest-asyncio |

## 4. 專案結構

```
teacher_quiz_0223/
├── index.html               # Vite HTML 進入點
├── public/                  # 靜態資源
├── src/
│   ├── main.jsx             # React 應用程式進入點
│   ├── App.jsx              # 路由定義與 AppProvider 包裹
│   ├── App.css              # App 元件 CSS
│   ├── index.css            # 全域 CSS（Tailwind import）
│   ├── assets/
│   │   └── react.svg        # React Logo SVG
│   ├── context/
│   │   └── AppContext.jsx   # 全域狀態管理（React Context）
│   ├── constants/
│   │   └── theme.js         # 色彩常數與視覺群組色
│   ├── data/
│   │   ├── quizData.js      # 試卷題目、作答分佈、資料存取函式
│   │   ├── classData.js     # 班級與學生名冊
│   │   ├── assignmentData.js # 派題記錄
│   │   ├── knowledgeGraph.js # 知識節點與迷思概念定義
│   │   └── chartInfoConfig.js # 圖表資料說明設定
│   ├── components/
│   │   ├── TeacherLayout.jsx # 教師端側邊欄佈局
│   │   ├── StepIndicator.jsx # 多步驟精靈進度指示器
│   │   ├── InfoButton.jsx    # 資訊按鈕（觸發 InfoDrawer）
│   │   └── InfoDrawer.jsx    # 側邊資訊面板
│   └── pages/
│       ├── LoginPage.jsx           # 登入/角色選擇頁
│       ├── teacher/
│       │   ├── TeacherDashboard.jsx     # 教師主頁（三步驟流程）
│       │   ├── DashboardReport.jsx      # 診斷結果儀表板
│       │   ├── QuizLibrary.jsx          # 考卷庫
│       │   ├── AssignmentManagement.jsx # 派題管理
│       │   ├── ClassManagement.jsx      # 班級管理
│       │   ├── ClassDetail.jsx          # 班級詳情
│       │   ├── KnowledgeMap.jsx         # 知識地圖
│       │   ├── TeacherReport.jsx        # 舊版診斷報告（保留）
│       │   └── quiz/
│       │       ├── QuizCreateWizard.jsx # 出題精靈容器
│       │       ├── Step1Nodes.jsx       # 步驟一：選擇知識節點
│       │       └── Step2Edit.jsx        # 步驟二：編輯題目
│       └── student/
│           ├── StudentHome.jsx    # 學生首頁
│           ├── StudentQuiz.jsx    # 對話式診斷測驗
│           └── StudentReport.jsx  # 個人學習報告
├── Dockerfile               # 多階段建構
├── docker-compose.yml        # 容器編排
├── nginx.conf                # Nginx 設定（React Router SPA 支援）
├── vite.config.js            # Vite 設定
├── eslint.config.js          # ESLint 設定
├── package.json              # 依賴與腳本
├── .env.example              # 環境變數範本
├── scripts/
│   └── capture-fullpage-screenshots.mjs  # 全頁截圖腳本（Puppeteer）
├── screenshot0317/           # 截圖產出目錄
└── docs/                     # 文件目錄
```

## 5. 使用者角色

| 角色 | 描述 | 進入方式 |
|------|------|----------|
| 教師 (Teacher) | 建立試卷、派題、查看診斷結果 | 首頁點選「教師端」 |
| 學生 (Student) | 作答試卷、查看個人報告 | 首頁點選「學生端」 |

## 6. 課程範圍
- **學科**: 自然科學
- **年級**: 國小五年級
- **單元**: 水溶液（Aqueous Solutions）
- **課綱標準**:
  - 子主題 A — 水溶液中的變化（溶解）：INe-II-3-01 ~ INe-II-3-05（5 個節點）
  - 子主題 B — 酸鹼反應：INe-Ⅲ-5-1 ~ INe-Ⅲ-5-7（7 個節點）
- **知識節點數**: 12 個（5 + 7）
- **已定義迷思概念數**: 48 個（每節點 4 條）

## 7. npm scripts

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動 Vite 開發伺服器 (port 3000) |
| `npm run build` | 建構生產版本至 `dist/` |
| `npm run lint` | 執行 ESLint 檢查 |
| `npm run preview` | 預覽建構後的生產版本 |
