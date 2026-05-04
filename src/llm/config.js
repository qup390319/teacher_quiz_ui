/**
 * LLM Config（P2 起精簡版）
 *
 * P2 之後前端不再持有任何 LLM 服務的 endpoint / api key。
 * 所有對話都走後端 /api/llm/*，這裡只保留前端可控的「預設生成參數」。
 */

const env = import.meta.env;

function readNumber(key, fallback) {
  const raw = env[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`[LLM Config] 環境變數 ${key} 必須是數字，目前是「${raw}」`);
  }
  return n;
}

export const LLM_PROVIDER = 'backend';

export const DEFAULT_GENERATION = {
  temperature: readNumber('VITE_LLM_DEFAULT_TEMPERATURE', 0.7),
  maxTokens: readNumber('VITE_LLM_DEFAULT_MAX_TOKENS', 1024),
};
