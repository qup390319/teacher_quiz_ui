/**
 * 治療對話 Mock AI（Cognitive Apprenticeship 機器人）
 *
 * 規格詳見 docs/spec-08-treatment-cognitive-apprenticeship.md §2-3。
 *
 * 介面契約 100% 對齊 eh 系統 server.js 的 RESPONSE_JSON_SCHEMA：
 *   { phase, step, stage, assistantMessage, feedback, hintLevel, requiresRestatement }
 * 未來換成真 LLM 時，UI 完全不用改，只需把 runTreatmentTurn 改成 async fetch。
 *
 * 本 mock 是規則式 (rule-based) 推進，不依賴 NLP；
 * 對話品質由情境考卷的 expertModel 文本提供，bot 只負責「依 step 切換 stage / 包裝對話文字」。
 */
import { getScenarioQuiz } from './scenarioQuizData';

export const STEPS_PER_QUESTION = 7;

/* ────────────────────────────────────────────────────────────
 *  常數：每個 stage 的開場與引導句
 * ──────────────────────────────────────────────────────────── */

const PROMPTS_BY_STAGE = {
  evidence: [
    '你說 "{snippet}"，這是你的主張。能不能告訴我，你是怎麼知道的？證據就是支持你想法的線索或觀察喔！',
    '很好，那讓我們來找找看：在情境裡，有什麼線索可以支持你的主張？',
  ],
  reasoning: [
    '你提到 "{snippet}"，這是很重要的線索。那這個線索為什麼能幫我們判斷呢？也就是你的「推理」。',
    '把證據和主張連起來看，你覺得背後的科學原因是什麼？',
  ],
  revise_modeling: [
    // step=4 必出 modeling 範文
    '好，我來示範專家的思考：\n\n{expertModel}\n\n你覺得這些線索裡，哪一個最能支持你剛才的想法呢？',
  ],
  revise_coaching: [
    '很棒！你的推理越來越完整了。再試一次：用「主張 → 證據 → 推理」的順序，把這題的想法整理一遍給我聽。',
    '把剛剛說過的內容再整理一次：你的主張是什麼？支持的線索是什麼？背後的原因是什麼？',
  ],
  complete: [
    '太棒了！你已經能用主張、證據、推理把整個想法說清楚了。這題我們先到這裡，準備進入下一題！',
  ],
};

const FEEDBACK_BY_CONTEXT = {
  shortReply: '試著說多一點吧！',
  goodEvidence: '找到好線索了！',
  applyModel: '論證越來越完整了！',
  offTopic: '先回到問題本身吧！',
  encourage: '你做得很棒，繼續！',
  start: '試著說說你的看法吧！',
  complete: '完成這一題！',
};

/* ────────────────────────────────────────────────────────────
 *  公開 API：runTreatmentTurn
 * ──────────────────────────────────────────────────────────── */

/**
 * 推進一輪對話。
 *
 * @param {Object} state - 當前對話狀態
 * @param {string} state.scenarioQuizId
 * @param {number} state.questionIndex - 1-based
 * @param {Array<{role:'ai'|'student', text:string}>} state.history
 * @param {'diagnosis'|'apprenticeship'|'completed'} state.phase
 * @param {number} state.step - 1~7
 * @param {'claim'|'evidence'|'reasoning'|'revise'|'complete'} state.stage
 * @param {0|1|2|3} state.hintLevel
 * @param {boolean} state.requiresRestatement
 * @param {string} userMessage - 學生本次輸入
 * @returns {Object} BotResponse
 *   { phase, step, stage, assistantMessage, feedback, hintLevel, requiresRestatement }
 */
export function runTreatmentTurn(state, userMessage) {
  const trimmed = (userMessage ?? '').trim();
  const isShort = trimmed.length > 0 && trimmed.length < 5;
  const isOffTopic = isOffTopicReply(trimmed);

  // step 只進不退
  const nextStep = Math.min(state.step + 1, STEPS_PER_QUESTION);
  const nextStage = stageForStep(nextStep);
  const nextPhase = phaseForStep(nextStep);

  // 取目標題目（用於插入專家示範）
  const quiz = getScenarioQuiz(state.scenarioQuizId);
  const question = quiz?.questions?.[state.questionIndex - 1] ?? null;

  // 產生 AI 回覆
  const assistantMessage = composeAssistantMessage({
    nextStage,
    nextStep,
    question,
    studentSnippet: makeSnippet(trimmed),
  });

  // hintLevel：apprenticeship 階段先升後降（鷹架後漸退）
  const hintLevel = computeHintLevel(nextStep, isShort || isOffTopic);

  // requiresRestatement：太短或離題、且還沒進入 modeling 之前
  const requiresRestatement = (isShort || isOffTopic) && nextStep <= 3;

  // feedback 短評（8~25 字）
  const feedback = computeFeedback({
    nextStep,
    nextStage,
    isShort,
    isOffTopic,
  });

  return {
    phase: nextPhase,
    step: nextStep,
    stage: nextStage,
    assistantMessage,
    feedback,
    hintLevel,
    requiresRestatement,
  };
}

/**
 * 取得題目開場狀態（學生切到該題時呼叫）。
 * @param {string} scenarioQuizId
 * @param {number} questionIndex - 1-based
 * @returns {Object} 初始 state + 開場 message
 */
export function makeInitialTurn(scenarioQuizId, questionIndex) {
  const quiz = getScenarioQuiz(scenarioQuizId);
  const question = quiz?.questions?.[questionIndex - 1] ?? null;
  return {
    phase: 'diagnosis',
    step: 1,
    stage: 'claim',
    hintLevel: 0,
    requiresRestatement: false,
    assistantMessage: question?.initialMessage ?? '請說說你的想法吧！',
    feedback: FEEDBACK_BY_CONTEXT.start,
  };
}

/* ────────────────────────────────────────────────────────────
 *  推進規則（內部）
 * ──────────────────────────────────────────────────────────── */

/** 依 step 決定 stage（spec-08 §3.1）*/
function stageForStep(step) {
  if (step <= 1) return 'claim';
  if (step === 2) return 'evidence';
  if (step === 3) return 'reasoning';
  if (step >= 4 && step <= 6) return 'revise';
  return 'complete'; // step=7
}

/** 依 step 決定 phase（spec-08 §1.2）*/
function phaseForStep(step) {
  if (step <= 3) return 'diagnosis';
  if (step >= 7) return 'completed';
  return 'apprenticeship';
}

/** hintLevel：step 4 modeling 升至 2，往後逐步漸退 */
function computeHintLevel(step, studentStruggling) {
  if (step <= 2) return 0;
  if (step === 3) return 1;
  if (step === 4) return 2; // modeling 全力鷹架
  if (step === 5) return studentStruggling ? 2 : 1;
  if (step === 6) return studentStruggling ? 1 : 0;
  return 0;
}

/** 組裝 AI 對話內容 */
function composeAssistantMessage({ nextStage, nextStep, question, studentSnippet }) {
  if (nextStage === 'complete') {
    return PROMPTS_BY_STAGE.complete[0];
  }
  if (nextStage === 'revise' && nextStep === 4) {
    const expertModel = question?.expertModel ?? '專家會先提出主張，再列出證據，最後說明推理。';
    return PROMPTS_BY_STAGE.revise_modeling[0].replace('{expertModel}', expertModel);
  }
  if (nextStage === 'revise') {
    return pickPrompt('revise_coaching', nextStep, studentSnippet);
  }
  return pickPrompt(nextStage, nextStep, studentSnippet);
}

/** 從 prompt pool 抽一句並做替換 */
function pickPrompt(key, step, snippet) {
  const pool = PROMPTS_BY_STAGE[key] ?? [];
  if (pool.length === 0) return '請繼續說說你的想法。';
  const template = pool[step % pool.length];
  return template.replace('{snippet}', snippet || '剛才的想法');
}

/** 把學生回應截前 12 字當引用 */
function makeSnippet(text) {
  if (!text) return '';
  return text.length > 12 ? `${text.slice(0, 12)}…` : text;
}

/** 簡單離題判定：完全沒有出現任何中文字（純標點 / 純英文 / 純數字） */
function isOffTopicReply(text) {
  if (!text) return false;
  const hasChinese = /[一-龥]/.test(text);
  return !hasChinese;
}

/** feedback 短評（8~25 字） */
function computeFeedback({ nextStep, nextStage, isShort, isOffTopic }) {
  if (nextStage === 'complete') return FEEDBACK_BY_CONTEXT.complete;
  if (isOffTopic) return FEEDBACK_BY_CONTEXT.offTopic;
  if (isShort) return FEEDBACK_BY_CONTEXT.shortReply;
  if (nextStep >= 5) return FEEDBACK_BY_CONTEXT.applyModel;
  if (nextStep >= 3) return FEEDBACK_BY_CONTEXT.goodEvidence;
  return FEEDBACK_BY_CONTEXT.encourage;
}

/* ────────────────────────────────────────────────────────────
 *  常數匯出（供 UI 使用）
 * ──────────────────────────────────────────────────────────── */

export const PHASE_LABEL = {
  diagnosis: '診斷',
  apprenticeship: '師徒',
  completed: '完成',
};

export const STAGE_LABEL = {
  claim: '主張',
  evidence: '證據',
  reasoning: '推理',
  revise: '修正',
  complete: '完成',
};
