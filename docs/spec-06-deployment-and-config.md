# SPEC-06: Deployment & Configuration / 部署與設定規格

## 1. 開發環境設定

### 1.1 Vite 設定
**檔案**: `vite.config.js`

```javascript
{
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['sci-diang.hsueh.tw']
  }
}
```

| 設定項 | 值 | 說明 |
|--------|-----|------|
| port | 3000 | 開發伺服器埠號 |
| host | true | 允許外部存取（0.0.0.0） |
| allowedHosts | `['sci-diang.hsueh.tw']` | 允許的主機名稱 |

### 1.2 ESLint 設定
**檔案**: `eslint.config.js`

- 基於 `@eslint/js` (`^9.39.1`) 推薦規則
- 啟用 `eslint-plugin-react-hooks` 規則（flat config recommended）
- 啟用 `eslint-plugin-react-refresh` 規則（vite config）
- 規則：`no-unused-vars` 設為 **error**，忽略以大寫字母或底線開頭的變數（`varsIgnorePattern: '^[A-Z_]'`）
- 使用 `defineConfig` + `globalIgnores(['dist'])` 排除建構產出

### 1.3 環境變數
**檔案**: `.env.example`

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `FRONTEND_URL` | `http://localhost:3000` | 前端 URL |
| `VITE_BACKEND_URL` | `http://localhost:8000` | 後端 API URL（預留） |

---

## 2. Docker 部署

### 2.1 Dockerfile（多階段建構）
**檔案**: `Dockerfile`

**第一階段 — Builder**:
- 基礎映像：`node:22-alpine`
- 工作目錄：`/app`
- 執行 `npm ci --frozen-lockfile` 安裝依賴
- 執行 `npm run build` 建構靜態檔

**第二階段 — Runner**:
- 基礎映像：`nginx:alpine`
- 複製 `nginx.conf` 至 `/etc/nginx/conf.d/default.conf`
- 複製 Builder 階段的 `/app/dist` 至 `/usr/share/nginx/html`
- 暴露 port 80
- 啟動命令：`nginx -g "daemon off;"`

### 2.2 Docker Compose
**檔案**: `docker-compose.yml`

| 設定項 | 值 |
|--------|-----|
| 服務名稱 | `frontend` |
| 端口映射 | `3000:80` |
| 重啟策略 | `unless-stopped` |
| 健康檢查 | `wget http://localhost/health` |

### 2.3 Nginx 設定
**檔案**: `nginx.conf`

**核心設定**:
- React Router SPA 支援：`try_files $uri $uri/ /index.html`
- 靜態資源快取：js/css/images 設 1 年到期
- 健康檢查端點：`/health` → 回傳 200 "ok"

---

## 3. 主題色彩設定

**檔案**: `src/constants/theme.js`

### 3.1 主色調 (PRIMARY)

| 色階 | HEX 值 | 用途 |
|------|--------|------|
| 50 | #F7FAF2 | 最淺背景 |
| 100 | #EDF6E3 | 淺背景 |
| 200 | #E2F4D8 | 卡片背景 |
| 300 | #C4E5AA | 邊框/分隔 |
| 400 | #A7D696 | **主色調**（品牌色） |
| 500 | #8FC87A | 按鈕 hover |
| 600 | #5A8A5C | 深色強調 |
| 700 | #3D5A3E | 主要文字色 |
| 800 | #2D3436 | 深色文字 |
| 900 | #1E2420 | 最深色 |

### 3.2 語意色彩

| 語意 | 用途 | 淺色 | 深色 |
|------|------|------|------|
| Primary (綠) | 品牌/主題 | — | #A7D696 |
| Blue (藍) | 正確/成功/學生端 | #D6EAF8 | #5DADE2 |
| Yellow (黃) | 教學建議/提示 | #FEF9E7 | #D4AC0D |
| Pink (粉) | 迷思/警示 | #FDE2E4 | #E74C5E |
| Purple (紫) | 次要/進階概念 | #F3E5F5 | #AF7AC5 |

### 3.3 知識節點群組色彩 (NODE_GROUP_COLORS)

共 5 組視覺群組，每組包含：
- `bg`: 背景色 Tailwind class
- `border`: 邊框色 Tailwind class
- `badge`: 徽章色 Tailwind class
- `dot`: 圓點色 Tailwind class
- `accent`: 強調色 Tailwind class

| 群組 | 背景色 | 圓點色 |
|------|--------|--------|
| 1 | #D6EAF8 (藍) | #5DADE2 |
| 2 | #FDE2E4 (粉) | #F28B95 |
| 3 | #E2F4D8 (綠) | #A7D696 |
| 4 | #FEF9E7 (黃) | #F4D03F |
| 5 | #F3E5F5 (紫) | #AF7AC5 |

---

## 4. 專案依賴

### 4.1 生產依賴 (dependencies)
| 套件 | 版本 | 用途 |
|------|------|------|
| react | ^19.2.0 | UI 框架 |
| react-dom | ^19.2.0 | React DOM 渲染 |
| react-router-dom | ^7.13.1 | 前端路由 |
| recharts | ^3.7.0 | 圖表視覺化 |
| pptxgenjs | ^4.0.1 | PowerPoint 簡報生成 |
| puppeteer | ^24.39.1 | 瀏覽器自動化（截圖/PDF） |

### 4.2 開發依賴 (devDependencies)
| 套件 | 版本 | 用途 |
|------|------|------|
| vite | ^7.3.1 | 建構工具 |
| @vitejs/plugin-react | ^5.1.1 | Vite React 插件 |
| tailwindcss | ^4.2.1 | CSS 框架 |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite 插件 |
| eslint | ^9.39.1 | 程式碼檢查 |
| eslint-plugin-react-hooks | ^7.0.1 | React Hooks 規則 |
| eslint-plugin-react-refresh | ^0.4.24 | Fast Refresh 規則 |
| globals | ^16.5.0 | ESLint 全域變數 |
| @types/react | ^19.2.7 | React 型別定義 |
| @types/react-dom | ^19.2.3 | React DOM 型別定義 |

### 4.3 Module 類型
- `"type": "module"` — 使用 ES Modules
