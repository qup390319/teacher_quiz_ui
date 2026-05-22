# 場景 3：前端大量資料壓測 — Profiler 操作步驟

## 1. 產生大資料

```bash
# 預設：1 個班、200 學生、約 4000 個作答 row
node load-tests/frontend_data.mjs

# 自訂規模
node load-tests/frontend_data.mjs --students 500 --classes 3
```

輸出位置：`src/data/__loadtest__/`（git ignored）

## 2. 啟動 dev server 並掛載大資料

```bash
# Windows PowerShell
$env:VITE_USE_LOADTEST_DATA = "1"; npm run dev

# bash / zsh
VITE_USE_LOADTEST_DATA=1 npm run dev
```

> 注意：前端程式碼預設**不會**自動載入這份大資料。你需要在要測的頁面（例如教師端 dashboard / 迷思成因頁）裡加上一段條件 import：
>
> ```js
> if (import.meta.env.VITE_USE_LOADTEST_DATA === "1") {
>   const { loadtestClasses } = await import("../../data/__loadtest__/classData.large.js");
>   // 把 loadtestClasses 餵給對應的 state / context
> }
> ```
>
> 這段切換邏輯**沒有**自動寫進 codebase（會污染 production），請在壓測時手動加、測完移除（或寫在 feature branch）。

## 3. 錄製 Chrome Performance

1. 開 Chrome DevTools → Performance 面板
2. 勾選 **"Record memory"**、CPU throttling 設 **4× slowdown**（模擬中低階教師筆電）
3. 點紅色錄製按鈕
4. 操作流程：
   - 進教師端 dashboard
   - 點開一個班級
   - 點開 quiz-001 結果頁
   - 在 Recharts 圖表上 hover 幾個 data point
   - 切換到迷思成因分析頁
5. 停止錄製，看：
   - **Scripting 時間**（藍色長條）：< 1s 為佳
   - **Rendering + Painting**（紫綠色）：< 500ms 為佳
   - **Long tasks**（紅色三角）：應 < 50ms 的 task 多 / 長 task 少
   - **Heap memory**：操作 5 分鐘後不應超過 200MB

## 4. React DevTools Profiler

1. 安裝 React DevTools 擴充功能
2. 切到 Profiler tab → 設定齒輪 → 勾 **"Record why each component rendered"**
3. 錄製一次互動（例如班級切換）
4. 看 Ranked chart：找渲染時間 > 16ms 的元件（會掉 frame）

## 通過標準

| 指標 | 標準 |
|---|---|
| 首次渲染（dashboard 進入） | < 2s |
| Recharts 圖表互動延遲 | < 100ms |
| 長時間操作記憶體成長 | < 50MB / 5 分鐘 |
| 任何 React commit 階段 | < 16ms（60fps） |

## 5. 清理

```bash
# Remove generated mock so dev server reverts to real seed
rm -rf src/data/__loadtest__
```
