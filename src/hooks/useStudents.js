 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Teacher-only: returns plaintext password. */
export function useStudent(studentId, opts = {}) {
  return useQuery({
    queryKey: ['students', studentId],
    queryFn: () => api.get(`/students/${studentId}`),
    enabled: !!studentId && (opts.enabled ?? true),
    ...opts,
  });
}

export function useResetStudentPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId) => api.post(`/students/${studentId}/reset-password`),
    onSuccess: (_data, studentId) => {
      qc.invalidateQueries({ queryKey: ['students', studentId] });
    },
  });
}

/** Aggregated quiz history for a student (one row per quiz, latest attempt). */
export function useStudentHistory(studentId, opts = {}) {
  return useQuery({
    queryKey: ['students', studentId, 'history'],
    queryFn: () => api.get(`/students/${studentId}/history`),
    enabled: !!studentId && (opts.enabled ?? true),
    ...opts,
  });
}
