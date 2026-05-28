import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Admin-only: list all classes across teachers. */
export function useAdminClasses(params = {}) {
  const { teacherId, schoolYear, semester, status: classStatus = 'all' } = params;
  const search = new URLSearchParams();
  if (teacherId) search.set('teacher_id', teacherId);
  if (schoolYear) search.set('school_year', String(schoolYear));
  if (semester) search.set('semester', semester);
  if (classStatus && classStatus !== 'all') search.set('status', classStatus);
  const qs = search.toString();
  return useQuery({
    queryKey: ['admin-classes', params],
    queryFn: () => api.get(`/admin/classes${qs ? `?${qs}` : ''}`),
  });
}

export function useAdminClass(classId, opts = {}) {
  return useQuery({
    queryKey: ['admin-classes', classId],
    queryFn: () => api.get(`/admin/classes/${classId}`),
    enabled: !!classId && (opts.enabled ?? true),
    ...opts,
  });
}

export function useAdminClassTeacher(classId, opts = {}) {
  return useQuery({
    queryKey: ['admin-classes', classId, 'teacher'],
    queryFn: () => api.get(`/admin/classes/${classId}/teacher`),
    enabled: !!classId && (opts.enabled ?? true),
    ...opts,
  });
}

export function useAdminCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/admin/classes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-classes'] });
    },
  });
}

export function useAdminAddStudent(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post(`/admin/classes/${classId}/students`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-classes', classId] });
      qc.invalidateQueries({ queryKey: ['admin-classes'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}
