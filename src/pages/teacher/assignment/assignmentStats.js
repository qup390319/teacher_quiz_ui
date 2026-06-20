// ─── 派題管理共用統計工具 ─────────────────────────────────────────────────────
// 對應 spec-02 §2.6「題組摘要卡 + 管理派發抽屜」設計。

/**
 * 取得單一 assignment 的完成資料
 * @param {object} assignment - 派發紀錄
 * @param {object} cls - 對應班級
 * @returns {{ completed: number, total: number, percent: number, status: 'empty'|'waiting'|'inProgress'|'done' }}
 */
export function getAssignmentProgress(assignment, cls) {
  const total = cls?.studentCount ?? 0;
  if (!assignment) {
    return { completed: 0, total, percent: 0, status: 'empty' };
  }
  // 各種 schema 都可能存在：completedCount / completed / progress
  const completed =
    assignment.completedCount ??
    assignment.completed ??
    assignment.progress?.completed ??
    0;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  let status = 'waiting';
  if (completed > 0 && completed < total) status = 'inProgress';
  if (total > 0 && completed >= total) status = 'done';
  return { completed, total, percent, status };
}

/**
 * 給「題組摘要卡」用的彙總（以 assignment.completionRate 為準）。
 * @returns {{ assignedCount, total, unassignedCount, done, inProgress, waiting, avgPercent }}
 */
export function getQuizCardStats(quiz, classes, assignments) {
  const list = assignments.filter(
    (a) => (a.type ?? 'diagnosis') === 'diagnosis' && a.quizId === quiz.id,
  );
  let done = 0;
  let inProgress = 0;
  let waiting = 0;
  let sumPct = 0;
  for (const a of list) {
    const pct = a.completionRate ?? 0;
    sumPct += pct;
    if (pct >= 100) done += 1;
    else if (pct > 0) inProgress += 1;
    else waiting += 1;
  }
  const assignedCount = list.length;
  const total = classes.length;
  return {
    assignedCount,
    total,
    unassignedCount: total - assignedCount,
    done,
    inProgress,
    waiting,
    avgPercent: assignedCount > 0 ? Math.round(sumPct / assignedCount) : 0,
  };
}

/**
 * 全頁概覽統計
 */
export function getGlobalSummary(quizzes, classes, assignments) {
  const diagnosisAssignments = assignments.filter(
    (a) => (a.type ?? 'diagnosis') === 'diagnosis',
  );
  let inProgressCount = 0;
  let doneCount = 0;
  let waitingCount = 0;

  for (const a of diagnosisAssignments) {
    const cls = classes.find((c) => c.id === a.classId);
    if (!cls) continue;
    const p = getAssignmentProgress(a, cls);
    if (p.status === 'done') doneCount++;
    else if (p.status === 'inProgress') inProgressCount++;
    else waitingCount++;
  }

  return {
    totalQuizzes: quizzes.length,
    totalClasses: classes.length,
    totalAssignments: diagnosisAssignments.length,
    inProgressCount,
    doneCount,
    waitingCount,
  };
}
