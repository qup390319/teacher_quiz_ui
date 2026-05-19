import { knowledgeNodes } from '../data/knowledgeGraph';

const nodeMap = Object.fromEntries(knowledgeNodes.map((n) => [n.id, n]));

export function getNodeById(id) {
  return nodeMap[id] ?? null;
}

export function getAllPrerequisites(nodeId) {
  const visited = new Set();
  const order = [];
  const queue = [...(nodeMap[nodeId]?.prerequisites ?? [])];
  while (queue.length) {
    const nid = queue.shift();
    if (visited.has(nid)) continue;
    visited.add(nid);
    order.push(nid);
    queue.push(...(nodeMap[nid]?.prerequisites ?? []));
  }
  order.reverse();
  return order;
}

function sortKey(nid) {
  const n = nodeMap[nid];
  if (!n) return [2, 99, nid];
  const subtopic = nid.startsWith('INe-II') ? 0 : 1;
  return [subtopic, n.level, nid];
}

function compareSortKey(a, b) {
  const ka = sortKey(a);
  const kb = sortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

export function topoSortNodes(nodeIds) {
  const subset = new Set(nodeIds);
  const inDegree = Object.fromEntries([...subset].map((id) => [id, 0]));
  const adj = Object.fromEntries([...subset].map((id) => [id, []]));

  for (const nid of subset) {
    for (const pre of nodeMap[nid]?.prerequisites ?? []) {
      if (subset.has(pre)) {
        inDegree[nid]++;
        adj[pre].push(nid);
      }
    }
  }

  const queue = [...subset].filter((n) => inDegree[n] === 0).sort(compareSortKey);
  const result = [];

  while (queue.length) {
    const curr = queue.shift();
    result.push(curr);
    for (const succ of adj[curr]) {
      inDegree[succ]--;
      if (inDegree[succ] === 0) {
        queue.push(succ);
        queue.sort(compareSortKey);
      }
    }
  }
  return result;
}

export function sortQuestionsByNodeOrder(questions, nodeIds) {
  const sorted = topoSortNodes(nodeIds);
  const orderMap = Object.fromEntries(sorted.map((id, idx) => [id, idx]));
  return [...questions].sort((a, b) => {
    const oa = orderMap[a.knowledgeNodeId] ?? 999;
    const ob = orderMap[b.knowledgeNodeId] ?? 999;
    if (oa !== ob) return oa - ob;
    return a.id - b.id;
  });
}
