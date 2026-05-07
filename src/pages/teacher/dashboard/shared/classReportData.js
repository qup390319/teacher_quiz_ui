/**
 * 把後端 useQuizStats / useClassAnswers 的回應，重塑成舊版 mock 介面的 shape，
 * 讓 SingleClassReport / AIDiagnosisSummary / WeeklyActionChecklist /
 * BreakdownChart / MisconceptionDistribution / HeatmapView 等元件不需要重寫，
 * 直接吃這份「派生資料」就能改用真實 DB 資料。
 *
 * 舊 mock 對應：
 *   - getNodePassRates(quizId, classId) → { [nodeId]: pct }
 *       來源：QuizStatsResponse.nodePassRates
 *   - getMisconceptionStudents(quizId, classId) → { [misconId]: [{name}|name, ...] }
 *       來源：QuizStatsResponse.topMisconceptions[].studentIds + ClassAnswers.rows
 *   - getQuestionStats(quizId, classId) → { [questionId]: { A: n, B: n, C: n, D: n } }
 *       來源：QuizStatsResponse.questionStats
 *   - getClassAnswers(quizId, classId) → [{ student, answers: [{questionId, selectedTag}] }, ...]
 *       來源：ClassAnswersResponse.rows
 */

export function buildPassRates(stats) {
  return stats?.nodePassRates ?? {};
}

export function buildMisconceptionStudents(stats, classAnswers) {
  if (!stats?.topMisconceptions) return {};
  const rows = classAnswers?.rows ?? [];
  const nameById = new Map(rows.map((r) => [r.studentId, r.studentName ?? r.studentId]));
  const out = {};
  for (const m of stats.topMisconceptions) {
    out[m.id] = (m.studentIds ?? []).map((sid) => ({
      id: sid,
      name: nameById.get(sid) ?? sid,
    }));
  }
  return out;
}

export function buildQuestionStats(stats) {
  return stats?.questionStats ?? {};
}

export function buildClassAnswerRows(classAnswers) {
  return classAnswers?.rows ?? [];
}
