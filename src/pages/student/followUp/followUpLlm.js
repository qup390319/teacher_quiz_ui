/**
 * 第二層追問對話 — LLM driver
 *
 * 把對話 history + 動態組合的 system prompt 送到 /api/llm/chat，
 * 要求 LLM 回傳結構化 JSON：
 *   { phase, round, assistantMessage, chips, feedback, finalDiagnosis }
 *
 * 對外暴露 runFollowUpTurnLlm(state, userMessage)，回傳值與 rule-based
 * processStudentReply 對齊（{ kind: 'next', aiMessage, chips, ... } 或
 * { kind: 'final', finalDiagnosis }），讓 dispatcher 透明切換。
 *
 * 詳見 spec-09 §followup。
 */
import { chat } from '../../../llm/index.js';
import { getNodeById } from '../../../data/knowledgeGraph.js';
import { normalizeErrorType } from '../../../data/errorTypes.js';
import {
  buildFollowUpSystemPrompt,
  hasFollowUpPromptFor,
} from './followUpPrompts.js';

const MAX_ROUNDS = 4; // 每題追問硬上限（為控制施測總時長 ~15 分鐘，8→4）。見 spec-05 §2.2

/* ────────────────────────────────────────────────────────────
 *  容錯 JSON 抽取
 *  LLM 偶爾會包 ```json``` 或前後加說明文字
 * ──────────────────────────────────────────────────────────── */
function extractJsonObject(text) {
  if (!text) return null;
  const trimmed = text.trim();

  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct === 'object') return direct;
  } catch {
    // fall through
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // fall through
    }
  }

  // 尋找第一個 balanced {...}
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
        try { return JSON.parse(trimmed.slice(start, i + 1)); }
        catch { return null; }
      }
    }
  }
  return null;
}

/* ────────────────────────────────────────────────────────────
 *  loose 格式回退解析
 *  LLM 偶爾不回 JSON，而是「第一行純文字 + key: value 逐行」的鬆散格式：
 *    你說「…」，會是 ① 還是 ②？
 *    chips: ["…","…","不知道"]
 *    feedback: "…"
 *    finalDiagnosis: null
 *  這裡把前導文字當 assistantMessage，逐行抽 key: value 重建物件。
 * ──────────────────────────────────────────────────────────── */
const LOOSE_KEY_CANON = {
  phase: 'phase',
  round: 'round',
  assistantmessage: 'assistantMessage',
  chips: 'chips',
  feedback: 'feedback',
  finaldiagnosis: 'finalDiagnosis',
};

function parseLooseValue(raw) {
  const s = String(raw).trim().replace(/,\s*$/, '').trim();
  if (s === '') return undefined;
  try { return JSON.parse(s); } catch { /* fall through */ }
  if (/^-?\d+$/.test(s)) return Number(s);
  if (s === 'null') return null;
  if (s === 'true' || s === 'false') return s === 'true';
  const quoted = s.match(/^["'“”]([\s\S]*)["'“”]$/);
  if (quoted) return quoted[1];
  return s;
}

function extractLooseObject(text) {
  if (!text) return null;
  const cleaned = text.replace(/```[a-z]*/gi, '').replace(/```/g, '').trim();
  const keyRe = new RegExp(
    `^\\s*["']?(${Object.keys(LOOSE_KEY_CANON).join('|')})["']?\\s*[:：]\\s*([\\s\\S]*)$`,
    'i',
  );
  const out = {};
  const leading = [];
  let curKey = null;
  let curBuf = [];
  const flush = () => {
    if (curKey == null) return;
    const v = parseLooseValue(curBuf.join('\n'));
    if (v !== undefined) out[LOOSE_KEY_CANON[curKey.toLowerCase()]] = v;
    curKey = null;
    curBuf = [];
  };
  for (const line of cleaned.split(/\r?\n/)) {
    const m = line.match(keyRe);
    if (m) { flush(); curKey = m[1]; curBuf = [m[2]]; }
    else if (curKey != null) { curBuf.push(line); }
    else { leading.push(line); }
  }
  flush();
  if (Object.keys(out).length === 0) return null;
  if (out.assistantMessage == null) {
    const lead = leading.join('\n').trim();
    if (lead) out.assistantMessage = lead;
  }
  return out.assistantMessage || out.finalDiagnosis ? out : null;
}

/* ────────────────────────────────────────────────────────────
 *  欄位驗證 / normalize
 * ──────────────────────────────────────────────────────────── */
const VALID_PHASES = new Set(['belief', 'challenge', 'cause', 'final']);
const VALID_FINAL_STATUS = new Set(['CORRECT', 'MISCONCEPTION', 'UNCERTAIN']);
const VALID_QUALITY = new Set(['SOLID', 'PARTIAL', 'WEAK', 'GUESSING']);
const VALID_CHANGE_TYPE = new Set(['CONFIRMED', 'UPGRADED', 'DOWNGRADED']);

function clampInt(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function normalizeChips(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = raw
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0 && s.length <= 12)
    .slice(0, 5);
  return cleaned.length >= 2 ? cleaned : null;
}

function normalizeCauseIds(raw) {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((n) => Number.isInteger(n) && n >= 1 && n <= 9);
  return Array.from(new Set(valid)).slice(0, 2);
}

function normalizeFinalDiagnosis(raw, ctx) {
  if (!raw || typeof raw !== 'object') return null;
  const finalStatus = VALID_FINAL_STATUS.has(raw.finalStatus)
    ? raw.finalStatus
    : (ctx.isCorrect ? 'CORRECT' : 'MISCONCEPTION');
  const reasoningQuality = VALID_QUALITY.has(raw.reasoningQuality)
    ? raw.reasoningQuality
    : 'PARTIAL';

  let misconceptionCode = typeof raw.misconceptionCode === 'string'
    ? raw.misconceptionCode.trim() || null
    : null;
  if (finalStatus === 'CORRECT') misconceptionCode = null;

  // errorType：LLM 必須輸出三類之一或 null；CORRECT 強制 null
  const errorType = finalStatus === 'CORRECT' ? null : normalizeErrorType(raw.errorType);

  const causeIds = normalizeCauseIds(raw.causeIds);
  const causeEvidence = typeof raw.causeEvidence === 'string'
    ? raw.causeEvidence.trim().slice(0, 200)
    : '';
  const aiSummary = typeof raw.aiSummary === 'string' && raw.aiSummary.trim()
    ? raw.aiSummary.trim().slice(0, 200)
    : '謝謝你跟我聊這麼多～你的想法我都收到了！';

  // statusChange 校正
  const fromVal = ctx.isCorrect ? 'CORRECT' : (ctx.misconceptionId || 'UNKNOWN');
  let toVal;
  let changeType;
  if (raw.statusChange && typeof raw.statusChange === 'object'
      && VALID_CHANGE_TYPE.has(raw.statusChange.changeType)) {
    changeType = raw.statusChange.changeType;
    toVal = typeof raw.statusChange.to === 'string'
      ? raw.statusChange.to
      : (finalStatus === 'CORRECT' ? 'CORRECT' : misconceptionCode || 'UNKNOWN');
  } else {
    // 從 isCorrect + finalStatus 推 changeType
    if (ctx.isCorrect && finalStatus === 'CORRECT') changeType = 'CONFIRMED';
    else if (ctx.isCorrect && finalStatus !== 'CORRECT') changeType = 'DOWNGRADED';
    else if (!ctx.isCorrect && finalStatus === 'CORRECT') changeType = 'UPGRADED';
    else changeType = 'CONFIRMED';
    toVal = finalStatus === 'CORRECT' ? 'CORRECT' : (misconceptionCode || ctx.misconceptionId || 'UNKNOWN');
  }

  return {
    finalStatus,
    misconceptionCode,
    reasoningQuality,
    errorType,
    causeIds,
    causeEvidence,
    aiSummary,
    statusChange: { from: fromVal, to: toVal, changeType },
  };
}

function normalizeLlmResponse(obj, ctx, prevRound) {
  if (!obj || typeof obj !== 'object') return null;

  const phase = VALID_PHASES.has(obj.phase) ? obj.phase : 'belief';
  const round = clampInt(obj.round, 1, MAX_ROUNDS, Math.min(prevRound + 1, MAX_ROUNDS));
  const assistantMessage = typeof obj.assistantMessage === 'string'
      && obj.assistantMessage.trim()
    ? obj.assistantMessage.trim()
    : '我想再多聽你說一點，你覺得呢？';
  const chips = phase === 'final' ? null : normalizeChips(obj.chips);
  const feedback = typeof obj.feedback === 'string' && obj.feedback.trim()
    ? obj.feedback.trim().slice(0, 30)
    : null;

  if (phase === 'final') {
    const finalDiagnosis = normalizeFinalDiagnosis(obj.finalDiagnosis, ctx);
    if (!finalDiagnosis) return null;
    return { phase, round, assistantMessage, chips: null, feedback, finalDiagnosis };
  }
  return { phase, round, assistantMessage, chips, feedback, finalDiagnosis: null };
}

/* ────────────────────────────────────────────────────────────
 *  訊息組裝
 * ──────────────────────────────────────────────────────────── */
function buildMessages({ systemPrompt, conversationLog, userMessage, prevRound, prevPhase }) {
  const msgs = [{ role: 'system', content: systemPrompt }];

  for (const m of conversationLog) {
    if (!m || !m.content) continue;
    msgs.push({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  // 把 FSM 狀態當作 system 注入
  const nextRound = Math.min(prevRound + 1, MAX_ROUNDS);
  msgs.push({
    role: 'system',
    content:
      '【對話狀態交接】\n'
      + `上一輪 phase=${prevPhase}, round=${prevRound}\n`
      + `本輪 round=${nextRound}\n`
      + (nextRound >= MAX_ROUNDS
        ? '本輪是最後一輪，phase 必須=final，必須輸出完整 finalDiagnosis。'
        : '依 belief → challenge → cause → final 順序推進；不可跳階段。'),
  });

  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}

/* ────────────────────────────────────────────────────────────
 *  公開 API
 * ──────────────────────────────────────────────────────────── */

/**
 * 是否有為此節點登錄追問 prompt（dispatcher 用此決定走 LLM 或 fallback）。
 * @param {string} knowledgeNodeId
 */
export function hasLlmFollowUpFor(knowledgeNodeId) {
  return hasFollowUpPromptFor(knowledgeNodeId);
}

/**
 * 跑一輪 LLM 追問對話。
 *
 * @param {Object} state - 對話狀態
 * @param {string} state.knowledgeNodeId
 * @param {string|null} state.misconceptionId
 * @param {boolean} state.isCorrect
 * @param {string} state.questionStem
 * @param {string} state.selectedOptionContent
 * @param {Array<{role:'ai'|'student', content:string}>} state.conversationLog
 * @param {number} state.round - 本輪「進來時」的輪數（1 = 第一次學生回覆）
 * @param {string} state.phase - 上一輪的 phase
 * @param {string} userMessage - 學生本次輸入
 * @returns {Promise<Object>} { kind: 'next' | 'final', aiMessage?, chips?, feedback?, phase?, round?, finalDiagnosis? }
 *   失敗時 throw（呼叫端可 fallback 到 rule-based）
 */
export async function runFollowUpTurnLlm(state, userMessage) {
  const node = getNodeById(state.knowledgeNodeId);
  if (!node) {
    throw new Error(`[followUpLlm] unknown knowledgeNode: ${state.knowledgeNodeId}`);
  }
  if (!hasFollowUpPromptFor(state.knowledgeNodeId)) {
    throw new Error(`[followUpLlm] no prompt registered for ${state.knowledgeNodeId}`);
  }

  const systemPrompt = buildFollowUpSystemPrompt({
    knowledgeNode: node,
    misconceptionId: state.misconceptionId,
    isCorrect: !!state.isCorrect,
    questionStem: state.questionStem ?? '',
    selectedOptionContent: state.selectedOptionContent ?? '',
  });

  const prevRound = clampInt(state.round, 1, MAX_ROUNDS, 1);
  const prevPhase = VALID_PHASES.has(state.phase) ? state.phase : 'belief';

  const messages = buildMessages({
    systemPrompt,
    conversationLog: state.conversationLog ?? [],
    userMessage,
    prevRound,
    prevPhase,
  });

  const response = await chat({
    messages,
    temperature: 0.4,
    maxTokens: 700,
    responseFormat: 'json_object', // 強制 OpenAI 回合法 JSON；loose 解析器仍作後備
  });

  const ctx = { isCorrect: !!state.isCorrect, misconceptionId: state.misconceptionId };
  let parsed = extractJsonObject(response.content);
  let normalized = normalizeLlmResponse(parsed, ctx, prevRound);
  if (!normalized) {
    // JSON 解析失敗 → 試 loose 格式回退（key: value 逐行 + 前導文字當 assistantMessage）
    parsed = extractLooseObject(response.content);
    normalized = normalizeLlmResponse(parsed, ctx, prevRound);
    if (normalized) {
      console.warn('[followUpLlm] recovered via loose-format parser');
    }
  }
  if (!normalized) {
    throw new Error(
      `[followUpLlm] failed to parse LLM JSON: ${response.content?.slice(0, 200)}`,
    );
  }

  if (normalized.finalDiagnosis) {
    return {
      kind: 'final',
      finalDiagnosis: normalized.finalDiagnosis,
      // 帶上最後一句 AI message，呼叫端可選擇是否顯示
      aiMessage: normalized.assistantMessage,
    };
  }

  return {
    kind: 'next',
    aiMessage: normalized.assistantMessage,
    chips: normalized.chips,
    feedback: normalized.feedback,
    phase: normalized.phase,
    round: normalized.round,
  };
}

export const FOLLOWUP_MAX_ROUNDS = MAX_ROUNDS;
