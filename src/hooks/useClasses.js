
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

/**
 * 把 filter 物件序列化成 query string。
 * - 省略 filter（undefined）→ 由 hook 內部讀 AppContext 帶入當前學年/學期/false
 * - 傳空物件 `{}` → 不帶任何 query，server 回所有班級
 * - filter 個別欄位省略 → 不帶對應 query（server 端不過濾該欄位）
 */
function toQuery(filter) {
  if (!filter) return '';
  const parts = [];
  if (filter.schoolYear != null) parts.push(`school_year=${encodeURIComponent(filter.schoolYear)}`);
  if (filter.semester != null) parts.push(`semester=${encodeURIComponent(filter.semester)}`);
  if (filter.includeArchived) parts.push('include_archived=true');
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * 列出當前教師可見的班級。
 * - `useClasses()` 省略參數 → 自動帶入 AppContext 的 currentSchoolYear / currentSemester / includeArchivedClasses
 * - `useClasses({})` → 不過濾，server 回所有班級（用於歷史查閱）
 * - `useClasses({ schoolYear, semester, includeArchived })` → 顯式控制
 */
export function useClasses(filter) {
  const ctx = useApp();
  const effective = filter ?? {
    schoolYear: ctx.currentSchoolYear,
    semester: ctx.currentSemester,
    includeArchived: ctx.includeArchivedClasses,
  };
  const query = toQuery(effective);
  return useQuery({
    queryKey: ['classes', effective],
    queryFn: () => api.get(`/classes${query}`),
  });
}

export function useClass(classId) {
  return useQuery({
    queryKey: ['classes', classId],
    queryFn: () => api.get(`/classes/${classId}`),
    enabled: !!classId,
  });
}

/** Create a new (empty) class. payload: { name, grade, subject, color, textColor, schoolYear?, semester?, note? } */
export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/classes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

/** Update class metadata. payload: { classId, ...patch } where patch has name/grade/subject/color/textColor/note/schoolYear/semester. */
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

/** Soft-archive a class. status='archived'; history data preserved. */
export function useArchiveClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId) => api.post(`/classes/${classId}/archive`),
    onSuccess: (_data, classId) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classes', classId] });
    },
  });
}

/** Restore an archived class to active. */
export function useUnarchiveClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId) => api.post(`/classes/${classId}/unarchive`),
    onSuccess: (_data, classId) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classes', classId] });
    },
  });
}

/** Delete a class and all its students / assignments. */
export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId) => api.del(`/classes/${classId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
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
