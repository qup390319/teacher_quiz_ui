/**
 * 施測中動態選題 client（StudentQuiz 專用）。
 *
 * 把「決定下一題」的決策交給後端適性引擎（POST /api/adaptive/next-question,
 * spec-10 §10.4）：過關跳過先備、答錯退回先備,限題組內既有先備。
 * 本檔只負責組 payload、呼叫、把回傳的 nextQuestionId 對應回題目物件,
 * 讓 StudentQuiz.jsx 專注於畫面流程。
 */
import { api } from '../../lib/api';

/**
 * 由「已問過的題目」+「已作答結果」組出後端要的 answered payload。
 * passed 以第一層作答判定：single 的 CORRECT 與 two-tier 的 TT 都映射為 quadrant==='TT'。
 * @param {Array} asked — 已問過的題目物件（依實際作答順序）
 * @param {Array} answers — answersRef.current（含 quadrant 欄位）
 */
export function buildAnsweredPayload(asked, answers) {
  return asked.map((q) => {
    const a = answers.find((x) => x.questionId === q.id);
    return { questionId: q.id, nodeId: q.knowledgeNodeId, passed: a?.quadrant === 'TT' };
  });
}

/**
 * 問後端拿下一題,並對應回題目物件。
 * @param {string} quizId
 * @param {Array} asked — 已問過的題目
 * @param {Array} answers — 已作答結果
 * @param {Array} pool — 題組全部題目（用來以 id 對應出題目物件）
 * @returns {Promise<{done:boolean, question:object|null, skippedNodeIds:string[], reason:string}>}
 */
export async function resolveNextQuestion(quizId, asked, answers, pool) {
  const answered = buildAnsweredPayload(asked, answers);
  const resp = await api.post('/adaptive/next-question', { quizId, answered });
  const skippedNodeIds = resp.skippedNodeIds ?? [];
  if (resp.done) {
    return { done: true, question: null, skippedNodeIds, reason: resp.reason ?? '' };
  }
  const question = pool.find((q) => q.id === resp.nextQuestionId) ?? null;
  // 對應不到題目（理論上不會）→ 視為結束,避免卡住流程
  return { done: !question, question, skippedNodeIds, reason: resp.reason ?? '' };
}
