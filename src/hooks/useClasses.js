 
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

/** Create a new (empty) class. payload: { name, grade, subject, color, textColor } */
export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/classes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

/** Update class metadata. payload: { classId, ...patch } where patch has name/grade/subject/color/textColor/note. */
export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, ...patch }) => api.patch(`/classes/${classId}`, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classes', vars.classId] });
    },
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
