/**
 * 出題端 two-tier 輔助：題目骨架產生 + 編輯器 shape ↔ API shape 轉換。
 *
 * 編輯器內部 shape（與學生端 runtime / mock 一致，見 twoTier.js）：
 *   single  ：{ id, stem, knowledgeNodeId, options:[{tag, content, diagnosis}] }
 *   two-tier：{ id, stem, knowledgeNodeId, mode:'two-tier',
 *              answerOptions:[{tag, content, correct}],
 *              reasonOptions:[{tag, content, diagnosis}] }
 *
 * API shape（QuizQuestionIO，見 backend/app/schemas/quiz.py）：
 *   { id, stem, knowledgeNodeId, mode, options:[{tag, content, diagnosis}], reasonOptions? }
 *   two-tier 的答案層 diagnosis 用 'CORRECT'（正解）/ 'WRONG'（其餘）哨兵。
 */
import { getQuestionMode, getAnswerOptions, getReasonOptions } from './twoTier';

export const ANSWER_TAGS = ['A', 'B', 'C'];
export const REASON_TAGS = ['甲', '乙', '丙'];

/** 從某節點挑「尚未被涵蓋」的迷思補位；不夠時 fallback 該節點其他迷思。 */
function buildMisconceptionPicker(node, excludeId, existingQuestions) {
  const coveredIds = new Set();
  existingQuestions
    .filter((q) => q.knowledgeNodeId === node.id)
    .forEach((q) => {
      const layer = getQuestionMode(q) === 'two-tier' ? (q.reasonOptions ?? []) : (q.options ?? []);
      layer.forEach((o) => {
        if (o.diagnosis && o.diagnosis !== 'CORRECT' && o.diagnosis !== 'WRONG') coveredIds.add(o.diagnosis);
      });
    });
  const remaining = node.misconceptions.filter((m) => m.id !== excludeId && !coveredIds.has(m.id));
  const fallback = node.misconceptions.filter((m) => m.id !== excludeId);
  return (i) => (remaining[i] || fallback[i % Math.max(fallback.length, 1)] || node.misconceptions[0])?.id;
}

/**
 * 為「某節點 + 某條迷思」建立預填題目骨架（single 或 two-tier）。
 * - two-tier：答案層 B 為正解；理由層 甲=正確理由、乙=點選的迷思、丙=其他迷思。
 * - single  ：沿用舊邏輯，A=點選迷思、B=正解、C/D 補其他迷思。
 */
export function buildQuestionForMisconception(mode, node, misconceptionId, existingQuestions, nextId) {
  if (!node) return null;
  const pick = buildMisconceptionPicker(node, misconceptionId, existingQuestions);
  if (mode === 'two-tier') {
    return {
      id: nextId,
      mode: 'two-tier',
      stem: '（請輸入題幹）',
      knowledgeNodeId: node.id,
      answerOptions: [
        { tag: 'A', content: '（請輸入答案 A）', correct: false },
        { tag: 'B', content: '（請輸入答案 B，此為正確答案）', correct: true },
        { tag: 'C', content: '（請輸入答案 C）', correct: false },
      ],
      reasonOptions: [
        { tag: '甲', content: '（請輸入正確理由）', diagnosis: 'CORRECT', answerTag: 'B' },
        { tag: '乙', content: '（請輸入理由 乙）', diagnosis: misconceptionId, answerTag: 'A' },
        { tag: '丙', content: '（請輸入理由 丙）', diagnosis: pick(0), answerTag: 'C' },
      ],
    };
  }
  return {
    id: nextId,
    stem: '（請輸入題幹）',
    knowledgeNodeId: node.id,
    options: [
      { tag: 'A', content: '（請輸入選項 A）', diagnosis: misconceptionId },
      { tag: 'B', content: '（請輸入選項 B，此為正確答案）', diagnosis: 'CORRECT' },
      { tag: 'C', content: '（請輸入選項 C）', diagnosis: pick(0) },
      { tag: 'D', content: '（請輸入選項 D）', diagnosis: pick(1) },
    ],
  };
}

/** 建立空白題目骨架（「新增題目」按鈕用）。 */
export function buildBlankQuestion(mode, node, nextId) {
  const m = node?.misconceptions ?? [];
  if (mode === 'two-tier') {
    return {
      id: nextId,
      mode: 'two-tier',
      stem: '（請輸入題幹）',
      knowledgeNodeId: node?.id,
      answerOptions: [
        { tag: 'A', content: '（請輸入答案 A）', correct: false },
        { tag: 'B', content: '（請輸入答案 B，此為正確答案）', correct: true },
        { tag: 'C', content: '（請輸入答案 C）', correct: false },
      ],
      reasonOptions: [
        { tag: '甲', content: '（請輸入正確理由）', diagnosis: 'CORRECT', answerTag: 'B' },
        { tag: '乙', content: '（請輸入理由 乙）', diagnosis: m[0]?.id || 'CORRECT', answerTag: 'A' },
        { tag: '丙', content: '（請輸入理由 丙）', diagnosis: m[1]?.id || m[0]?.id || 'CORRECT', answerTag: 'C' },
      ],
    };
  }
  return {
    id: nextId,
    stem: '（請輸入題幹）',
    knowledgeNodeId: node?.id,
    options: [
      { tag: 'A', content: '（請輸入選項 A）', diagnosis: m[0]?.id || 'CORRECT' },
      { tag: 'B', content: '（請輸入選項 B）', diagnosis: 'CORRECT' },
      { tag: 'C', content: '（請輸入選項 C）', diagnosis: m[1]?.id || m[0]?.id || 'CORRECT' },
      { tag: 'D', content: '（請輸入選項 D）', diagnosis: m[2]?.id || m[0]?.id || 'CORRECT' },
    ],
  };
}

/**
 * API / mock 題目 → 編輯器內部 shape（two-tier 用 answerOptions{correct} + reasonOptions）。
 * 載入既有題組時呼叫，讓表格與 EditQuestionModal 一律處理內部 shape。
 */
export function normalizeQuestionForEditor(q) {
  if (getQuestionMode(q) === 'two-tier') {
    return {
      id: q.id,
      mode: 'two-tier',
      stem: q.stem,
      knowledgeNodeId: q.knowledgeNodeId,
      answerOptions: getAnswerOptions(q).map((o) => ({
        tag: o.tag,
        content: o.content,
        correct: typeof o.correct === 'boolean' ? o.correct : o.diagnosis === 'CORRECT',
      })),
      reasonOptions: getReasonOptions(q).map((o) => ({
        tag: o.tag, content: o.content, diagnosis: o.diagnosis, answerTag: o.answerTag ?? null,
      })),
    };
  }
  return {
    id: q.id,
    stem: q.stem,
    knowledgeNodeId: q.knowledgeNodeId,
    options: (q.options ?? []).map((o) => ({ ...o })),
  };
}

const PLACEHOLDER_RE = /（請輸入/;
const isBlank = (text) => !(text ?? '').trim() || PLACEHOLDER_RE.test(text ?? '');

/**
 * 驗證單一題目是否符合雙層次設計方法論（Treagust）。
 * 回傳問題字串陣列；空陣列代表合規。供 EditQuestionModal 即時驗證與 Step2Edit 發布前檢查共用。
 */
export function validateQuestion(q) {
  const errors = [];
  if (isBlank(q?.stem)) errors.push('題幹尚未填寫');

  if (getQuestionMode(q) === 'two-tier') {
    const answers = getAnswerOptions(q);
    const reasons = getReasonOptions(q);
    const answerCorrect = answers.filter(
      (o) => (typeof o.correct === 'boolean' ? o.correct : o.diagnosis === 'CORRECT'),
    ).length;
    const reasonCorrect = reasons.filter((o) => o.diagnosis === 'CORRECT').length;
    const wrongCodes = reasons.filter((o) => o.diagnosis !== 'CORRECT').map((o) => o.diagnosis);
    if (answerCorrect !== 1) errors.push('第一層（內容）需恰一個正解');
    if (reasonCorrect !== 1) errors.push('第二層（理由）需恰一個正確理由');
    if (new Set(wrongCodes).size !== wrongCodes.length) errors.push('錯誤理由對應的迷思重複');
    if ([...answers, ...reasons].some((o) => isBlank(o.content))) errors.push('選項內容尚未填寫');
    // 每個第一層答案都要有 ≥1 個理由對應（answerTag）
    const covered = new Set(reasons.map((o) => o.answerTag).filter(Boolean));
    const uncovered = answers.map((o) => o.tag).filter((t) => !covered.has(t));
    if (uncovered.length > 0) errors.push(`答案 ${uncovered.join('、')} 還沒有對應的理由`);
  } else {
    const opts = q?.options ?? [];
    if (opts.filter((o) => o.diagnosis === 'CORRECT').length !== 1) errors.push('需恰一個正確答案');
    if (opts.some((o) => isBlank(o.content))) errors.push('選項內容尚未填寫');
  }
  return errors;
}

/** 編輯器題目 → API QuizQuestionIO shape（shape-tolerant：兼容內部與 API 來源）。 */
export function questionToApi(q) {
  if (getQuestionMode(q) === 'two-tier') {
    return {
      id: q.id,
      stem: q.stem,
      knowledgeNodeId: q.knowledgeNodeId,
      mode: 'two-tier',
      options: getAnswerOptions(q).map((o) => ({
        tag: o.tag,
        content: o.content,
        diagnosis: (typeof o.correct === 'boolean' ? o.correct : o.diagnosis === 'CORRECT')
          ? 'CORRECT' : 'WRONG',
      })),
      reasonOptions: getReasonOptions(q).map((o) => ({
        tag: o.tag, content: o.content, diagnosis: o.diagnosis, answerTag: o.answerTag ?? null,
      })),
    };
  }
  return {
    id: q.id,
    stem: q.stem,
    knowledgeNodeId: q.knowledgeNodeId,
    mode: 'single',
    options: q.options,
  };
}
