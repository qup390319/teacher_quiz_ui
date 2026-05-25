import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Admin-only: list teachers/students. See spec-13 §7.4 admin row.
 * params: { role?: 'teacher'|'student', q?: string, active?: 'active'|'disabled'|'all' }
 */
export function useAdminUsers(params = {}) {
  const { role, q, active = 'all' } = params;
  const search = new URLSearchParams();
  if (role) search.set('role', role);
  if (q) search.set('q', q);
  if (active && active !== 'all') search.set('active', active);
  const qs = search.toString();
  return useQuery({
    queryKey: ['admin-users', { role, q, active }],
    queryFn: () => api.get(`/admin/users${qs ? `?${qs}` : ''}`),
  });
}

/** Admin-only: get single user with plaintext password. */
export function useAdminUser(userId, opts = {}) {
  return useQuery({
    queryKey: ['admin-users', 'detail', userId],
    queryFn: () => api.get(`/admin/users/${userId}`),
    enabled: !!userId && (opts.enabled ?? true),
    ...opts,
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ account, name }) => api.post('/admin/users', { account, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.patch(`/admin/users/${userId}/disable`),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users', 'detail', userId] });
    },
  });
}

export function useEnableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.patch(`/admin/users/${userId}/enable`),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users', 'detail', userId] });
    },
  });
}

export function useAdminResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.post(`/admin/users/${userId}/reset-password`),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ['admin-users', 'detail', userId] });
    },
  });
}
