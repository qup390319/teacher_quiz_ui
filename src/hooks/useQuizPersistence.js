/**
 * 學生作答即時存檔 hook（資料保全用）
 *
 * 設計目標：避免「全部做完才一次 POST」造成中途離開即整場資料遺失。
 *   - saveAnswer：第一層每選一題答案就立刻 upsert（背景送、失敗重試）
 *   - saveFollowup：第二層每題追問對話一結束就立刻送（race-safe，內部等該題答案存完）
 *   - flushAll：finishQuiz 時整批再補送一次當保險（idempotent）
 *   - saveError：任何存檔最終仍失敗 → true，供畫面顯示警告給監考老師
 *
 * 後端 /api/answers 為 upsert、/api/answers/followups 為 delete-then-insert，
 * 故重複送出皆為冪等，flushAll 與即時存可安全並存。詳見 spec-10 §6。
 */
import { useCallback, useRef, useState } from 'react';
import { useRecordAnswers, useRecordFollowups } from './useAnswers';

const MAX_RETRY = 2;
const RETRY_BASE_DELAY_MS = 800;

async function withRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRY) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

function toFollowupPayload(studentAnswerId, result) {
  return {
    studentAnswerId,
    conversationLog: result.conversationLog,
    finalStatus: result.diagnosis.finalStatus,
    misconceptionCode: result.diagnosis.misconceptionCode ?? null,
    reasoningQuality: result.diagnosis.reasoningQuality,
    statusChange: result.diagnosis.statusChange ?? {},
    aiSummary: result.diagnosis.aiSummary ?? null,
    causeIds: result.diagnosis.causeIds ?? null,
  };
}

/**
 * @param {string|null} assignmentId 派題 id；為 null 時所有存檔皆 no-op（前端 demo 模式）
 */
export function useQuizPersistence(assignmentId) {
  const recordAnswers = useRecordAnswers();
  const recordFollowups = useRecordFollowups();
  // questionId → server answer id
  const answerIdByQuestionRef = useRef({});
  // questionId → 該題答案存檔的 in-flight promise（讓 followup 可等它完成再拿 id）
  const answerSaveRef = useRef({});
  const [saveError, setSaveError] = useState(false);

  const resetPersistence = useCallback(() => {
    answerIdByQuestionRef.current = {};
    answerSaveRef.current = {};
    setSaveError(false);
  }, []);

  /** 即時 upsert 單題答案；回傳 Promise<id|null> 並把 id 暫存供 followup 使用。 */
  const saveAnswer = useCallback((answer) => {
    if (!assignmentId) return Promise.resolve(null);
    const p = (async () => {
      try {
        const inserted = await withRetry(() => recordAnswers.mutateAsync([{
          assignmentId,
          questionId: answer.questionId,
          selectedTag: answer.selectedTag,
          diagnosis: answer.diagnosis,
        }]));
        const row = (inserted ?? [])[0];
        const id = row ? row.id : null;
        if (id != null) answerIdByQuestionRef.current[answer.questionId] = id;
        return id;
      } catch (err) {
        console.error('[persist] saveAnswer failed', answer.questionId, err);
        setSaveError(true);
        return null;
      }
    })();
    answerSaveRef.current[answer.questionId] = p;
    return p;
  }, [assignmentId, recordAnswers]);

  /** 即時送出單題追問結果；內部先等該題答案存完拿到 id（race-safe）。 */
  const saveFollowup = useCallback(async (questionId, result) => {
    if (!assignmentId) return;
    // 等該題答案的即時存檔落地（若曾呼叫過 saveAnswer）
    await (answerSaveRef.current[questionId] ?? Promise.resolve());
    const studentAnswerId = answerIdByQuestionRef.current[questionId];
    if (studentAnswerId == null) {
      // 答案 id 還沒拿到（即時存失敗）；交給 finishQuiz 的 flushAll 補送
      console.error('[persist] saveFollowup missing answerId, defer to flushAll', questionId);
      setSaveError(true);
      return;
    }
    try {
      await withRetry(() => recordFollowups.mutateAsync([toFollowupPayload(studentAnswerId, result)]));
    } catch (err) {
      console.error('[persist] saveFollowup failed', questionId, err);
      setSaveError(true);
    }
  }, [assignmentId, recordFollowups]);

  /** 結尾保險：整批 re-upsert 答案 + 補送所有追問（冪等）。 */
  const flushAll = useCallback(async (finalAnswers, followupResults) => {
    if (!assignmentId) return;
    try {
      const inserted = await withRetry(() => recordAnswers.mutateAsync(
        finalAnswers.map((a) => ({
          assignmentId,
          questionId: a.questionId,
          selectedTag: a.selectedTag,
          diagnosis: a.diagnosis,
        })),
      ));
      const idMap = { ...answerIdByQuestionRef.current };
      for (const row of inserted ?? []) idMap[row.questionId] = row.id;
      answerIdByQuestionRef.current = idMap;

      const followupPayload = followupResults
        .map((r) => (idMap[r.questionId] != null
          ? toFollowupPayload(idMap[r.questionId], r)
          : null))
        .filter(Boolean);
      if (followupPayload.length > 0) {
        await withRetry(() => recordFollowups.mutateAsync(followupPayload));
      }
    } catch (err) {
      console.error('[persist] flushAll failed', err);
      setSaveError(true);
    }
  }, [assignmentId, recordAnswers, recordFollowups]);

  return { saveAnswer, saveFollowup, flushAll, saveError, resetPersistence };
}
