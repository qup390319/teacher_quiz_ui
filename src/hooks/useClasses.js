 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes'),
  });
}

export function useClass(classId) {
  return useQuery({
    queryKey: ['classes', classId],
    queryFn: () => api.get(`/classes/${classId}`),
    enabled: !!classId,
  });
}

/** Replace the entire roster of a class. payload: { classId, students: [{name, seat, account?}] } */
export function useUpdateClassStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, students }) =>
      api.put(`/classes/${classId}/students`, { students }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classes', vars.classId] });
    },
  });
}
