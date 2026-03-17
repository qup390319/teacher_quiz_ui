# Teacher Quiz 前端畫面雛形

教師出題系統的前端畫面原型，使用 React + Vite + Tailwind CSS 開發。

---

## 目錄

- [系統需求](#系統需求)
- [第一次啟動（完整步驟）](#第一次啟動完整步驟)
- [日常操作指令](#日常操作指令)
- [查看 Log](#查看-log)
- [常見問題排除](#常見問題排除)

---

## 系統需求

只需要安裝 **Docker**，不需要安裝 Node.js。

### 在 Ubuntu / Debian VM 上安裝 Docker

```bash
# 更新套件列表
sudo apt update

# 安裝 Docker
sudo apt install -y docker.io docker-compose-plugin

# 讓目前的使用者可以執行 Docker（不需要每次加 sudo）
sudo usermod -aG docker $USER

# 登出再重新登入後生效，或先用這個指令讓設定立刻套用
newgrp docker

# 確認安裝成功
docker --version
docker compose version
```

---

## 第一次啟動（完整步驟）

### 步驟 1：把專案傳到 VM 上

在你的本機（Windows）執行，把整個專案資料夾上傳到 VM：

```bash
# 範例（把整個 teacher_quiz_0223 資料夾上傳到 VM 的家目錄）
scp -r ./teacher_quiz_0223 your_user@VM_IP:~/teacher_quiz_0223
```

或者直接用 GitHub：

```bash
# 在 VM 上執行
git clone https://github.com/你的帳號/你的repo.git
cd teacher_quiz_0223
```

### 步驟 2：在 VM 上進入專案資料夾

```bash
cd ~/teacher_quiz_0223
```

### 步驟 3：啟動服務

```bash
docker compose up -d
```

這個指令做了什麼：
- `docker compose up`：根據 `docker-compose.yml` 啟動所有服務
- `-d`：在背景執行（不會佔住你的終端機視窗）
- 第一次執行會自動 build image，需要等幾分鐘

### 步驟 4：確認服務已啟動

```bash
docker compose ps
```

看到 `Status` 欄位顯示 `Up` 或 `running (healthy)` 就表示成功了。

### 步驟 5：打開瀏覽器

在瀏覽器輸入：`http://VM的IP:3000`

---

## 日常操作指令

以下指令都要在專案資料夾（有 `docker-compose.yml` 的地方）執行。

### 啟動服務

```bash
docker compose up -d
```

### 停止服務

```bash
docker compose down
```

### 重新啟動服務

```bash
docker compose restart
```

### 更新程式碼後重新部署

如果你修改了程式碼，需要重新 build image：

```bash
# 重新 build 並啟動（-d 背景執行，--build 強制重新打包）
docker compose up -d --build
```

---

## 查看 Log

### 查看即時 log（會持續輸出，按 Ctrl+C 離開）

```bash
docker compose logs -f
```

### 查看最後 100 行 log

```bash
docker compose logs --tail=100
```

### 只看 frontend 服務的 log

```bash
docker compose logs -f frontend
```

---

## 常見問題排除

### 問題 1：Port 3000 已被佔用

錯誤訊息：`bind: address already in use`

解決方法：先找出哪個程式佔用了 port 3000，把它關掉：

```bash
# 查看誰在用 port 3000
sudo lsof -i :3000
# 或
sudo ss -tlnp | grep 3000

# 關掉佔用的程式（把下面的 PID 換成上面查到的數字）
sudo kill -9 PID
```

### 問題 2：打開網頁看到 502 Bad Gateway

表示 Nginx 有啟動但服務內部有問題，查看 log：

```bash
docker compose logs --tail=50
```

### 問題 3：頁面一直轉圈、無法載入

確認 container 是否正常運作：

```bash
docker compose ps
```

如果顯示 `unhealthy` 或 `restarting`，試試重新部署：

```bash
docker compose down
docker compose up -d --build
```

### 問題 4：React Router 路由失效（重新整理頁面顯示 404）

這個已經在 `nginx.conf` 裡設定好了（`try_files $uri $uri/ /index.html`），如果還是發生，確認 `nginx.conf` 有正確複製到 container 裡：

```bash
docker compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### 問題 5：如何完全清除 Docker 資源重來？

```bash
# 停止並刪除 container（不會刪掉 image）
docker compose down

# 如果想連 image 一起刪掉重 build
docker compose down --rmi all

# 重新啟動
docker compose up -d --build
```

---

## 專案結構

```
teacher_quiz_0223/
├── src/                    # React 原始碼
│   ├── pages/              # 各頁面元件
│   ├── components/         # 共用元件
│   ├── context/            # 全域狀態管理
│   └── data/               # 假資料（畫面雛形用）
├── public/                 # 靜態資源
├── Dockerfile              # Docker 建構設定
├── nginx.conf              # Nginx 伺服器設定
├── docker-compose.yml      # Docker Compose 服務定義
├── .env.example            # 環境變數範本（複製成 .env 填入實際值）
├── package.json            # 前端套件清單
└── vite.config.js          # Vite 打包設定
```
