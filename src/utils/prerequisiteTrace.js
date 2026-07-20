/**
 * 先備概念追溯（prerequisite trace）純函數。
 *
 * 語意與後端 adaptive_service（spec-10 §10）的「溯源」一致：
 * 學生在某節點做錯（持有迷思）時，沿知識圖譜的先備鏈往回走，
 * 用該生**所有歷史作答紀錄**判斷每個先備節點的精熟狀態，
 * 找出「最早出問題的先備節點」（根因）。
 *
 * 消費者：教師端學生個別診斷報告（StudentDiagnosisReport）的
 * PrerequisiteTraceSection。全部在前端計算，不需額外 API——
 * 頁面已透過 useDiagnosisLogs 拿到該生全部作答紀錄。
 */
import { knowledgeNodes, getNodeById } from '../data/knowledgeGraph';

/** 精熟門檻（%），鏡射 backend/app/services/adaptive_service.py 的 MASTERY_THRESHOLD */
export const MASTERY_THRESHOLD = 70;

/** 節點在追溯鏈上的狀態 */
export const TRACE_STATUS = {
  MASTERED: 'mastered', // 答對率 >= 門檻
  WEAK: 'weak', // 有作答但答對率 < 門檻
  UNTESTED: 'untested', // 從未施測（無任何作答紀錄）
};

/**
 * 從診斷紀錄彙整每個知識節點的精熟度。
 * 以追問後的最終判定（finalStatus === 'CORRECT'）計為答對，
 * 比第一層作答診斷更貼近學生真實理解。
 *
 * @param {Array} logs — useDiagnosisLogs 回傳的紀錄（需含 knowledgeNodeId / finalStatus）
 * @returns {Object} { [nodeId]: { total, correct, pct } }
 */
export function buildNodeMastery(logs) {
  const stats = {};
  for (const l of logs) {
    if (!l.knowledgeNodeId) continue;
    if (!stats[l.knowledgeNodeId]) stats[l.knowledgeNodeId] = { total: 0, correct: 0, pct: 0 };
    const s = stats[l.knowledgeNodeId];
    s.total += 1;
    if (l.finalStatus === 'CORRECT') s.correct += 1;
  }
  for (const s of Object.values(stats)) {
    s.pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  }
  return stats;
}

/**
 * 取得節點的完整遞移先備鏈（由最根本的先備排到目標節點自身）。
 * 鏡射 backend/app/data/knowledge_graph.py 的 get_all_prerequisites()：
 * BFS 收集後反轉，最後附上目標節點。
 *
 * @param {string} nodeId
 * @returns {Array<object>} 節點物件陣列（root 先備 → … → 目標節點）
 */
export function getPrerequisiteChain(nodeId) {
  const target = getNodeById(nodeId);
  if (!target) return [];
  const visited = new Set();
  const order = [];
  const queue = [...(target.prerequisites ?? [])];
  while (queue.length > 0) {
    const nid = queue.shift();
    if (visited.has(nid)) continue;
    visited.add(nid);
    order.push(nid);
    queue.push(...(getNodeById(nid)?.prerequisites ?? []));
  }
  order.reverse();
  return [...order, nodeId].map((id) => getNodeById(id)).filter(Boolean);
}

function statusOf(masteryEntry, threshold) {
  if (!masteryEntry || masteryEntry.total === 0) return TRACE_STATUS.UNTESTED;
  return masteryEntry.pct >= threshold ? TRACE_STATUS.MASTERED : TRACE_STATUS.WEAK;
}

/**
 * 對學生「持有迷思」的每個節點建立追溯結果。
 *
 * @param {Array} logs — 該生**全部**診斷紀錄（不要先用題組過濾，追溯需要跨題組證據）
 * @param {object} [opts]
 * @param {number} [opts.threshold] — 精熟門檻（%）
 * @returns {Array<{
 *   target: object,                 // 做錯的節點
 *   chain: Array<{ node, status, pct, total }>,  // root 先備 → … → 目標
 *   rootCause: { node, status, pct, total } | null, // 鏈上最早未精熟/未施測的先備；null = 先備皆穩固
 *   hasPrerequisites: boolean,
 * }>}
 */
export function buildPrerequisiteTraces(logs, { threshold = MASTERY_THRESHOLD } = {}) {
  const mastery = buildNodeMastery(logs);
  const targetIds = [...new Set(
    logs
      .filter((l) => l.finalStatus === 'MISCONCEPTION' && l.knowledgeNodeId)
      .map((l) => l.knowledgeNodeId),
  )];
  // 依知識節點清單順序（≈ 學習順序）排列，讓最上游的問題先出現
  targetIds.sort((a, b) => knowledgeNodes.findIndex((n) => n.id === a) - knowledgeNodes.findIndex((n) => n.id === b));

  return targetIds.map((targetId) => {
    const chainNodes = getPrerequisiteChain(targetId);
    if (chainNodes.length === 0) return null;
    const chain = chainNodes.map((node) => {
      const m = mastery[node.id];
      return {
        node,
        status: statusOf(m, threshold),
        pct: m?.pct ?? 0,
        total: m?.total ?? 0,
      };
    });
    const prereqLinks = chain.slice(0, -1);
    const rootCause = prereqLinks.find((c) => c.status !== TRACE_STATUS.MASTERED) ?? null;
    return {
      target: chainNodes[chainNodes.length - 1],
      chain,
      rootCause,
      hasPrerequisites: prereqLinks.length > 0,
    };
  }).filter(Boolean);
}
