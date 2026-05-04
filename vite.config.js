import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_DEV_BACKEND_URL || 'http://localhost:8000'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.PORT) || 3000,
      host: true,
      allowedHosts: ['sci-diang.hsueh.tw'],
      // dev：把 /api/* 轉到後端（避免 CORS、與 prod nginx 行為一致）
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
