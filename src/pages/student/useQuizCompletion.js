/**
 * 學生測驗收尾流程（自 StudentQuiz.jsx 抽出以符合 500 行上限）。
 *
 * 提供兩個收尾函數：
 *  - finishQuiz：一般模式,整份作答 + 追問結果彙整成報告紀錄、flush 存檔、導向報告頁
 *  - finishRetry：單題重做模式,把該題新結果併回現有報告（不建立新報告）
 *
 * 不含任何選題/追問邏輯,純收尾;動態選題不影響此處（吃的是最終 answers/followUpResults）。
 */
import { useCallback } from 'react';

export function useQuizCompletion({
  quizId,
  currentQuiz,
  retryQuestionId,
  followUpResultsRef,
  flushAll,
  addToHistory,
  mergeRetryIntoReport,
  navigate,
  setIsThinking,
  setMessages,
  setPhase,
}) {
  const finishQuiz = useCallback(async (finalAnswers, leadText) => {
    const record = {
      quizId,
      quizTitle: currentQuiz?.title ?? '科學診斷',
      completedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      totalQuestions: finalAnswers.length,
      correctCount: finalAnswers.filter((a) => a.diagnosis === 'CORRECT').length,
      misconceptions: [
        ...new Set(
          finalAnswers.filter((a) => a.diagnosis !== 'CORRECT').map((a) => a.diagnosis),
        ),
      ],
      answers: finalAnswers,
      followUpResults: [...followUpResultsRef.current],
    };

    setIsThinking(true);
    setMessages((prev) => [
      ...prev,
      { id: `done-1-${Date.now()}`, role: 'ai', text: leadText },
      { id: `done-2-${Date.now()}`, role: 'ai', text: '讓我把所有對話整理一下，幫你做一份專屬的「診斷報告」⋯' },
    ]);
    setPhase('done');

    // 結尾保險：即時存若有漏，這裡整批 re-upsert 補齊（冪等）。
    await flushAll(finalAnswers, followUpResultsRef.current);

    addToHistory(record);
    setIsThinking(false);
    setTimeout(() => navigate('/student/report'), 1200);
  }, [quizId, currentQuiz, followUpResultsRef, flushAll, addToHistory,
    navigate, setIsThinking, setMessages, setPhase]);

  const finishRetry = useCallback(async (finalAnswers) => {
    const answer = finalAnswers.find((a) => a.questionId === retryQuestionId)
      ?? finalAnswers[0] ?? null;
    const followUpResult = followUpResultsRef.current.find((r) => r.questionId === retryQuestionId)
      ?? followUpResultsRef.current[0] ?? null;

    setIsThinking(true);
    setMessages((prev) => [
      ...prev,
      { id: `retry-done-${Date.now()}`, role: 'ai', text: '好，我把這一題重新整理進你的報告囉⋯' },
    ]);
    setPhase('done');

    await flushAll(finalAnswers, followUpResultsRef.current);
    mergeRetryIntoReport(retryQuestionId, { answer, followUpResult });
    setIsThinking(false);
    setTimeout(() => navigate('/student/report'), 1000);
  }, [retryQuestionId, followUpResultsRef, flushAll, mergeRetryIntoReport,
    navigate, setIsThinking, setMessages, setPhase]);

  return { finishQuiz, finishRetry };
}
