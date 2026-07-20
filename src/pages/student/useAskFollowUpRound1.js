/**
 * 追問第一輪開場（自 StudentQuiz.jsx 抽出以符合 500 行上限）。
 *
 * 依 askedRef 序列的第 qIdx 題,組出追問 ctx（含學生第一層所選答案 / 理由 / 四象限）,
 * 依序丟出「開場 → round1 提問」訊息,並啟用學生輸入。
 * 動態選題不影響此處:qIdx 索引的是「實際問過的題目」序列。
 */
import { useCallback } from 'react';
import { getAnswerOptions, getReasonOptions } from '../../data/twoTier';
import { buildRound1Message } from './followUp/followUpEngine';

export function useAskFollowUpRound1({
  askedRef,
  answersRef,
  finishQuiz,
  setFollowUpCtx,
  setFollowUpEnabled,
  setIsThinking,
  setFollowUpInput,
  setFollowUpChips,
  setMessages,
}) {
  return useCallback((qIdx) => {
    const q = askedRef.current[qIdx];
    if (!q) {
      finishQuiz(answersRef.current, '謝謝你！我已經整理好你的診斷結果了。');
      return;
    }
    const answer = answersRef.current.find((a) => a.questionId === q.id);
    const selectedOption = getAnswerOptions(q).find((o) => o.tag === answer?.selectedTag);
    const reasonOption = getReasonOptions(q).find((o) => o.tag === answer?.reasonTag);
    const isCorrect = answer?.diagnosis === 'CORRECT';
    // two-tier：把學生選的「理由」併進 selectedOptionContent，讓追問 prompt 能引用其真實理由
    const selectedOptionContent = reasonOption
      ? `${selectedOption?.content ?? ''}（理由：${reasonOption.content}）`
      : (selectedOption?.content ?? '');

    const ctx = {
      round: 1,
      phase: 'belief',
      strategy: null,
      isCorrect,
      misconceptionId: isCorrect ? null : answer?.diagnosis,
      knowledgeNodeId: q.knowledgeNodeId,
      conversationLog: [],
      questionId: q.id,
      questionStem: q.stem,
      selectedOption,
      selectedOptionContent,
      selectedReasonContent: reasonOption?.content ?? '',
      quadrant: answer?.quadrant ?? null,
    };
    setFollowUpCtx(ctx);
    setFollowUpEnabled(false);
    setIsThinking(true);
    setFollowUpInput('');
    setFollowUpChips(null);

    setTimeout(() => {
      setIsThinking(false);
      const headerText = `接下來想跟你聊聊第 ${qIdx + 1} 題。`;
      const askText = buildRound1Message(selectedOption, isCorrect);
      setMessages((prev) => [
        ...prev,
        { id: `fu-${q.id}-header`, role: 'ai', text: headerText },
      ]);
      setTimeout(() => {
        setIsThinking(true);
        setTimeout(() => {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            { id: `fu-${q.id}-r1`, role: 'ai', text: askText },
          ]);
          setFollowUpCtx((c) => c && {
            ...c,
            conversationLog: [{ role: 'ai', content: askText }],
          });
          setFollowUpEnabled(true);
        }, 1600);
      }, 1200);
    }, 1800);
  }, [askedRef, answersRef, finishQuiz, setFollowUpCtx, setFollowUpEnabled,
    setIsThinking, setFollowUpInput, setFollowUpChips, setMessages]);
}
