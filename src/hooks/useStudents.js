 
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
