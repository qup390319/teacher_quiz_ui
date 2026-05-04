/**
 * LLM 統一入口
 *
 * P2 起前端唯一 provider 為 'backend'，所有對話走後端 /api/llm/*。
 * vLLM endpoint / api key 已從前端 bundle 中徹底移除。
 *
 * 用法：
 *   import { chat, chatStream } from '@/llm';
 *
 *   const res = await chat({ messages: [{ role: 'user', content: 'Hi' }] });
 *
 *   for await (const chunk of chatStream({ messages })) {
 *     if (chunk.delta) appendToUi(chunk.delta);
 *   }
 */

import { LLM_PROVIDER } from './config.js';
import createBackendProvider from './providers/backendProvider.js';

const PROVIDER_FACTORIES = {
  backend: createBackendProvider,
};

let cachedProvider = null;

export function getProvider() {
  if (cachedProvider) return cachedProvider;
  const factory = PROVIDER_FACTORIES[LLM_PROVIDER];
  if (!factory) {
    throw new Error(
      `[LLM] 不支援的 provider：${LLM_PROVIDER}。目前支援：${Object.keys(PROVIDER_FACTORIES).join(', ')}`,
    );
  }
  cachedProvider = factory();
  return cachedProvider;
}

/**
 * 一次取得完整回覆
 * @param {import('./types.js').ChatOptions} options
 * @returns {Promise<import('./types.js').ChatResponse>}
 */
export function chat(options) {
  return getProvider().chat(options);
}

/**
 * 串流式回覆，每個 chunk 含一段新增文字
 * @param {import('./types.js').ChatOptions} options
 * @returns {AsyncGenerator<import('./types.js').ChatStreamChunk>}
 */
export function chatStream(options) {
  return getProvider().chatStream(options);
}

export { LLM_PROVIDER } from './config.js';
