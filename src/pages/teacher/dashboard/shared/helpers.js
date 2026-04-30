import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import {
  getQuizQuestions, getClassAnswers,
  getMisconceptionStudents, getNodePassRates,
} from '../../../../data/quizData';

export const CLASS_KEY_MAP = { 'class-A': 'classA', 'class-B': 'classB', 'class-C': 'classC' };
export const CLASS_CHART_COLORS = { 'class-A': '#8FC87A', 'class-B': '#5DADE2', 'class-C': '#F4D03F' };

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

export function computeOverviewForQuiz(quizId, classes, assignments) {
  const questions = getQuizQuestions(quizId);
  if (questions.length === 0) return null;
  const nodeIds = [...new Set(questions.map(q => q.knowledgeNodeId))];

  const classStats = [];
  classes.forEach(cls => {
    const assignment = getAssignment(assignments, cls.id, quizId);
    if (!assignment) return;

    const answersData = getClassAnswers(quizId, cls.id);
    const totalStudents = answersData.length;

    const passRates = getNodePassRates(quizId, cls.id);
    const vals = Object.values(passRates);
    const avgPassRate = vals.length > 0
      ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;

    const misconStudents = getMisconceptionStudents(quizId, cls.id);
    const highFreqMisconCount = totalStudents > 0
      ? Object.values(misconStudents)
          .filter(students => Math.round((students.length / totalStudents) * 100) >= 30).length
      : 0;

    classStats.push({
      id: cls.id,
      name: cls.name,
      color: CLASS_CHART_COLORS[cls.id] || '#BDC3C7',
      completionRate: assignment.completionRate,
      avgPassRate,
      highFreqMisconCount,
      pendingStudents: assignment.totalStudents - assignment.submittedCount,
    });
  });

  if (classStats.length === 0) return null;

  const nodePassRates = nodeIds.map(nodeId => {
    const node = knowledgeNodes.find(n => n.id === nodeId);
    const entry = { name: node?.name ?? nodeId, id: nodeId };
    classStats.forEach(cs => {
      const rates = getNodePassRates(quizId, cs.id);
      entry[CLASS_KEY_MAP[cs.id] ?? cs.id] = rates[nodeId] ?? 0;
    });
    return entry;
  });

  const misconMap = {};
  classStats.forEach(cs => {
    const answersData = getClassAnswers(quizId, cs.id);
    const total = answersData.length;
    if (total === 0) return;
    const ms = getMisconceptionStudents(quizId, cs.id);
    Object.entries(ms).forEach(([mid, students]) => {
      if (!misconMap[mid]) {
        const nd = knowledgeNodes.find(n => n.misconceptions?.find(m => m.id === mid));
        const mc = nd?.misconceptions?.find(m => m.id === mid);
        misconMap[mid] = { id: mid, label: mc?.label ?? mid, node: nd?.name ?? '' };
      }
      misconMap[mid][CLASS_KEY_MAP[cs.id] ?? cs.id] = Math.round((students.length / total) * 100);
    });
  });

  const topMisconceptions = Object.values(misconMap).map(m => {
    const keys = classStats.map(cs => CLASS_KEY_MAP[cs.id] ?? cs.id);
    const values = keys.map(k => m[k] || 0).filter(v => v > 0);
    keys.forEach(k => { if (m[k] === undefined) m[k] = 0; });
    return { ...m, avg: values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0 };
  }).sort((a, b) => b.avg - a.avg).slice(0, 6);

  return { classStats, nodePassRates, topMisconceptions };
}
