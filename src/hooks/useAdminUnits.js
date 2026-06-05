import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Admin-only: list units（含已封存）。 */
export function useAdminUnits(params = {}) {
  const { gradeBand, status: unitStatus, type } = params;
  const search = new URLSearchParams();
  if (gradeBand) search.set('gradeBand', gradeBand);
  if (unitStatus) search.set('status', unitStatus);
  if (type) search.set('type', type);
  const qs = search.toString();
  return useQuery({
    queryKey: ['admin-units', params],
    queryFn: () => api.get(`/admin/units${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/admin/units', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-units'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/admin/units/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-units'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useArchiveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/admin/units/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-units'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useUnarchiveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/admin/units/${id}/unarchive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-units'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/admin/units/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-units'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

/** Public：給題組選擇器等用（任何登入者可讀）。
 *  type='unit' 只取教學單元（與管理員「單元管理」一致，不含 type='subtheme' 的次主題）。 */
export function useUnits(params = {}) {
  const { gradeBand, includeArchived = false, type } = params;
  const search = new URLSearchParams();
  if (gradeBand) search.set('gradeBand', gradeBand);
  if (includeArchived) search.set('includeArchived', 'true');
  if (type) search.set('type', type);
  const qs = search.toString();
  return useQuery({
    queryKey: ['units', params],
    queryFn: () => api.get(`/units${qs ? `?${qs}` : ''}`),
  });
}
