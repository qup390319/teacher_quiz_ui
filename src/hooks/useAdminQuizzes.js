import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Admin-only: list all teachers' quizzes (含 owner 教師資訊). */
export function useAdminQuizzes() {
  return useQuery({
    queryKey: ['admin-quizzes'],
    queryFn: () => api.get('/admin/quizzes'),
  });
}

/** 切換題組是否為系統範例。 */
export function useToggleSampleQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isSample }) =>
      api.patch(`/admin/quizzes/${id}/sample`, { isSample }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-quizzes'] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}
