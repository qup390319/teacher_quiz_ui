 
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * N1 / N2 — both are "trigger on demand" mutations rather than queries.
 * Frontend computes statistics (from mock answer distributions in P3,
 * later from DB in P4) and POSTs them; backend builds prompt + RAGFlow.
 */

export function useGradeSummary() {
  return useMutation({
    mutationFn: (payload) => api.post('/ai/grade-summary', payload),
  });
}

export function useClassSummary() {
  return useMutation({
    mutationFn: (payload) => api.post('/ai/class-summary', payload),
  });
}
