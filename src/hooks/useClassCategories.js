/**
 * 班級分類（後端版，spec-04 §5.1 / spec-11 class_categories）。
 * 取代 `useClassCategoriesLocal` — 後端落地後不再依賴 localStorage。
 *
 * 端點：GET / POST / PATCH / DELETE / PUT reorder 都掛在 `/api/class-categories`。
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const KEY = ['class-categories'];

export function useClassCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get('/class-categories'),
  });
}

export function useCreateClassCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => api.post('/class-categories', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRenameClassCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }) => api.patch(`/class-categories/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteClassCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.del(`/class-categories/${id}`),
    onSuccess: () => {
      // 班級的 category_id 會被後端設為 null（FK SET NULL），所以一併重抓 classes
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useReorderClassCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => api.put('/class-categories/reorder', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
