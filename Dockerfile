# ================================
# 第一階段：用 Node.js 把 React 打包成靜態檔
# ================================
FROM node:22-alpine AS builder

WORKDIR /app

# 先複製 package.json，讓 npm install 可以被 Docker 快取
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# 複製所有原始碼再打包
COPY . .
RUN npm run build

# ================================
# 第二階段：用 Nginx 提供靜態檔服務
# ================================
FROM nginx:alpine AS runner

# 複製自訂 Nginx 設定（支援 React Router 的前端路由）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製第一階段打包好的靜態檔
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
