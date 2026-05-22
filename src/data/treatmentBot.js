/**
 * 治療對話 AI（Cognitive Apprenticeship 機器人）
 *
 * 規格詳見 docs/spec-08-treatment-cognitive-apprenticeship.md §2-3, §7。
 *
 * 介面契約 100% 對齊 eh 系統 server.js 的 RESPONSE_JSON_SCHEMA：
 *   { phase, step, stage, assistantMessage, feedback, hintLevel, requiresRestatement }
 *
 * 兩種驅動模式：
 * 1. LLM 模式：在 treatmentBotPrompts.js 登錄該題的 system prompt → 走真 LLM
 * 2. Mock 模式：未登錄的題目走 rule-based 推進（保留作為 fallback）
 *
 * runTreatmentTurn 是 async，會依題目自動選擇模式並在 LLM 失敗時 fallback 到 mock。
 */
import { getScenarioQuiz } from './scenarioQuizData';
import { hasLlmPromptFor, runTreatmentTurnLlm } from './treatmentBotLlm.js';

export const STEPS_PER_QUESTION = 7;

/* ────────────────────────────────────────────────────────────
 *  常數：每個 stage 的開場與引導句
 * ──────────────────────────────────────────────────────────── */

// 對齊原系統 prompt 的 step1~7 結構：
//   1 claim、2 evidence、3 modeling、4 coaching、5 scaffolding、6 CER 重述、7 收束
const PROMPTS_BY_STEP = {
  // step 2 — 引導學生說證據（第一次自然介紹「證據」）
  evidence: [
    '證據，就是支持你主張的線索，讓你的想法更有說服力。\n\n你的證據是什麼呢？你可以從題目資訊、圖表、紀錄表，或生活經驗中找線索喔。',
    '很好，那讓我們來找找看：在情境裡，有什麼線索可以支持你的主張？',
  ],
  // step 3 — Modeling：專家示範切入點（不公開答案，只展示「先看哪裡」）
  modeling: [
    '{modelingHint}',
  ],
  // step 4 — Coaching：依學生狀況做認知衝突 / 概念驗證（一次只問一個重點）
  coaching: [
    '把你剛剛說的「{snippet}」跟圖表上的線索一起想，你會發現什麼？',
    '從圖表或紀錄表上，還有哪一個線索可以支持或反駁你剛才的想法呢？',
  ],
  // step 5 — Scaffolding：AI 統整重點 → 建立判準 → 簡短確認
  scaffolding: [
    '我先幫你把前面說過的重點整理一下：你已經注意到「{snippet}」這個線索，這些都能幫我們等一下整理完整的想法。你覺得這樣是不是比較清楚呢？',
  ],
  // step 6 — CER restatement：提供完整模板，請學生重述
  cer_template: [
    '你剛剛已經提到「{snippet}」。你可以用這個方式整理成一段話：\n\n我＿＿＿＿（同意 / 不同意）。因為我看到＿＿＿＿。這表示＿＿＿＿。所以我覺得＿＿＿＿。',
  ],
  // step 7 — 收束：先鼓勵 → 簡短統整 → 不再問新問題
  complete_intermediate: [
    '太棒了！你已經能用主張、證據、推理把整個想法說清楚了。這題我們先到這裡。',
  ],
  complete_final: [
    '太棒了！你已經能用主張、證據、推理把整個想法說清楚了。整份概念釐清題組到這裡就完成了，辛苦你了！',
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
 * 推進一輪對話（async）。
 *
 * 流程：
 *  1. 若該題已登錄 LLM prompt → 走真 LLM
 *  2. LLM 失敗（網路 / JSON 解析 / 後端錯誤）→ fallback 到 mock，console.warn
 *  3. 沒登錄 prompt 的題目 → 直接走 mock
 *
 * @param {Object} state - 當前對話狀態
 * @param {string} state.scenarioQuizId
 * @param {number} state.questionIndex - 1-based
 * @param {Array<{role:'ai'|'student', text:string}>} state.history
 * @param {'diagnosis'|'apprenticeship'|'cer'|'completed'} state.phase
 * @param {number} state.step - 1~7
 * @param {'claim'|'evidence'|'reasoning'|'revise'|'complete'} state.stage
 * @param {0|1|2|3} state.hintLevel
 * @param {boolean} state.requiresRestatement
 * @param {string} userMessage - 學生本次輸入
 * @returns {Promise<Object>} BotResponse
 *   { phase, step, stage, assistantMessage, feedback, hintLevel, requiresRestatement }
 */
export async function runTreatmentTurn(state, userMessage) {
  if (hasLlmPromptFor(state.scenarioQuizId, state.questionIndex)) {
    try {
      return await runTreatmentTurnLlm(state, userMessage);
    } catch (err) {
      console.warn('[treatmentBot] LLM turn failed, falling back to mock:', err?.message ?? err);
      // fall through to mock
    }
  }
  return runTreatmentTurnMock(state, userMessage);
}

/**
 * Rule-based fallback。同步、不依賴 NLP；
 * 對話品質由概念釐清題組的 expertModel 文本提供，bot 只負責「依 step 切換 stage / 包裝對話文字」。
 */
export function runTreatmentTurnMock(state, userMessage) {
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
  const isLastQuestion = !!quiz && state.questionIndex >= (quiz.questions?.length ?? 0);

  // 產生 AI 回覆
  const assistantMessage = composeAssistantMessage({
    nextStep,
    question,
    studentSnippet: makeSnippet(trimmed),
    isLastQuestion,
  });

  // hintLevel：原 prompt 由學生掙扎程度決定；mock 取最低預設，遇到掙扎才升級
  const hintLevel = computeHintLevel(nextStep, isShort || isOffTopic);

  // requiresRestatement：step6 CER restatement 必為 true（原 prompt step6 規則）
  const requiresRestatement = nextStep === 6
    || ((isShort || isOffTopic) && nextStep <= 2);

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

/** 依 step 決定 stage（對齊原 prompt【stage 對應原則】）
 *   claim=step1 / evidence=step2 / reasoning=step3-5 / revise=step6 / complete=step7
 */
function stageForStep(step) {
  if (step <= 1) return 'claim';
  if (step === 2) return 'evidence';
  if (step >= 3 && step <= 5) return 'reasoning';
  if (step === 6) return 'revise';
  return 'complete';
}

/** 依 step 決定 phase（對齊原 prompt【新版狀態機】）
 *   diagnosis=step1-2 / apprenticeship=step3-5 / cer=step6 / completed=step7
 */
function phaseForStep(step) {
  if (step <= 2) return 'diagnosis';
  if (step <= 5) return 'apprenticeship';
  if (step === 6) return 'cer';
  return 'completed';
}

/** hintLevel：原則上由學生掙扎程度決定。mock 取最低預設，學生卡住才升級。 */
function computeHintLevel(step, studentStruggling) {
  // 預設等級（學生表現正常時）
  const baseline = step <= 2 ? 0
    : step === 3 ? 0   // modeling 是教學，不算 hint
    : step === 4 ? 0
    : step === 5 ? 1   // scaffolding 統整本身是 mechanism 提示
    : step === 6 ? 2   // CER template 是完整模板
    : 0;
  if (studentStruggling) {
    return Math.min(3, baseline + 1);
  }
  return baseline;
}

/** 組裝 AI 對話內容 — 每 step 一個分支，對齊原 prompt step1~7 規則 */
function composeAssistantMessage({ nextStep, question, studentSnippet, isLastQuestion }) {
  if (nextStep === 1) {
    return question?.initialMessage ?? '請說說你的想法吧！';
  }
  if (nextStep === 2) {
    return pickPrompt('evidence', nextStep, studentSnippet);
  }
  if (nextStep === 3) {
    // Modeling：用題目登錄的 modelingHint / expertModel 帶入專家切入點
    const modelingHint = question?.expertModel
      ?? '如果是我，我會先回到題目給的圖表或紀錄表上找線索。';
    return PROMPTS_BY_STEP.modeling[0].replace('{modelingHint}', modelingHint);
  }
  if (nextStep === 4) {
    return pickPrompt('coaching', nextStep, studentSnippet);
  }
  if (nextStep === 5) {
    return pickPrompt('scaffolding', nextStep, studentSnippet);
  }
  if (nextStep === 6) {
    return pickPrompt('cer_template', nextStep, studentSnippet);
  }
  // step 7
  return isLastQuestion
    ? PROMPTS_BY_STEP.complete_final[0]
    : PROMPTS_BY_STEP.complete_intermediate[0];
}

/** 從 prompt pool 抽一句並做替換 */
function pickPrompt(key, step, snippet) {
  const pool = PROMPTS_BY_STEP[key] ?? [];
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
  cer: 'CER 整理',
  completed: '完成',
};

export const STAGE_LABEL = {
  claim: '主張',
  evidence: '證據',
  reasoning: '推理',
  revise: '修正',
  complete: '完成',
};
