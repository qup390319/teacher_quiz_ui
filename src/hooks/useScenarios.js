 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useScenarios() {
  return useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.get('/scenarios'),
  });
}

export function useScenario(id) {
  return useQuery({
    queryKey: ['scenarios', id],
    queryFn: () => api.get(`/scenarios/${id}`),
    enabled: !!id,
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scenario) => {
      if (scenario.id) {
        try {
          return await api.put(`/scenarios/${scenario.id}`, scenario);
        } catch (err) {
          if (err?.status === 404) return api.post('/scenarios', scenario);
          throw err;
        }
      }
      return api.post('/scenarios', scenario);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scenarios'] });
      if (data?.id) qc.invalidateQueries({ queryKey: ['scenarios', data.id] });
    },
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/scenarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}
