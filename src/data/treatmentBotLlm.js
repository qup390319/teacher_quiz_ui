/**
 * Treatment Bot — LLM-driven turn engine
 *
 * 把學生對話 + system prompt 送到 /api/llm/chat，要求 LLM 回傳結構化 JSON：
 *   { phase, step, stage, assistantMessage, feedback, hintLevel, requiresRestatement }
 *
 * 回傳值與 runTreatmentTurnMock 的形狀 100% 相同，因此 UI 不需要改。
 * 詳見 spec-08 §7、spec-09 §8。
 */
import { chat } from '../llm/index.js';
import { getTreatmentSystemPrompt } from './treatmentBotPrompts.js';

/* ────────────────────────────────────────────────────────────
 *  JSON 抽取（容錯）
 *  LLM 偶爾會把 JSON 包在 ```json``` 或前後加說明文字，
 *  這裡用三段式策略：直接解析 → 去 code fence → 抓第一個 {...} balanced block
 * ──────────────────────────────────────────────────────────── */
function extractJsonObject(text) {
  if (!text) return null;
  const trimmed = text.trim();

  // 1. 直接 parse
  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct === 'object') return direct;
  } catch {
    // fall through
  }

  // 2. 去掉 ```json ... ``` / ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // fall through
    }
  }

  // 3. 找第一個 { 到對應的 } （考慮字串內的大括號）
  const start = trimmed.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const slice = trimmed.slice(start, i + 1);
        try {
          const parsed = JSON.parse(slice);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {
          return null;
        }
        return null;
      }
    }
  }
  return null;
}

/* ────────────────────────────────────────────────────────────
 *  欄位驗證 / 收斂
 * ──────────────────────────────────────────────────────────── */
const VALID_PHASES = new Set(['diagnosis', 'apprenticeship', 'cer', 'completed']);
const VALID_STAGES = new Set(['claim', 'evidence', 'reasoning', 'revise', 'complete']);

function clampInt(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function normalizeBotResponse(obj, prevState) {
  if (!obj || typeof obj !== 'object') return null;

  const step = clampInt(obj.step, 1, 7, prevState.step + 1);
  const phase = VALID_PHASES.has(obj.phase) ? obj.phase : phaseForStep(step);
  const stage = VALID_STAGES.has(obj.stage) ? obj.stage : stageForStep(step);
  const hintLevel = clampInt(obj.hintLevel, 0, 3, 0);
  const assistantMessage = typeof obj.assistantMessage === 'string' && obj.assistantMessage.trim()
    ? obj.assistantMessage.trim()
    : '我想再聽你多說一點，可以再講講你的想法嗎？';
  const feedback = typeof obj.feedback === 'string' && obj.feedback.trim()
    ? obj.feedback.trim()
    : '你做得很棒，繼續！';
  const requiresRestatement = !!obj.requiresRestatement;

  return { phase, step, stage, assistantMessage, feedback, hintLevel, requiresRestatement };
}

// 對齊原系統 prompt【新版狀態機】：
//   diagnosis = step1-2 / apprenticeship = step3-5 / cer = step6 / completed = step7
//   claim / evidence / reasoning(modeling+coaching+scaffolding) / revise(CER) / complete
function stageForStep(step) {
  if (step <= 1) return 'claim';
  if (step === 2) return 'evidence';
  if (step >= 3 && step <= 5) return 'reasoning';
  if (step === 6) return 'revise';
  return 'complete';
}

function phaseForStep(step) {
  if (step <= 2) return 'diagnosis';
  if (step <= 5) return 'apprenticeship';
  if (step === 6) return 'cer';
  return 'completed';
}

/* ────────────────────────────────────────────────────────────
 *  訊息組裝
 * ──────────────────────────────────────────────────────────── */
function buildMessages({ systemPrompt, history, userMessage, prevState }) {
  const msgs = [{ role: 'system', content: systemPrompt }];

  for (const m of history) {
    if (!m || !m.text) continue;
    msgs.push({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    });
  }

  // 把目前 FSM 狀態當作 system 注入，幫助 LLM 嚴守「step 只能 +0 或 +1」
  msgs.push({
    role: 'system',
    content:
      '【對話狀態交接】\n'
      + `上一輪 phase=${prevState.phase}, step=${prevState.step}, stage=${prevState.stage}, hintLevel=${prevState.hintLevel}\n`
      + `本輪 step 只能是 ${prevState.step} 或 ${Math.min(prevState.step + 1, 7)}。`,
  });

  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}

/* ────────────────────────────────────────────────────────────
 *  公開 API
 * ──────────────────────────────────────────────────────────── */

/**
 * 是否有為這題登錄 LLM prompt（呼叫端用此決定走 LLM 或 mock）。
 */
export function hasLlmPromptFor(scenarioQuizId, questionIndex) {
  return getTreatmentSystemPrompt(scenarioQuizId, questionIndex) !== null;
}

/**
 * 跑一輪 LLM 對話。
 *
 * @param {Object} state - 與 runTreatmentTurnMock 同形狀
 * @param {string} userMessage
 * @returns {Promise<Object>} BotResponse；失敗時 throw（呼叫端可 fallback 到 mock）
 */
export async function runTreatmentTurnLlm(state, userMessage) {
  const systemPrompt = getTreatmentSystemPrompt(state.scenarioQuizId, state.questionIndex);
  if (!systemPrompt) {
    throw new Error('[treatmentBotLlm] no system prompt registered');
  }

  const prevState = {
    phase: state.phase ?? 'diagnosis',
    step: state.step ?? 0,
    stage: state.stage ?? 'claim',
    hintLevel: state.hintLevel ?? 0,
  };

  const messages = buildMessages({
    systemPrompt,
    history: state.history ?? [],
    userMessage,
    prevState,
  });

  const response = await chat({
    messages,
    temperature: 0.3, // 偏低，提升 JSON 結構穩定性
    maxTokens: 800,
  });

  const parsed = extractJsonObject(response.content);
  const normalized = normalizeBotResponse(parsed, prevState);
  if (!normalized) {
    throw new Error(`[treatmentBotLlm] failed to parse JSON: ${response.content?.slice(0, 200)}`);
  }
  return normalized;
}
