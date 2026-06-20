/**
 * 雙層次診斷測驗（two-tier diagnostic test, Treagust 1988）共用常數與判定函式。
 *
 * 題型（mode）：
 *  - 'single'   ：單層迷思診斷選擇題（舊題組 quiz-001/002）。選項自帶 diagnosis。
 *  - 'two-tier' ：第一層選答案（answerOptions，標一個正解）+ 第二層選理由
 *                 （reasonOptions，每個錯誤理由對應一條迷思）。
 *
 * 四象限判定（answer 對錯 × reason 對錯）：
 *  - TT 真理解 ：答對 + 理由對
 *  - TF 假陽性 ：答對 + 理由錯（猜對 / 持有迷思卻選對答案）
 *  - FT 假陰性 ：答錯 + 理由對（粗心 / 表達落差）
 *  - FF 真迷思 ：答錯 + 理由錯
 *
 * 對外仍提供「單一 diagnosis」（'CORRECT' 或 M 碼），讓既有 30+ consumer
 * （報告、統計、追問）零修改沿用；新的 quadrant 欄位提供更豐富的訊號。
 *
 * 規格：spec-04 §2.x、spec-05 §2.2。
 */

export const QUIZ_MODES = ['single', 'two-tier'];

export const QUADRANTS = ['TT', 'TF', 'FT', 'FF'];

/** 四象限的中文標籤與語意（教師端用，保留專業措辭）。 */
export const QUADRANT_LABELS = {
  TT: '真理解',
  TF: '假陽性',
  FT: '假陰性',
  FF: '真迷思',
};

export const QUADRANT_DESCRIPTIONS = {
  TT: '答案對、理由也對，確實理解此概念。',
  TF: '答案對、但理由錯，可能是猜對或持有迷思。',
  FT: '答案錯、但理由對，可能是粗心或表達落差。',
  FF: '答案錯、理由也錯，確實持有迷思概念。',
};

/**
 * 取得題目的題型。未標 mode 的舊題（只有 options）視為 single。
 * @param {object} question
 * @returns {'single'|'two-tier'}
 */
export function getQuestionMode(question) {
  if (!question) return 'single';
  if (question.mode === 'two-tier') return 'two-tier';
  if (question.mode === 'single') return 'single';
  // 無 mode 旗標時，以是否有 reasonOptions 推斷（向下相容）
  return Array.isArray(question.reasonOptions) && question.reasonOptions.length > 0
    ? 'two-tier'
    : 'single';
}

/**
 * 取得題目的「答案層」選項。
 * 容忍兩種來源：
 *  - mock 內部 shape：two-tier 用 answerOptions（{tag, content, correct}）
 *  - 後端 API shape：答案層存在正規化的 options（{tag, content, diagnosis}，
 *    two-tier 時 diagnosis 為 'CORRECT'/'WRONG'）
 * single 題一律用 options。
 * @returns {Array<{tag:string, content:string, correct?:boolean, diagnosis?:string}>}
 */
export function getAnswerOptions(question) {
  if (!question) return [];
  return question.answerOptions ?? question.options ?? [];
}

/** 取得題目的「理由層」選項；single 題回空陣列。 */
export function getReasonOptions(question) {
  if (!question || getQuestionMode(question) !== 'two-tier') return [];
  return question.reasonOptions ?? [];
}

/**
 * 取得「承載迷思碼」的那一層選項：
 *  - two-tier：理由層（迷思住在理由）
 *  - single  ：答案層（選項自帶迷思）
 * 供覆蓋率計算、出題編輯器的迷思下拉使用。
 */
export function getDiagnosisCarryingOptions(question) {
  return getQuestionMode(question) === 'two-tier'
    ? getReasonOptions(question)
    : getAnswerOptions(question);
}

/** 取得題目已涵蓋的迷思碼集合（排除 CORRECT / WRONG 哨兵）。 */
export function getCoveredMisconceptionIds(question) {
  return getDiagnosisCarryingOptions(question)
    .map((o) => o.diagnosis)
    .filter((d) => d && d !== 'CORRECT' && d !== 'WRONG');
}

/**
 * 判斷某個答案選項是否為正解。
 * 容忍兩種標記：mock 用 correct 布林；API 用 diagnosis==='CORRECT'。
 */
export function isAnswerCorrect(question, answerTag) {
  const opt = getAnswerOptions(question).find((o) => o.tag === answerTag);
  if (!opt) return false;
  if (typeof opt.correct === 'boolean') return opt.correct;
  return opt.diagnosis === 'CORRECT';
}

/** 判斷某個理由選項是否為正確理由。 */
export function isReasonCorrect(question, reasonTag) {
  const opt = getReasonOptions(question).find((o) => o.tag === reasonTag);
  return !!opt && opt.diagnosis === 'CORRECT';
}

/**
 * 計算 two-tier 一題的診斷結果。
 * @returns {{ quadrant:'TT'|'TF'|'FT'|'FF', diagnosis:string }}
 *   diagnosis：'CORRECT'（TT/FT，理由正確時無迷思碼）或理由層對應的 M 碼（TF/FF）。
 */
export function diagnoseTwoTier(question, answerTag, reasonTag) {
  const answerOk = isAnswerCorrect(question, answerTag);
  const reasonOpt = getReasonOptions(question).find((o) => o.tag === reasonTag);
  const reasonOk = !!reasonOpt && reasonOpt.diagnosis === 'CORRECT';
  const quadrant = `${answerOk ? 'T' : 'F'}${reasonOk ? 'T' : 'F'}`;
  // 迷思碼一律取自「錯誤理由」；理由正確時不掛迷思碼。
  const diagnosis = reasonOk ? 'CORRECT' : (reasonOpt?.diagnosis ?? 'CORRECT');
  return { quadrant, diagnosis };
}

/**
 * 計算單層題的診斷結果（包成同一介面，方便 caller 統一處理）。
 * single 題沒有理由層；quadrant 以答案對錯映射成 TT / FF。
 */
export function diagnoseSingle(question, answerTag) {
  const opt = getAnswerOptions(question).find((o) => o.tag === answerTag);
  const diagnosis = opt?.diagnosis ?? 'CORRECT';
  const quadrant = diagnosis === 'CORRECT' ? 'TT' : 'FF';
  return { quadrant, diagnosis };
}

/**
 * 統一入口：依題型計算 { quadrant, diagnosis }。
 * @param {object} question
 * @param {string} answerTag  第一層所選 tag
 * @param {string|null} reasonTag  第二層所選 tag（single 題傳 null）
 */
export function diagnoseQuestion(question, answerTag, reasonTag) {
  return getQuestionMode(question) === 'two-tier'
    ? diagnoseTwoTier(question, answerTag, reasonTag)
    : diagnoseSingle(question, answerTag);
}
