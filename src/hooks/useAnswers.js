 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** 教師查單班作答（{rows: [{studentId, studentName, seat, answers:[{questionId, selectedTag}]}]}） */
export function useClassAnswers(quizId, classId) {
  return useQuery({
    queryKey: ['answers', quizId, classId],
    queryFn: () => api.get(`/quizzes/${quizId}/answers?classId=${encodeURIComponent(classId)}`),
    enabled: !!quizId && !!classId,
  });
}

/** 教師查考卷統計：classId 可選（不給則全年級） */
export function useQuizStats(quizId, classId) {
  return useQuery({
    queryKey: ['quiz-stats', quizId, classId ?? '*'],
    queryFn: () => {
      const qs = classId ? `?classId=${encodeURIComponent(classId)}` : '';
      return api.get(`/quizzes/${quizId}/stats${qs}`);
    },
    enabled: !!quizId,
  });
}

/** 教師查單班的「追問對話紀錄」（含 conversationLog / aiSummary 等完整資料）
 *  回傳 { quizId, classId, rows: [{ studentId, studentName, seat, questionId,
 *  selectedTag, diagnosis, finalStatus, misconceptionCode, reasoningQuality,
 *  aiSummary, statusChange, conversationLog, answeredAt }] }
 */
export function useClassFollowups(quizId, classId) {
  return useQuery({
    queryKey: ['followups', quizId, classId],
    queryFn: () => api.get(`/quizzes/${quizId}/followups?classId=${encodeURIComponent(classId)}`),
    enabled: !!quizId && !!classId,
  });
}

/** 學生作答歷史（自己的；教師可查任何學生的） */
export function useStudentHistory(studentId) {
  return useQuery({
    queryKey: ['student-history', studentId],
    queryFn: () => api.get(`/students/${studentId}/history`),
    enabled: !!studentId,
  });
}

/** 學生提交一批作答 */
export function useRecordAnswers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers) => api.post('/answers', { answers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz-stats'] });
      qc.invalidateQueries({ queryKey: ['answers'] });
      qc.invalidateQueries({ queryKey: ['student-history'] });
      // 學生作答後 myDiagnosisCompleted 會翻成 true，需要 refresh 派題列表
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

/** 學生提交一批追問結果（驅動 statusChange 自動修正第一階段 diagnosis） */
export function useRecordFollowups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (followups) => api.post('/answers/followups', { followups }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz-stats'] });
      qc.invalidateQueries({ queryKey: ['answers'] });
      qc.invalidateQueries({ queryKey: ['followups'] });
      qc.invalidateQueries({ queryKey: ['student-history'] });
      // 學生作答後 myDiagnosisCompleted 會翻成 true，需要 refresh 派題列表
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}
