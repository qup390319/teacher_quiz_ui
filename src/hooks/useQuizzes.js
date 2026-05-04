 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useQuizzes() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes'),
  });
}

export function useQuiz(quizId) {
  return useQuery({
    queryKey: ['quizzes', quizId],
    queryFn: () => api.get(`/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

/** Upsert: if `id` exists in payload, PUT; otherwise POST. */
export function useSaveQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quiz) => {
      if (quiz.id) {
        // try PUT first; if 404, fall back to POST with that id
        try {
          return await api.put(`/quizzes/${quiz.id}`, quiz);
        } catch (err) {
          if (err?.status === 404) return api.post('/quizzes', quiz);
          throw err;
        }
      }
      return api.post('/quizzes', quiz);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      if (data?.id) qc.invalidateQueries({ queryKey: ['quizzes', data.id] });
    },
  });
}

export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quizId) => api.del(`/quizzes/${quizId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  });
}
