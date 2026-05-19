import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function usePrerequisiteStatus(classId, nodeIds, { enabled = true } = {}) {
  const nodeIdsStr = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  return useQuery({
    queryKey: ['adaptive', 'prerequisite-status', classId, nodeIdsStr],
    queryFn: () => api.get(`/adaptive/prerequisite-status?classId=${classId}&nodeIds=${nodeIdsStr}`),
    enabled: enabled && !!classId && !!nodeIdsStr,
  });
}

export function useAdaptiveRecommend(classId, nodeIds, mode = 'diagnosis', { enabled = true } = {}) {
  const nodeIdsStr = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  return useQuery({
    queryKey: ['adaptive', 'recommend', classId, nodeIdsStr, mode],
    queryFn: () => api.get(`/adaptive/recommend?classId=${classId}&nodeIds=${nodeIdsStr}&mode=${mode}`),
    enabled: enabled && !!classId && !!nodeIdsStr,
  });
}

export function usePolishStem() {
  return useMutation({
    mutationFn: (payload) => api.post('/adaptive/polish-stem', payload),
  });
}

export function useSuggestOptions() {
  return useMutation({
    mutationFn: (payload) => api.post('/adaptive/suggest-options', payload),
  });
}
