// ─── 派題管理共用統計工具 ─────────────────────────────────────────────────────
// 對應 spec-02 §2.6 雙視角設計，不再使用矩陣。

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
 * 取得某個 quiz 的整體統計（跨所有已派班級）
 */
export function getQuizSummary(quiz, classes, assignments) {
  const quizAssignments = assignments.filter(
    (a) => (a.type ?? 'diagnosis') === 'diagnosis' && a.quizId === quiz.id,
  );
  const assignedClassIds = new Set(quizAssignments.map((a) => a.classId));
  const assignedClasses = classes.filter((c) => assignedClassIds.has(c.id));
  const unassignedClasses = classes.filter((c) => !assignedClassIds.has(c.id));

  let totalStudents = 0;
  let totalCompleted = 0;
  let inProgressCount = 0;
  let doneCount = 0;
  let waitingCount = 0;

  for (const a of quizAssignments) {
    const cls = classes.find((c) => c.id === a.classId);
    if (!cls) continue;
    const p = getAssignmentProgress(a, cls);
    totalStudents += p.total;
    totalCompleted += p.completed;
    if (p.status === 'done') doneCount++;
    else if (p.status === 'inProgress') inProgressCount++;
    else waitingCount++;
  }

  const overallPercent = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;

  return {
    assignments: quizAssignments,
    assignedClasses,
    unassignedClasses,
    totalStudents,
    totalCompleted,
    overallPercent,
    inProgressCount,
    doneCount,
    waitingCount,
  };
}

/**
 * 取得某個 class 的整體統計（跨所有已派題組）
 */
export function getClassSummary(cls, quizzes, assignments) {
  const classAssignments = assignments.filter(
    (a) => (a.type ?? 'diagnosis') === 'diagnosis' && a.classId === cls.id,
  );
  const assignedQuizIds = new Set(classAssignments.map((a) => a.quizId));
  const assignedQuizzes = quizzes.filter((q) => assignedQuizIds.has(q.id));
  const unassignedQuizzes = quizzes.filter((q) => !assignedQuizIds.has(q.id));

  let inProgressCount = 0;
  let doneCount = 0;
  let waitingCount = 0;

  for (const a of classAssignments) {
    const p = getAssignmentProgress(a, cls);
    if (p.status === 'done') doneCount++;
    else if (p.status === 'inProgress') inProgressCount++;
    else waitingCount++;
  }

  return {
    assignments: classAssignments,
    assignedQuizzes,
    unassignedQuizzes,
    inProgressCount,
    doneCount,
    waitingCount,
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

/**
 * 狀態 → 顏色對照（spec-07 既有色票）
 */
export const STATUS_COLORS = {
  empty:      { bg: 'bg-white',       border: 'border-dashed border-[#D5D8DC]', text: 'text-[#95A5A6]', label: '未派發' },
  waiting:    { bg: 'bg-[#EEF5E6]',   border: 'border-[#D5D8DC]',               text: 'text-[#95A5A6]', label: '待作答' },
  inProgress: { bg: 'bg-[#FCF0C2]',   border: 'border-[#F5D669]',               text: 'text-[#B7950B]', label: '進行中' },
  done:       { bg: 'bg-[#C8EAAE]',   border: 'border-[#8FC87A]',               text: 'text-[#3D5A3E]', label: '已完成' },
};

/**
 * 進度條顏色（隨 status）
 */
export function getProgressBarColor(status) {
  switch (status) {
    case 'done':       return '#8FC87A';
    case 'inProgress': return '#F5D669';
    case 'waiting':    return '#BDC3C7';
    default:           return '#D5D8DC';
  }
}
