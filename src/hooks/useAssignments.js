 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** filters: { type?, classId?, quizId?, scenarioQuizId? } */
export function useAssignments(filters = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') params.append(k, v);
  }
  const qs = params.toString();
  return useQuery({
    queryKey: ['assignments', filters],
    queryFn: () => api.get(`/assignments${qs ? `?${qs}` : ''}`),
  });
}

export function useAddAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignment) => api.post('/assignments', assignment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }) => api.patch(`/assignments/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}
