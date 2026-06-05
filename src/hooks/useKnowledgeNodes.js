import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * 教師端公開讀取知識節點（含迷思）。任何登入者可讀（後端 GET /knowledge-nodes）。
 *
 * 重要資料模型：教學單元（type='unit'，如「水溶液」）與知識節點的關聯**不是**靠
 * knowledge_nodes.unit_id（那指向次主題，如 unit-jb / unit-jd），而是靠
 * 「教學單元 → 大節點（unit_parent_nodes）→ 知識節點（parentNodeId）」。
 * 因此要取得某教學單元的節點，需用該單元的 parentNodes 反查（見 nodesForUnit）。
 */

function apiToNode(n) {
  return {
    id: n.id,
    name: n.name,
    description: n.description ?? '',
    videoUrl: n.videoUrl ?? '',
    videoTitle: n.videoTitle ?? '',
    level: n.learningOrder ?? 1,
    prerequisites: n.prerequisites ?? [],
    misconceptions: (n.misconceptions ?? []).map((m) => ({
      id: m.id,
      label: m.label,
      detail: m.detail ?? '',
      studentDetail: m.studentDetail ?? '',
      confirmQuestion: m.confirmQuestion ?? '',
    })),
    teachingStrategy: n.teachingStrategy ?? '',
    studentHint: n.studentHint ?? '',
    unitId: n.unitId ?? null,
    gradeBand: n.gradeBand ?? null,
    parentNodeId: n.parentNodeId ?? null,
    parentCode: n.parentCode ?? null,
    parentName: n.parentName ?? null,
    canvasX: n.canvasX ?? null,
    canvasY: n.canvasY ?? null,
  };
}

/**
 * 取得全部單元的節點（不分單元）。用於：
 *  - 單元選擇器計算每個單元的「節點數 / 迷思數」
 *  - 出題精靈依所選教學單元的大節點過濾出該單元節點
 *  - 編輯既有題組時反推所屬單元
 */
export function useAllKnowledgeNodes() {
  return useQuery({
    queryKey: ['knowledge-nodes', 'all'],
    queryFn: () => api.get('/knowledge-nodes'),
    select: (data) => (data ?? []).map(apiToNode),
  });
}

/**
 * 依「教學單元的大節點」過濾出該單元底下的知識節點。
 * @param {object} unit — UnitBrief（含 `parentNodes: [{ parentNodeId }]`）
 * @param {Array}  allNodes — useAllKnowledgeNodes() 的結果
 * @returns {Array} 該教學單元的知識節點（依大節點 sort_order、學習順序排序）
 */
export function nodesForUnit(unit, allNodes = []) {
  if (!unit || !Array.isArray(unit.parentNodes) || unit.parentNodes.length === 0) return [];
  const order = new Map(unit.parentNodes.map((p, i) => [p.parentNodeId, i]));
  return allNodes
    .filter((n) => order.has(n.parentNodeId))
    .sort((a, b) =>
      (order.get(a.parentNodeId) - order.get(b.parentNodeId))
      || (a.level - b.level)
      || a.id.localeCompare(b.id));
}
