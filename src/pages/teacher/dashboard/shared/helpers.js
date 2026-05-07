import { knowledgeNodes } from '../../../../data/knowledgeGraph';

export const CLASS_KEY_MAP = { 'class-A': 'classA', 'class-B': 'classB', 'class-C': 'classC' };
export const CLASS_CHART_COLORS = { 'class-A': '#8FC87A', 'class-B': '#5DADE2', 'class-C': '#F4D03F' };

// 對未在 CLASS_KEY_MAP 內的班級給穩定的 chart key（避免 id 含 '-' 等特殊字元出現於 recharts 的 dataKey）
function chartKeyFor(classId) {
  return CLASS_KEY_MAP[classId] ?? `cls_${classId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}
export function getClassChartKey(classId) { return chartKeyFor(classId); }

export function getAssignment(assignments, classId, quizId) {
  return assignments.find(a => a.classId === classId && a.quizId === quizId) ?? null;
}

export function getAvailableQuizzesForClass(assignments, quizzes, classId) {
  const quizIds = [...new Set(assignments.filter(a => a.classId === classId).map(a => a.quizId))];
  return quizzes.filter(q => quizIds.includes(q.id));
}

export function getAllAssignedQuizzes(assignments, quizzes) {
  const quizIds = [...new Set(assignments.map(a => a.quizId))];
  return quizzes.filter(q => quizIds.includes(q.id));
}

export function getLatestQuizIdForClass(assignments, classId) {
  const sorted = assignments
    .filter(a => a.classId === classId)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return sorted[0]?.quizId ?? null;
}

/**
 * 把後端 grade-wide QuizStatsResponse（含 perClass[]）重塑成舊版 dashboard
 * 元件吃的 overviewData shape，子元件不需重寫。
 *
 * @param {object|undefined} stats - useQuizStats(quizId, undefined) 的 data
 * @param {Array} classes - useClasses() 的 data，用來補班級顯示順序與顏色
 * @param {Array} assignments - useAssignments() 的 data，用來判斷是否真的有派題
 */
export function buildOverviewFromStats(stats, classes, assignments, quizId) {
  if (!stats) return null;
  const perClass = stats.perClass ?? [];
  if (perClass.length === 0) return null;

  // 建立 class 顏色 / 排序 lookup
  const classMeta = new Map(classes.map((c) => [c.id, c]));
  const orderedPerClass = perClass
    .filter((c) => classMeta.has(c.classId))
    .sort((a, b) => {
      const ai = classes.findIndex((x) => x.id === a.classId);
      const bi = classes.findIndex((x) => x.id === b.classId);
      return ai - bi;
    });

  const classStats = orderedPerClass.map((c) => {
    const meta = classMeta.get(c.classId) ?? {};
    const totalStudents = c.studentCount ?? 0;
    const submittedCount = c.submittedCount ?? 0;
    const highFreqMisconCount = (c.topMisconceptions ?? [])
      .filter((m) => totalStudents > 0 && Math.round((m.count / totalStudents) * 100) >= 30)
      .length;
    return {
      id: c.classId,
      name: c.className ?? meta.name ?? c.classId,
      color: CLASS_CHART_COLORS[c.classId] || meta.color || '#BDC3C7',
      completionRate: c.completionRate ?? 0,
      avgPassRate: c.averageMastery ?? 0,
      highFreqMisconCount,
      pendingStudents: Math.max(0, totalStudents - submittedCount),
    };
  });

  // 從派題推出涉及的節點
  const assignmentNodeIds = new Set();
  for (const c of orderedPerClass) {
    Object.keys(c.nodePassRates ?? {}).forEach((id) => assignmentNodeIds.add(id));
  }
  const nodeIds = [...assignmentNodeIds];

  const nodePassRates = nodeIds.map((nodeId) => {
    const node = knowledgeNodes.find((n) => n.id === nodeId);
    const entry = { name: node?.name ?? nodeId, id: nodeId };
    orderedPerClass.forEach((c) => {
      entry[chartKeyFor(c.classId)] = (c.nodePassRates ?? {})[nodeId] ?? 0;
    });
    return entry;
  });

  const misconMap = {};
  orderedPerClass.forEach((c) => {
    const total = c.studentCount ?? 0;
    if (total === 0) return;
    (c.topMisconceptions ?? []).forEach((m) => {
      if (!misconMap[m.id]) {
        const nd = knowledgeNodes.find((n) => n.misconceptions?.find((mm) => mm.id === m.id));
        misconMap[m.id] = { id: m.id, label: m.label, node: nd?.name ?? '' };
      }
      misconMap[m.id][chartKeyFor(c.classId)] = Math.round((m.count / total) * 100);
    });
  });

  const classKeys = orderedPerClass.map((c) => chartKeyFor(c.classId));
  const topMisconceptions = Object.values(misconMap).map((m) => {
    const values = classKeys.map((k) => m[k] || 0).filter((v) => v > 0);
    classKeys.forEach((k) => { if (m[k] === undefined) m[k] = 0; });
    return {
      ...m,
      avg: values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0,
    };
  }).sort((a, b) => b.avg - a.avg).slice(0, 6);

  // 標註 quizId 沒有用上但留著保持 signature 與舊 mock 版相容
  void quizId;
  void assignments;

  return { classStats, nodePassRates, topMisconceptions };
}
