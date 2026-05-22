/**
 * 概念釐清治療成效衍生規則（spec-08 §5.5）
 *
 * 全部從 treatment_messages 反推，避免後端新增欄位；後續 P5 會搬到
 * app/services/treatment_outcome_service.py。
 */

export const OUTCOME = {
  MASTERED: 'mastered',          // 自走理解：complete + maxHint <= 0
  LIGHT: 'light',                // 輕度引導：complete + maxHint <= 1
  MODERATE: 'moderate',          // 中度引導：complete + maxHint <= 2
  HEAVY: 'heavy',                // 強鷹架：complete + maxHint == 3
  UNRESOLVED: 'unresolved',      // 未釐清：未走到 stage='complete'
  NO_DATA: 'no-data',             // 該題從未作答（學生未進到此題）
};

/**
 * 三色階制：以「老師該不該介入」為決策軸。
 *   ok   — 學生大致 OK，免介入
 *   warn — 需要老師補充引導
 *   bad  — 沒釐清，必須再教
 *   none — 學生未作答此題
 *
 * 五階段 label 仍保留為 pill 內文字（給研究端 / 詳細判讀），但顏色統一為三色階，
 * 避免老師第一次閱讀就要學會分辨五種色塊。
 */
export const OUTCOME_META = {
  [OUTCOME.MASTERED]:   { label: '自走理解', tier: 'ok',   weight: 4 },
  [OUTCOME.LIGHT]:      { label: '輕度引導', tier: 'ok',   weight: 3 },
  [OUTCOME.MODERATE]:   { label: '中度引導', tier: 'warn', weight: 2 },
  [OUTCOME.HEAVY]:      { label: '強鷹架',   tier: 'warn', weight: 1 },
  [OUTCOME.UNRESOLVED]: { label: '未釐清',   tier: 'bad',  weight: 0 },
  [OUTCOME.NO_DATA]:    { label: '未作答',   tier: 'none', weight: null },
};

/** 從 messages 計算單題 outcome */
export function deriveQuestionOutcome(messages) {
  if (!messages || messages.length === 0) return OUTCOME.NO_DATA;
  let maxHint = 0;
  let reachedComplete = false;
  for (const m of messages) {
    if (m.role !== 'ai') continue;
    if (typeof m.hintLevel === 'number') maxHint = Math.max(maxHint, m.hintLevel);
    if (m.stage === 'complete' || m.phase === 'completed') reachedComplete = true;
  }
  if (!reachedComplete) return OUTCOME.UNRESOLVED;
  if (maxHint <= 0) return OUTCOME.MASTERED;
  if (maxHint <= 1) return OUTCOME.LIGHT;
  if (maxHint <= 2) return OUTCOME.MODERATE;
  return OUTCOME.HEAVY;
}

/**
 * 從 session（含 messages）算出整份題組 outcomes 與彙整指標
 * @returns {{
 *   perQuestion: Array<{ index: number, outcome: string }>,
 *   resolvedCount: number,
 *   totalQuestions: number,
 *   resolvedRate: number,
 *   starRating: 0|1|2|3,
 *   aiCleared: boolean,
 *   reflectionText: string | null,
 * }}
 */
export function deriveSessionOutcome(session, totalQuestions) {
  const grouped = {};
  for (const m of session?.messages ?? []) {
    const qi = m.questionIndex;
    if (!grouped[qi]) grouped[qi] = [];
    grouped[qi].push(m);
  }
  const perQuestion = [];
  for (let i = 1; i <= totalQuestions; i++) {
    perQuestion.push({ index: i, outcome: deriveQuestionOutcome(grouped[i]) });
  }
  const resolvedCount = perQuestion.filter(
    (q) => q.outcome !== OUTCOME.UNRESOLVED && q.outcome !== OUTCOME.NO_DATA
  ).length;
  const resolvedRate = totalQuestions === 0 ? 0 : resolvedCount / totalQuestions;
  return {
    perQuestion,
    resolvedCount,
    totalQuestions,
    resolvedRate,
    starRating: computeStarRating(perQuestion),
    aiCleared: resolvedRate >= 1,
    reflectionText: session?.reflectionText ?? null,
  };
}

/**
 * 三星評等：以各題 outcome weight 平均換算
 *   平均 >= 3.5 → 3 顆星
 *   平均 >= 2.5 → 2 顆星
 *   平均 >= 1.5 → 1 顆星
 *   否則 0 顆（含未釐清）
 */
export function computeStarRating(perQuestion) {
  const weights = perQuestion
    .map((q) => OUTCOME_META[q.outcome]?.weight)
    .filter((w) => typeof w === 'number');
  if (weights.length === 0) return 0;
  const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
  if (avg >= 3.5) return 3;
  if (avg >= 2.5) return 2;
  if (avg >= 1.5) return 1;
  return 0;
}

/**
 * 整 session 的決策層級（給「整體結果」chip 用）：
 *   ok   — 全部題目都 ok
 *   warn — 沒有 bad，但有 warn（老師可介入補強）
 *   bad  — 有任何 unresolved 題（必須再教）
 */
export function deriveSessionTier(perQuestion) {
  let hasWarn = false;
  for (const q of perQuestion) {
    const tier = OUTCOME_META[q.outcome]?.tier;
    if (tier === 'bad') return 'bad';
    if (tier === 'warn') hasWarn = true;
  }
  return hasWarn ? 'warn' : 'ok';
}

/**
 * 班級層級彙整：傳入該班所有 sessionOutcome 物件
 *   clearedCount        — 全部題目 ok（綠）的 session 數
 *   needsAttentionCount — 有 warn 或 bad（黃 / 紅）的 session 數，即需要老師關注的學生數
 */
export function aggregateClassOutcomes(outcomes) {
  if (!outcomes || outcomes.length === 0) {
    return { participants: 0, clearedCount: 0, needsAttentionCount: 0 };
  }
  let cleared = 0;
  let needsAttention = 0;
  for (const o of outcomes) {
    const tier = deriveSessionTier(o.perQuestion);
    if (tier === 'ok') cleared += 1;
    else needsAttention += 1;
  }
  return {
    participants: outcomes.length,
    clearedCount: cleared,
    needsAttentionCount: needsAttention,
  };
}

/** 三色階 → Tailwind class */
export const TIER_CLASS = {
  ok:   'bg-[#E2F4D8] text-[#3D5A3E] border-[#A7D696]',
  warn: 'bg-[#FEF9E7] text-[#B7950B] border-[#F4D03F]',
  bad:  'bg-[#FDE2E4] text-[#E74C5E] border-[#F28B95]',
  none: 'bg-[#F4F5F5] text-[#6B6F71] border-[#D5D8DC]',
};

/** 三色階 → 中文短標 */
export const TIER_LABEL = {
  ok:   '已釐清',
  warn: '需引導',
  bad:  '未釐清',
  none: '未作答',
};
