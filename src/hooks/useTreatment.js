 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** 學生端：取自己 + scenarioQuiz 對應的 session（可能不存在 → 回 null） */
export function useTreatmentSessionByKey(scenarioQuizId, studentId) {
  return useQuery({
    queryKey: ['treatment-session', scenarioQuizId, studentId],
    queryFn: () => api.get(`/treatment/sessions/by-key/${scenarioQuizId}/${studentId}`),
    enabled: !!scenarioQuizId && !!studentId,
  });
}

/** 任何角色：取單一 session 含 messages */
export function useTreatmentSession(sessionId) {
  return useQuery({
    queryKey: ['treatment-session', sessionId],
    queryFn: () => api.get(`/treatment/sessions/${sessionId}`),
    enabled: !!sessionId,
  });
}

/** 啟動或取得既有 session（idempotent） */
export function useStartTreatmentSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenarioQuizId) =>
      api.post('/treatment/sessions/start', { scenarioQuizId }),
    onSuccess: (data) => {
      if (!data) return;
      qc.invalidateQueries({ queryKey: ['treatment-session', data.scenarioQuizId, data.studentId] });
      qc.invalidateQueries({ queryKey: ['treatment-session', data.id] });
      qc.invalidateQueries({ queryKey: ['treatment-logs'] });
    },
  });
}

/** 追加一則訊息（學生 / AI 都用同一端點） */
export function useAppendTreatmentMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ...body }) =>
      api.post(`/treatment/sessions/${sessionId}/messages`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['treatment-session', vars.sessionId] });
    },
  });
}

/** 切到下一題 */
export function useAdvanceTreatmentQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, nextIndex }) =>
      api.patch(`/treatment/sessions/${sessionId}/advance`, { nextIndex }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['treatment-session', vars.sessionId] });
    },
  });
}

/** 標記 session 完成 */
export function useCompleteTreatmentSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => api.post(`/treatment/sessions/${sessionId}/complete`),
    onSuccess: (data, sessionId) => {
      qc.invalidateQueries({ queryKey: ['treatment-session', sessionId] });
      if (data) {
        qc.invalidateQueries({
          queryKey: ['treatment-session', data.scenarioQuizId, data.studentId],
        });
      }
      qc.invalidateQueries({ queryKey: ['treatment-logs'] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

/** 教師端：treatment-logs 列表 */
export function useTreatmentLogs(filters = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') params.append(k, v);
  }
  const qs = params.toString();
  return useQuery({
    queryKey: ['treatment-logs', filters],
    queryFn: () => api.get(`/teachers/treatment-logs${qs ? `?${qs}` : ''}`),
  });
}

/** 教師端：單一 session 詳情 */
export function useTreatmentLog(sessionId) {
  return useQuery({
    queryKey: ['treatment-logs', sessionId],
    queryFn: () => api.get(`/teachers/treatment-logs/${sessionId}`),
    enabled: !!sessionId,
  });
}
