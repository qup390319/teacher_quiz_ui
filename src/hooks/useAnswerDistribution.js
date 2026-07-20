import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useQuiz } from './useQuizzes';

/**
 * 所有班級答題分布聚合 hook
 *
 * 對「指定題組的所有派發班級」逐班拿 answers，再計算每位學生的個人答對率，
 * 最後彙整為「全對 / 對一半 / 全錯」三個 bucket。
 *
 * Bucket 規則（呼應教授對「不只看平均」的需求）：
 *   - 全對：答對率 100%
 *   - 對一半：1 ~ 99%（至少答對 1 題、未全對）
 *   - 全錯：0%
 *
 * 注意：`/quizzes/{id}/answers` 會為「每位在籍學生」回傳一列（未作答者各題
 * selectedTag 為 null）。**完全未作答的學生不計入分布**，否則會被誤判為「全錯」，
 * 造成「作答人數 0 卻顯示全錯一整班」。total 因此等於實際作答人數。
 *
 * @param {string} quizId
 * @param {Array} classes - 此題組已派發的班級陣列 (overviewData.classStats)
 * @returns {{ fullCorrect, partial, allWrong, total, loading }}
 */
export function useAnswerDistribution(quizId, classes) {
  const { data: quiz } = useQuiz(quizId);

  const answersQueries = useQueries({
    queries: (classes ?? []).map((c) => ({
      queryKey: ['answers', quizId, c.id],
      queryFn: () => api.get(`/quizzes/${quizId}/answers?classId=${encodeURIComponent(c.id)}`),
      enabled: !!quizId && !!c?.id,
    })),
  });

  return useMemo(() => {
    const loading = !quiz || answersQueries.some((q) => q.isLoading);
    if (loading) {
      return { fullCorrect: 0, partial: 0, allWrong: 0, total: 0, loading: true };
    }

    const correctTagByQuestion = {};
    (quiz?.questions ?? []).forEach((q) => {
      const correct = q.options?.find((o) => o.diagnosis === 'CORRECT');
      if (correct) correctTagByQuestion[q.id] = correct.tag;
    });
    const totalQ = Object.keys(correctTagByQuestion).length;
    if (totalQ === 0) {
      return { fullCorrect: 0, partial: 0, allWrong: 0, total: 0, loading: false };
    }

    let fullCorrect = 0;
    let partial = 0;
    let allWrong = 0;
    answersQueries.forEach((q) => {
      const rows = q.data?.rows ?? [];
      rows.forEach((r) => {
        const answered = (r.answers ?? []).filter((a) => a.selectedTag != null);
        if (answered.length === 0) return; // 完全未作答者不計入答題分布
        const correct = answered.filter(
          (a) => correctTagByQuestion[a.questionId] && a.selectedTag === correctTagByQuestion[a.questionId],
        ).length;
        if (correct === totalQ) fullCorrect += 1;
        else if (correct === 0) allWrong += 1;
        else partial += 1;
      });
    });

    return {
      fullCorrect,
      partial,
      allWrong,
      total: fullCorrect + partial + allWrong,
      loading: false,
    };
  }, [quiz, answersQueries]);
}
