import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Admin-only: list parent nodes (大節點)。 */
export function useAdminParentNodes(params = {}) {
  const { unitId } = params;
  const search = new URLSearchParams();
  if (unitId) search.set('unitId', unitId);
  const qs = search.toString();
  return useQuery({
    queryKey: ['admin-parent-nodes', params],
    queryFn: () => api.get(`/admin/parent-nodes${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateParentNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/admin/parent-nodes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-parent-nodes'] });
      qc.invalidateQueries({ queryKey: ['parent-nodes'] });
    },
  });
}

export function useUpdateParentNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/admin/parent-nodes/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-parent-nodes'] });
      qc.invalidateQueries({ queryKey: ['parent-nodes'] });
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
    },
  });
}

export function useDeleteParentNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/admin/parent-nodes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-parent-nodes'] });
      qc.invalidateQueries({ queryKey: ['parent-nodes'] });
    },
  });
}

/** 拖曳結束時呼叫，批次更新 display_order。 */
export function useBulkReorderParentNodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items) => api.post('/admin/parent-nodes/bulk-reorder', { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-parent-nodes'] });
      qc.invalidateQueries({ queryKey: ['parent-nodes'] });
    },
  });
}
