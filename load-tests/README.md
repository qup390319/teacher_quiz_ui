# SciLens 壓力測試 (Load Tests)

本目錄包含三個獨立的壓測情境。所有腳本不污染 production 程式碼，預設關閉。

## 前置條件

| 場景 | 需要 |
|---|---|
| 1. backend_api | 後端跑起來 (`docker compose up backend db`)、seed 已執行 |
| 2. llm_proxy | 後端 + vLLM/RAGFlow 連線正常、`LLM_BUDGET` env var 已設 |
| 3. frontend_data | Node.js ≥ 18、前端 dev server (`npm run dev`) |

Locust 已在 `backend/pyproject.toml` 的 dev group。在 `backend/` 目錄執行 `uv sync --dev` 安裝。

---

## 場景 1：後端 API 併發壓測

模擬教師與學生同時操作後端，量 p50/p95/p99 latency 與錯誤率。**排除 LLM 端點**（場景 2 處理）。

### 執行

```bash
cd backend
uv run locust -f ../load-tests/backend_api.py \
  --host http://localhost:8000 \
  --users 200 --spawn-rate 20 --run-time 3m \
  --headless --html ../load-tests/reports/backend_api.html
```

階梯式測試（建議手動跑三輪：50 → 200 → 500 users）。

### 通過標準

- p95 latency < 500ms
- 錯誤率 < 1%
- PostgreSQL 連線池未耗盡（`docker stats` 看 DB CPU < 80%）

---

## 場景 2：LLM / RAGFlow 壓測（有預算上限）

`/api/llm/chat`、`/api/llm/analyze-cause`、`/api/ai/distractor-suggest` 三條線。

### 執行

```bash
cd backend
# 預設上限 100 次 LLM 呼叫，達標自動停止
LLM_BUDGET=100 uv run locust -f ../load-tests/llm_proxy.py \
  --host http://localhost:8000 \
  --users 10 --spawn-rate 2 --run-time 10m \
  --headless --html ../load-tests/reports/llm_proxy.html
```

**注意**：併發超過 10 容易觸發 vLLM rate limit；想跑大量請先確認上游配額。

### 通過標準

- p95 < 8s（LLM 本身慢，標準寬鬆）
- 錯誤率 < 5%（502 / timeout 計入）
- proxy 在 timeout 時正確回 502，不要 500

---

## 場景 3：前端大量資料壓測

模擬「五年甲班 200 人、每人答完兩份題組」的資料量，量 Recharts 圖表渲染與互動。

### 執行

```bash
# 1. 產出放大版 mock 到 src/data/__loadtest__/
node load-tests/frontend_data.mjs --students 200

# 2. 啟動 dev server 並掛載大資料
VITE_USE_LOADTEST_DATA=1 npm run dev

# 3. 開 Chrome DevTools Performance 錄製
# 詳細步驟見 load-tests/frontend_profiling.md
```

### 通過標準

- 教師端 dashboard 首次渲染 < 2s
- Recharts 圖表互動（hover / click）< 100ms
- 無記憶體洩漏（連續操作 5 分鐘，heap 不超過 200MB）

---

## 報告輸出位置

所有 HTML 報告寫到 `load-tests/reports/`（git ignored）。手動 commit 摘要至 `docs/deviations.md` 若有發現問題。
