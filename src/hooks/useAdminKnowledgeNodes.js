import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Admin-only: list knowledge nodes（含迷思）。
 *
 * params:
 *   unitId — 限定單元
 *   unassigned — true 時忽略 unitId，回未分配單元的節點
 *   gradeBand — lower/middle/upper
 *   onCanvas — true: 畫布上、false: 節點庫、undefined: 全部
 */
export function useAdminKnowledgeNodes(params = {}) {
  const { unitId, unassigned = false, gradeBand, onCanvas } = params;
  const search = new URLSearchParams();
  if (unassigned) search.set('unassigned', 'true');
  if (!unassigned && unitId) search.set('unitId', unitId);
  if (gradeBand) search.set('gradeBand', gradeBand);
  if (onCanvas !== undefined) search.set('onCanvas', String(onCanvas));
  const qs = search.toString();
  return useQuery({
    queryKey: ['admin-knowledge-nodes', params],
    queryFn: () => api.get(`/admin/knowledge-nodes${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateKnowledgeNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/admin/knowledge-nodes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
      qc.invalidateQueries({ queryKey: ['knowledge-nodes'] });
    },
  });
}

export function useUpdateKnowledgeNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/admin/knowledge-nodes/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
      qc.invalidateQueries({ queryKey: ['knowledge-nodes'] });
    },
  });
}

export function useDeleteKnowledgeNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/admin/knowledge-nodes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}

export function useBulkUpdatePositions() {
  return useMutation({
    mutationFn: (positions) => api.post('/admin/knowledge-nodes/bulk-positions', { positions }),
  });
}

export function useBulkAssignUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeIds, unitId }) =>
      api.post('/admin/knowledge-nodes/bulk-assign-unit', { nodeIds, unitId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}

/** W5c：加入畫布 (onCanvas=true) 或從畫布移除 (false)。 */
export function useBulkSetCanvas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeIds, onCanvas }) =>
      api.post('/admin/knowledge-nodes/bulk-set-canvas', { nodeIds, onCanvas }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}

export function useCreateMisconception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, ...payload }) =>
      api.post(`/admin/knowledge-nodes/${nodeId}/misconceptions`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}

export function useUpdateMisconception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/admin/misconceptions/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}

export function useDeleteMisconception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/admin/misconceptions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}
