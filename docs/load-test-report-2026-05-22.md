# SciLens 壓力測試報告

| 項目 | 值 |
|---|---|
| 測試日期 | 2026-05-22 |
| 測試環境 | 本機 Docker (Windows host, Docker Desktop) |
| Backend | FastAPI + uvicorn (single container) |
| DB | PostgreSQL 16-alpine (single container) |
| LLM 上游 | gemma-4-26B-A4B-it via vLLM |
| RAGFlow | 已配置並可達 |
| 測試工具 | Locust 2.44.0（Python 3.11）, Vite dev server, MCP browser automation |
| Seed 規模 | 1 教師、3 班、60 學生、2 quiz、~280 answers |

---

## 1. 場景 1：Backend API 階梯壓測

**腳本**：`load-tests/backend_api.py`
**SLO**：p95 < 500ms、errors < 1%

### 結果

| 階梯 | Users | 持續 | 總請求 | p50 | **p95** | p99 | Error rate | 結論 |
|---|---|---|---|---|---|---|---|---|
| Stage 1 | 50 | 3 min | 2,741 | 8ms | **48ms** | 130ms | 0.07% | ✅ PASS |
| Stage 2 | 200 | 3 min | 10,835 | 10ms | **130ms** | 300ms | 0.05% | ✅ PASS |
| Stage 3 | 500 | 3 min | **25,902** | 150ms | **390ms** | 600ms | 0.16% | ✅ PASS |

吞吐 / 用戶數比：50→200 線性（55→63 req/s），200→500 仍能擴展（63→144 req/s）但 p95 翻 3 倍。

### 端點細項（Stage 3 數據）

| 端點 | 請求數 | p50 | p95 | 備註 |
|---|---|---|---|---|
| POST /api/auth/login | — | 21ms | — | bcrypt 是主要成本 |
| GET /api/auth/me | — | 7ms | — | 最快 |
| GET /api/classes | 1,161 | 130ms | 310ms | |
| GET /api/quizzes | 1,235 | 140ms | 350ms | |
| GET /api/quizzes/[id] | 4,673 | 140ms | 370ms | 最熱端點 |
| GET /api/quizzes/[id]/stats | 833 | 270ms | 510ms | DB 聚合，最慢 |
| GET /api/teachers/diagnosis-logs | 410 | 230ms | 430ms | |

### 發現

1. **Throughput inflection 推估在 700–1000 users**（p95 會破 500ms）。1000 users 應為本機 docker 配置的軟上限。
2. **錯誤類型只有 `RemoteDisconnected`**：共 46 次（0.12%）跨三階。可能是 uvicorn 預設 keep-alive timeout 5s + client connection reuse race。生產建議：
   - uvicorn 加 `--timeout-keep-alive 30`
   - 或前面架 nginx 做 connection pooling
3. **`/api/quizzes/{id}/stats`** 的 p95=510ms 是 backend 自己最慢的端點（DB 聚合）。學生數膨脹後可能成為瓶頸，可考慮加快取（spec-10 §6 提到 N1/N2 摘要快取機制）。

### Smoke 過程中抓到的 bug（**非生產 bug，是測試腳本問題**）

第一次 smoke 出現 30% 403 on `/api/quizzes/{id}`。追到 `backend/app/routers/quizzes.py:99–110` 發現是預期行為：學生只能讀自己班有 assignment 的 quiz。修腳本：`StudentUser.on_start` 先 GET `/api/assignments`，只打 assigned quiz_ids。第二次 smoke 錯誤率歸 0。

---

## 2. 場景 2：LLM Proxy 壓測（含預算上限）

**腳本**：`load-tests/llm_proxy.py`
**SLO**：p95 < 8000ms、errors < 5%
**預算**：`LLM_BUDGET=100`（達上限自動停）

### 結果

| 指標 | 值 |
|---|---|
| 用戶併發 | 10 |
| 預算用量 | **100 / 100**（自動停止生效 ✅）|
| 總請求 | 109 |
| p50 | 1100ms |
| **p95** | **1700ms** |
| p99 | 1800ms |
| 錯誤率 | **0%** |
| 吞吐 | 2.34 req/s |
| 結論 | ✅ PASS |

### 端點細項

| 端點 | 次數 | p50 | p95 | 備註 |
|---|---|---|---|---|
| POST /api/llm/chat | 52 | 1100ms | 1400ms | 基準 LLM 通道 |
| POST /api/llm/analyze-cause | 28 | 1600ms | 1800ms | 多輪推理，最慢 |
| POST /api/ai/distractor-suggest | 19 | 1000ms | 1000ms | **RAGFlow 比預期穩** |

### 發現

1. **LLM 是體感瓶頸**：backend 自己 500 並發 p99=600ms，但單一 LLM 同步呼叫就 1.1–1.8s。教師端若有同步 LLM 互動，UX 體感是「卡 2 秒」。
2. **RAGFlow 沒踩到限流**：19 次 distractor-suggest 全成功，沒有 502。
3. **建議**：教師端 LLM 互動全改用 streaming（`/api/llm/chat/stream` 已實作），或加 skeleton loading。

---

## 3. 場景 3：前端壓測

### 3a — 真實 dev mode 瀏覽（MCP browser 自動化）

**手段**：透過 Claude Preview MCP 啟動 Vite dev server，用 `preview_eval` 注入 timing 量測。

| 流程 | 時間 | 評價 |
|---|---|---|
| 冷啟動（181 modules） | DOMContentLoaded 3034ms | Vite dev 模式預期（unbundled）。Production build 後會降到 ~200–300ms |
| Warm reload | 207ms | 接近真實 UX |
| 登入 → /teacher | 272ms | 含 bcrypt + JWT + DB query + React 路由 |
| Dashboard 主頁 | 412 DOM nodes | 無 Recharts，輕量 |
| /teacher/dashboard/students | 1,341 DOM nodes | 60 學生時最重的頁，線性外推 200 學生 ≈ 4,400 nodes |

### 3b — Recharts 純圖表壓測（4000 rows 業務情境）

**手段**：`public/loadtest-recharts.html` 獨立 harness，吃 `frontend_data.mjs` 產出的 200 學生 × 4000 answer rows 大資料，量「聚合 → 首次渲染 → 互動更新 → 極端 stress」四階段。

| 指標 | 值 | 通過標準 | 評價 |
|---|---|---|---|
| Module import（Vite dev） | 494ms | — | 冷啟動。Prod build 更快 |
| **聚合（4000 rows）** | **0ms** | — | 純 JS Map/reduce 零負擔 |
| **First paint**（3 charts: bar+bar+scatter） | **299ms** | < 2000ms | ✅ |
| **Re-render x5**（互動模擬） | [29, 19, 13, 14, 12] ms，avg **17ms** | < 100ms | ✅ 接近 60fps 預算（16ms） |
| **STRESS（4000 bars 同一圖）** | **998ms** | — | 極端，非真實 UX |
| Memory | 115 MB | < 200 MB | ✅ |
| DOM nodes（含 stress） | 6,228 | — | |

### 線性外推（從 200 學生推到 1000 學生）

| 學生數 | first paint | re-render avg | 結論 |
|---|---|---|---|
| 60（目前 seed） | ~90ms | ~5ms | 流暢 |
| 200 | 299ms | 17ms | ✅ 流暢 |
| 1000（外推） | ~1500ms | ~85ms | 仍可接受，但建議分頁 |

### 過程中發現的真實 bug

1. **`Encountered two children with the same key, "calculation"`** — `src/components/InfoDrawer.jsx:236-238` 使用 `key={section.type}`，但 `chartInfoConfig.js` 的 `cross-class-node-chart` 故意有兩個 `type: 'calculation'` 的 section（一個解釋「上方三張卡片」、一個解釋「圖表本身」）。React 在 dev mode 每次 InfoDrawer 開啟都會噴 warning。**已修**：改 key 為 `${section.type}-${idx}`。
2. **`ResponsiveContainer width(-1) height(-1)`** — 部分 chart 容器在初始 mount 取不到高度，瞬間閃一下。建議檢查所有 ResponsiveContainer 的父容器是否有明確 height。

---

## 4. 全局結論

### ✅ 系統可以撐住的負載
- **後端**：500 並發 user，p95=390ms、錯誤率 0.16%。本機 docker 配置下軟上限約 700–1000。
- **LLM proxy**：100 次連續呼叫 0% 錯誤，p95=1.7s。RAGFlow 不是瓶頸。
- **前端**：200 學生 × 4000 row 資料量下，圖表首次渲染 < 300ms、互動 < 30ms。

### ⚠️ 該修的事
1. **生產 bug**：`InfoDrawer` 重複 key 已修。
2. **生產建議**：uvicorn 加 `--timeout-keep-alive 30` 消除 0.12% 的 transient disconnect。
3. **UX 建議**：所有同步 LLM 互動改用 streaming，或加 skeleton。
4. **檢查**：所有 `ResponsiveContainer` 父容器要有明確 height。

### 🚫 沒測到的範圍
- POST `/api/answers`（學生交卷）— 寫入路徑沒壓
- N1/N2 摘要連續呼叫的快取效率
- 大量 assignment 列表（>100 筆）的查詢效能
- 真實生產機（雲端）效能 — 本機 docker 結果通常是下限

### 容量規劃（依本機結果線性外推到生產機）
本機 docker 可撐 500 user，生產機通常 CPU/IO 規格較高，**估計可支援 1500–2000 並發學生**。但「並發學生」≠「同時打 API」—— 一個學生在做測驗時平均每 5-10 秒才打一次 API，所以實際可服務的學生人數會比並發數高 5-10 倍。

---

## 5. 產出物

```
load-tests/
├── README.md                          — 總入口
├── backend_api.py                     — 場景 1 腳本
├── llm_proxy.py                       — 場景 2 腳本
├── frontend_data.mjs                  — 場景 3 大資料產生器
├── frontend_profiling.md              — 場景 3 Chrome 操作指南
└── reports/                           — HTML 報告（gitignored）
    ├── backend_50u.html
    ├── backend_200u.html
    ├── backend_500u.html
    ├── llm_proxy_smoke.html
    └── llm_proxy_full.html

public/
└── loadtest-recharts.html             — 場景 3b 獨立 harness

docs/
└── load-test-report-2026-05-22.md     — 本報告

修改的程式碼：
└── src/components/InfoDrawer.jsx     — 修 key="calculation" 重複 bug
```
