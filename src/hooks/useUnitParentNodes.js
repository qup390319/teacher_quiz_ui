/**
 * 教學單元 ↔ 課綱大節點 M:N 綁定（spec-11 §3.21 unit_parent_nodes）。
 *
 * 對應端點掛在 admin_units router 下：
 *   GET    /api/admin/units/{id}/parent-nodes
 *   POST   /api/admin/units/{id}/parent-nodes        body: { parentNodeIds }
 *   DELETE /api/admin/units/{id}/parent-nodes/{pid}
 *   PUT    /api/admin/units/{id}/parent-nodes/reorder body: { parentNodeIds }
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const key = (unitId) => ['unit-parent-nodes', unitId];

export function useUnitParentNodes(unitId) {
  return useQuery({
    queryKey: key(unitId),
    queryFn: () => api.get(`/admin/units/${encodeURIComponent(unitId)}/parent-nodes`),
    enabled: !!unitId,
  });
}

export function useAttachUnitParentNodes(unitId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentNodeIds) =>
      api.post(`/admin/units/${encodeURIComponent(unitId)}/parent-nodes`, { parentNodeIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(unitId) }),
  });
}

export function useDetachUnitParentNode(unitId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentNodeId) =>
      api.del(`/admin/units/${encodeURIComponent(unitId)}/parent-nodes/${encodeURIComponent(parentNodeId)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(unitId) }),
  });
}

export function useReorderUnitParentNodes(unitId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentNodeIds) =>
      api.put(`/admin/units/${encodeURIComponent(unitId)}/parent-nodes/reorder`, { parentNodeIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(unitId) }),
  });
}
