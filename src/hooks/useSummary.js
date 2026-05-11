import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useGradeSummaryCache(quizId) {
  return useQuery({
    queryKey: ['ai-summary', 'grade', quizId],
    queryFn: () => api.get(`/ai/grade-summary?quizId=${encodeURIComponent(quizId)}`),
    enabled: !!quizId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClassSummaryCache(quizId, classId) {
  return useQuery({
    queryKey: ['ai-summary', 'class', quizId, classId],
    queryFn: () =>
      api.get(`/ai/class-summary?quizId=${encodeURIComponent(quizId)}&classId=${encodeURIComponent(classId)}`),
    enabled: !!quizId && !!classId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGradeSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, force }) =>
      api.post(`/ai/grade-summary${force ? '?force=true' : ''}`, payload),
    onSuccess: (_data, { payload }) => {
      qc.invalidateQueries({ queryKey: ['ai-summary', 'grade', payload.quizId] });
    },
  });
}

export function useClassSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, force }) =>
      api.post(`/ai/class-summary${force ? '?force=true' : ''}`, payload),
    onSuccess: (_data, { payload }) => {
      qc.invalidateQueries({ queryKey: ['ai-summary', 'class', payload.quizId, payload.classId] });
    },
  });
}
