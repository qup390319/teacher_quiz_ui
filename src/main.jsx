import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { applyFontSize } from './lib/fontSize.js'
import { loadKnowledgeGraph } from './data/knowledgeGraph.js'

applyFontSize()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s — avoid hammering backend on tab focus
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

// W5b：在 render 之前先把 knowledge graph 從 /api/knowledge-nodes 拉下來填入。
// 這樣 30+ 個既有 consumer 不必改 — 它們繼續以同步方式讀取 knowledgeNodes 陣列。
// fetch 失敗時陣列維持空，UI 顯示「無資料」狀態。
const bootstrap = async () => {
  try {
    await loadKnowledgeGraph();
  } catch (err) {
    console.error('[bootstrap] loadKnowledgeGraph failed:', err);
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
};

bootstrap();
