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

/**
 * 本次施測適性路徑（診斷報告用）。後端重播適性引擎還原出題順序與退回/略過標註。
 * @param {string} quizId
 * @param {Array<{nodeId:string, passed:boolean}>} answered — 本次已作答節點
 */
export function useAdaptivePath(quizId, answered, { enabled = true } = {}) {
  const key = (answered || []).map((a) => `${a.nodeId}:${a.passed ? 1 : 0}`).join('|');
  return useQuery({
    queryKey: ['adaptive', 'trace-path', quizId, key],
    queryFn: () => api.post('/adaptive/trace-path', { quizId, answered }),
    enabled: enabled && !!quizId && (answered?.length ?? 0) > 0,
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
