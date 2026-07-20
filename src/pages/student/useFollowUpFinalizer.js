/**
 * 單題追問收尾（自 StudentQuiz.jsx 抽出以符合 500 行上限）。
 *
 * 一題追問走到 final 時：
 *  1. 記錄追問結果 + 即時存檔；必要時呼叫 /llm/analyze-cause 補成因
 *  2. 依 statusChange 反向修正該題本地診斷（UPGRADED/DOWNGRADED）
 *  3. 依「已問題目序列」askedRef 前進到下一題追問,或收尾
 *
 * 動態選題不影響此處:followUpIndex 索引的是實際問過的題目序列。
 */
import { useCallback } from 'react';
import { api } from '../../lib/api';
import { knowledgeNodes, getMisconceptionById } from '../../data/knowledgeGraph';

export function useFollowUpFinalizer({
  followUpIndex,
  isRetryMode,
  askedRef,
  answersRef,
  followUpResultsRef,
  saveFollowup,
  finishQuiz,
  finishRetry,
  askFollowUpRound1,
  setFollowUpIndex,
  setIsThinking,
  setFollowUpEnabled,
}) {
  return useCallback(async (finalDiagnosis, ctxAtFinal) => {
    const result = {
      questionId: ctxAtFinal.questionId,
      followUpRounds: ctxAtFinal.round,
      conversationLog: ctxAtFinal.conversationLog,
      diagnosis: finalDiagnosis,
    };

    // LLM POE prompt 已自帶 causeIds 時跳過後端再分析
    const hasCauses = Array.isArray(finalDiagnosis.causeIds) && finalDiagnosis.causeIds.length > 0;
    if (!hasCauses && finalDiagnosis.finalStatus === 'MISCONCEPTION' && ctxAtFinal.conversationLog.length > 0) {
      try {
        const miscon = getMisconceptionById(finalDiagnosis.misconceptionCode);
        const node = knowledgeNodes.find((n) => n.id === ctxAtFinal.knowledgeNodeId);
        const resp = await api.post('/llm/analyze-cause', {
          conversationLog: ctxAtFinal.conversationLog,
          misconceptionCode: finalDiagnosis.misconceptionCode ?? null,
          misconceptionLabel: miscon?.label ?? null,
          knowledgeNode: node?.name ?? null,
        });
        result.diagnosis = { ...finalDiagnosis, causeIds: resp.causeIds ?? [] };
      } catch {
        // LLM 不可用時不阻擋流程
      }
    }

    followUpResultsRef.current = [...followUpResultsRef.current, result];
    // 即時存檔：該題追問一結束就背景送出對話紀錄（內部會等該題答案存完拿到 id）
    saveFollowup(result.questionId, result);

    /* 依 statusChange 反向修正 answersRef.current（僅本地，最終 POST 時送修正後值） */
    const change = finalDiagnosis.statusChange?.changeType;
    if (change === 'UPGRADED' && ctxAtFinal.misconceptionId) {
      answersRef.current = answersRef.current.map((a) =>
        a.questionId === ctxAtFinal.questionId ? { ...a, diagnosis: 'CORRECT' } : a,
      );
    } else if (change === 'DOWNGRADED' && finalDiagnosis.misconceptionCode) {
      answersRef.current = answersRef.current.map((a) =>
        a.questionId === ctxAtFinal.questionId
          ? { ...a, diagnosis: finalDiagnosis.misconceptionCode }
          : a,
      );
    }

    /* 進下一題或結束（追問階段走「已問題目」序列）*/
    const nextIdx = followUpIndex + 1;
    setIsThinking(true);
    setFollowUpEnabled(false);
    setTimeout(() => {
      setIsThinking(false);
      if (nextIdx >= askedRef.current.length) {
        setTimeout(() => (isRetryMode
          ? finishRetry(answersRef.current)
          : finishQuiz(answersRef.current, '謝謝你陪我聊完所有題目！')), 1500);
        return;
      }
      setFollowUpIndex(nextIdx);
      setTimeout(() => askFollowUpRound1(nextIdx), 1500);
    }, 1500);
  }, [followUpIndex, isRetryMode, askedRef, answersRef, followUpResultsRef, saveFollowup,
    finishQuiz, finishRetry, askFollowUpRound1, setFollowUpIndex, setIsThinking, setFollowUpEnabled]);
}
