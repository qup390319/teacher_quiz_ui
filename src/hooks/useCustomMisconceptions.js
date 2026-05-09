import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * 教師自訂迷思 hook（per-teacher 私有，後端 spec-04 §2.6）。
 * 後端已用 cookie 自動辨識教師，不需要傳 teacherId。
 */
export function useCustomMisconceptions() {
  return useQuery({
    queryKey: ['custom-misconceptions'],
    queryFn: () => api.get('/misconceptions/custom'),
  });
}

export function useCreateCustomMisconception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/misconceptions/custom', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-misconceptions'] }),
  });
}

export function useDeleteCustomMisconception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/misconceptions/custom/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-misconceptions'] }),
  });
}
