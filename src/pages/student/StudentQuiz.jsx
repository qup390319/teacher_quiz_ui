import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useStudentMode } from '../../hooks/useStudentMode';
import { useQuiz } from '../../hooks/useQuizzes';
import { useQuizPersistence } from '../../hooks/useQuizPersistence';
import { knowledgeNodes, getMisconceptionById } from '../../data/knowledgeGraph';
import { api } from '../../lib/api';
import { WoodIconButton } from '../../components/ui/woodKit';
import WoodenProgressBar from '../../components/student/WoodenProgressBar';
import { Bubble, ThinkingBubble } from '../../components/student/ChatStream';
import LeaveConfirmModal from '../../components/student/LeaveConfirmModal';
import AIFollowUpPanel from './followUp/AIFollowUpPanel';
import {
  buildRound1Message,
  processStudentReply,
  FOLLOWUP_MAX_ROUNDS,
} from './followUp/followUpEngine';
import { BottomPanel, OptionsPanel, ReasonOptionsPanel, DonePanel } from './studentQuizPanels';
import { INTRO_MESSAGES, sortQuestionsByNodeOrder } from './studentQuizConfig';
import {
  getQuestionMode, getAnswerOptions, getReasonOptions, diagnoseQuestion,
} from '../../data/twoTier';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

export default function StudentQuiz() {
  const { quizId } = useParams();
  return <StudentQuizScreen key={quizId} quizId={quizId} />;
}

function StudentQuizScreen({ quizId }) {
  useStudentMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  // 誤判補救單題重做模式：?retry=questionId。只跑該題、跳過開場，結束時把新結果併回報告。
  const retryParam = searchParams.get('retry');
  const retryQuestionId = retryParam != null ? Number(retryParam) : null;
  const isRetryMode = Number.isFinite(retryQuestionId);
  const { setCurrentQuizId, setActiveStudentReport, addToHistory, mergeRetryIntoReport } = useApp();
  const { data: currentQuiz, isLoading: quizLoading, error: quizError } = useQuiz(quizId);
  const { saveAnswer, saveFollowup, flushAll, saveError, resetPersistence } =
    useQuizPersistence(assignmentId);
  const bottomRef = useRef(null);
  const answersRef = useRef([]);
  const followUpResultsRef = useRef([]);

  const sortedQuestions = useMemo(() => {
    const all = sortQuestionsByNodeOrder(currentQuiz?.questions ?? []);
    return isRetryMode ? all.filter((q) => q.id === retryQuestionId) : all;
  }, [currentQuiz, isRetryMode, retryQuestionId]);

  /* phase: intro → question → followUp → done */
  const [phase, setPhase] = useState('intro');
  const [messages, setMessages] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const [introIdx, setIntroIdx] = useState(0);

  /* two-tier 第一層內的子階段：'answer'（選答案）→ 'reason'（選理由）。single 題恆為 'answer'。 */
  const [answerStage, setAnswerStage] = useState('answer');
  const [pendingAnswer, setPendingAnswer] = useState(null); // { tag, content } | null

  /* 第二層追問狀態 */
  const [followUpIndex, setFollowUpIndex] = useState(0); // 第幾題的追問
  const [followUpCtx, setFollowUpCtx] = useState(null); // { round, phase, strategy, isCorrect, misconceptionId, knowledgeNodeId, questionStem, ... }
  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpChips, setFollowUpChips] = useState(null); // string[] | null，由 LLM 提供

  /* 中途離開確認（測驗進行中按返回時提醒，避免誤觸丟失對話；done 直接離開） */
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (quizLoading) return;
    if (quizError || !currentQuiz || sortedQuestions.length === 0) {
      // 重做模式找不到該題 → 回報告（保留原報告）；一般模式回首頁。
      navigate(isRetryMode ? '/student/report' : '/student', { replace: true });
      return;
    }
    answersRef.current = [];
    followUpResultsRef.current = [];
    resetPersistence();
    setCurrentQuizId(quizId);
    // 重做模式必須保留現有報告（待結束後併入該題新結果）；一般模式才清空重來。
    if (!isRetryMode) setActiveStudentReport(null);
  }, [
    quizId, currentQuiz, sortedQuestions.length, navigate, isRetryMode,
    quizLoading, quizError, setCurrentQuizId, setActiveStudentReport,
    resetPersistence,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  /* ── 第一層：逐題出題 ────────────────────────────── */
  const showNextQuestion = useCallback((qIdx) => {
    const q = sortedQuestions[qIdx];
    if (!q) return;
    setIsThinking(true);
    setOptionsEnabled(false);
    setAnswerStage('answer');
    setPendingAnswer(null);

    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `q-${q.id}-node`,
          role: 'ai',
          // 對話進行中不向學生提及知識節點名稱（節點名稱可能是完整課綱描述句）
          text: isRetryMode
            ? '好的，我們再一起看一次這一題～'
            : `接下來我們來看看第 ${qIdx + 1}/${sortedQuestions.length} 題`,
        },
      ]);
      setTimeout(() => {
        setIsThinking(true);
        setTimeout(() => {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            { id: `q-${q.id}-stem`, role: 'ai', text: q.stem, variant: 'question' },
          ]);
          setOptionsEnabled(true);
        }, 1400);
      }, 1200);
    }, 1800);
  }, [sortedQuestions, isRetryMode]);

  useEffect(() => {
    if (phase !== 'intro') return;
    // 重做模式：跳過冗長開場，直接進這一題。
    if (isRetryMode) {
      const t = setTimeout(() => { setPhase('question'); showNextQuestion(0); }, 400);
      return () => clearTimeout(t);
    }
    if (introIdx >= INTRO_MESSAGES.length) {
      const timer = setTimeout(() => {
        setPhase('question');
        showNextQuestion(0);
      }, 500);
      return () => clearTimeout(timer);
    }
    const delay = introIdx === 0 ? 600 : 1500;
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { ...INTRO_MESSAGES[introIdx], role: 'ai' },
      ]);
      setIntroIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, introIdx, showNextQuestion, isRetryMode]);

  const finishQuiz = async (finalAnswers, leadText) => {
    const record = {
      quizId,
      quizTitle: currentQuiz?.title ?? '科學診斷',
      completedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      totalQuestions: sortedQuestions.length,
      correctCount: finalAnswers.filter((a) => a.diagnosis === 'CORRECT').length,
      misconceptions: [
        ...new Set(
          finalAnswers.filter((a) => a.diagnosis !== 'CORRECT').map((a) => a.diagnosis)
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
    // 即時存檔已在選項 / 追問結束時逐筆寫入，見 useQuizPersistence。
    await flushAll(finalAnswers, followUpResultsRef.current);

    addToHistory(record);
    setIsThinking(false);
    setTimeout(() => navigate('/student/report'), 1200);
  };

  /* 單題重做收尾：把這一題的新作答＋追問結果併回現有報告（不建立新報告），回報告頁。 */
  const finishRetry = async (finalAnswers) => {
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
  };

  /* ── 第二層：AI 追問 ─────────────────────────────── */
  const askFollowUpRound1 = (qIdx) => {
    const q = sortedQuestions[qIdx];
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
  };

  const startFollowUpPhase = (finalAnswers) => {
    if (finalAnswers.length === 0) {
      finishQuiz(finalAnswers, '謝謝你的回答！我已經整理好你的診斷結果了。');
      return;
    }
    setPhase('followUp');
    setFollowUpIndex(0);
    setMessages((prev) => [
      ...prev,
      {
        id: `fu-start-${Date.now()}`,
        role: 'ai',
        text: '選擇題的部分結束了！接下來想跟你聊聊剛才的幾道題，了解你更多的想法。',
      },
    ]);
    askFollowUpRound1(0);
  };

  const handleFollowUpFinal = async (finalDiagnosis, ctxAtFinal) => {
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
        a.questionId === ctxAtFinal.questionId ? { ...a, diagnosis: 'CORRECT' } : a
      );
    } else if (change === 'DOWNGRADED' && finalDiagnosis.misconceptionCode) {
      answersRef.current = answersRef.current.map((a) =>
        a.questionId === ctxAtFinal.questionId
          ? { ...a, diagnosis: finalDiagnosis.misconceptionCode }
          : a
      );
    }

    /* 進下一題或結束 */
    const nextIdx = followUpIndex + 1;
    setIsThinking(true);
    setFollowUpEnabled(false);
    setTimeout(() => {
      setIsThinking(false);
      if (nextIdx >= sortedQuestions.length) {
        setTimeout(() => (isRetryMode
          ? finishRetry(answersRef.current)
          : finishQuiz(answersRef.current, '謝謝你陪我聊完所有題目！')), 1500);
        return;
      }
      setFollowUpIndex(nextIdx);
      setTimeout(() => askFollowUpRound1(nextIdx), 1500);
    }, 1500);
  };

  const handleFollowUpSend = async (overrideText) => {
    if (!followUpEnabled || !followUpCtx) return;
    const reply = (typeof overrideText === 'string' ? overrideText : followUpInput).trim();
    if (!reply) return;
    setFollowUpEnabled(false);
    setFollowUpInput('');
    setFollowUpChips(null);
    setMessages((prev) => [...prev,
      { id: `fu-${followUpCtx.questionId}-r${followUpCtx.round}-s-${Date.now()}`, role: 'student', text: reply }]);
    const ctxWithReply = { ...followUpCtx,
      conversationLog: [...followUpCtx.conversationLog, { role: 'student', content: reply }] };
    setIsThinking(true);
    const startedAt = Date.now();
    let result;
    try { result = await processStudentReply(ctxWithReply, reply); }
    catch (err) {
      console.error('[StudentQuiz] processStudentReply failed', err);
      setIsThinking(false);
      setMessages((prev) => [...prev, { id: `fu-err-${Date.now()}`, role: 'ai', text: '我這邊有點當機，可以再說一次你的想法嗎？' }]);
      setFollowUpEnabled(true);
      return;
    }
    const MIN_THINK_MS = 1500;
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_THINK_MS) {
      await new Promise((r) => setTimeout(r, MIN_THINK_MS - elapsed));
    }
    setIsThinking(false);
    if (result.kind === 'final') { handleFollowUpFinal(result.finalDiagnosis, ctxWithReply); return; }
    // LLM 帶 round/phase；rule-based 帶 keepRound/strategy
    const nextRound = typeof result.round === 'number'
      ? result.round
      : (result.keepRound ? ctxWithReply.round : ctxWithReply.round + 1);
    setFollowUpCtx({ ...ctxWithReply, round: nextRound,
      phase: result.phase ?? ctxWithReply.phase,
      strategy: result.strategy ?? ctxWithReply.strategy,
      conversationLog: [...ctxWithReply.conversationLog, { role: 'ai', content: result.aiMessage }] });
    setFollowUpChips(Array.isArray(result.chips) && result.chips.length >= 2 ? result.chips : null);
    setMessages((prev) => [...prev,
      { id: `fu-${ctxWithReply.questionId}-r${nextRound}-${Date.now()}`, role: 'ai', text: result.aiMessage }]);
    setFollowUpEnabled(true);
  };

  /* ── 第一層選項處理 ───────────────────────────────── */
  // 判定 + 記錄 + 即時存檔，回傳更新後的 answers。two-tier 傳 reasonTag，single 傳 null。
  const commitAnswer = (q, answerTag, reasonTag) => {
    const { quadrant, diagnosis } = diagnoseQuestion(q, answerTag, reasonTag);
    const nextAnswer = {
      questionId: q.id,
      selectedTag: answerTag,
      reasonTag: reasonTag ?? null,
      diagnosis,
      quadrant,
    };
    const updatedAnswers = [
      ...answersRef.current.filter((a) => a.questionId !== q.id),
      nextAnswer,
    ];
    answersRef.current = updatedAnswers;
    // 即時存檔：一判定就背景 upsert 該題（不阻塞 UI；失敗會在 saveError 顯示）
    saveAnswer(nextAnswer);
    return updatedAnswers;
  };

  const advanceAfterAnswer = (updatedAnswers) => {
    const nextIdx = currentQIndex + 1;
    if (nextIdx >= sortedQuestions.length) {
      startFollowUpPhase(updatedAnswers);
    } else {
      setCurrentQIndex(nextIdx);
      showNextQuestion(nextIdx);
    }
  };

  const handleSelectOption = (opt) => {
    if (!optionsEnabled) return;
    const q = sortedQuestions[currentQIndex];
    setMessages((prev) => [
      ...prev,
      { id: `ans-${q.id}`, role: 'student', text: opt.content },
    ]);

    // two-tier：選完答案先進「選理由」子階段，尚未判定
    if (getQuestionMode(q) === 'two-tier') {
      setPendingAnswer({ tag: opt.tag, content: opt.content });
      setAnswerStage('reason');
      return;
    }

    // single：直接判定並前進
    setOptionsEnabled(false);
    advanceAfterAnswer(commitAnswer(q, opt.tag, null));
  };

  // two-tier 第二層：選完理由 → 判定四象限 → 前進
  const handleSelectReason = (reasonOpt) => {
    if (!optionsEnabled || !pendingAnswer) return;
    setOptionsEnabled(false);
    const q = sortedQuestions[currentQIndex];
    setMessages((prev) => [
      ...prev,
      { id: `reason-${q.id}`, role: 'student', text: reasonOpt.content },
    ]);
    const updatedAnswers = commitAnswer(q, pendingAnswer.tag, reasonOpt.tag);
    setPendingAnswer(null);
    setAnswerStage('answer');
    advanceAfterAnswer(updatedAnswers);
  };

  const currentQ = phase === 'question' ? sortedQuestions[currentQIndex] : null;
  const followUpQuestion = phase === 'followUp' ? sortedQuestions[followUpIndex] : null;
  const followUpSelectedOption = followUpCtx?.selectedOption ?? null;

  const isQuestionPhase = phase === 'question';
  const isFollowUpPhase = phase === 'followUp';

  /* 進度條 0~100：分兩段顯示（第一階段 0~50%、第二階段 50~100%）
   * 「當前題」算成進行到一半（+0.5），避免在最後一題對話尚未結束時就顯示 100%；
   * 唯有 phase === 'done' 才會真正到 100%。 */
  const progress = isQuestionPhase
    ? Math.round(((currentQIndex + 0.5) / sortedQuestions.length) * 50)
    : isFollowUpPhase
      ? 50 + Math.round(((followUpIndex + 0.5) / sortedQuestions.length) * 50)
      : phase === 'done' ? 100 : 0;

  const stepInfo = isRetryMode
    ? (isQuestionPhase ? '重新作答這一題' : isFollowUpPhase ? '重新聊聊這一題' : phase === 'done' ? '整理結果中⋯' : null)
    : isQuestionPhase
      ? `第一階段・第 ${currentQIndex + 1}/${sortedQuestions.length} 題`
      : isFollowUpPhase
        ? `第二階段・想法探索 ${followUpIndex + 1}/${sortedQuestions.length}`
        : phase === 'done' ? '整理結果中⋯' : null;

  return (
    <div
      className="relative h-[100dvh] flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* 存檔異常警示：給監考老師看，提示該名學生資料可能未存進伺服器 */}
      {saveError && (
        <div
          role="alert"
          className="relative z-20 flex items-center justify-center gap-2 px-4 py-2
                     bg-amber-500 text-white text-sm font-bold shadow-md"
        >
          <span className="material-symbols-rounded text-base">warning</span>
          資料儲存遇到問題，請舉手告知老師（請勿關閉此頁面）
        </div>
      )}

      {/* HUD：返回 + 進度條 */}
      <header className="relative z-10 shrink-0 flex items-center gap-3 px-3 sm:px-5 pt-3 sm:pt-4 pb-3 animate-fade-up">
        <WoodIconButton
          icon="arrow_back"
          ariaLabel="返回"
          size="sm"
          onClick={() => (phase === 'done' ? navigate('/student') : setShowLeaveConfirm(true))}
        />
        <WoodenProgressBar progress={progress} stepInfo={stepInfo} />
      </header>

      {/* 標題列 */}
      <div className="relative z-10 shrink-0 px-3 sm:px-5 pb-2 animate-fade-up">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <img
            src={mascotImg}
            alt="吉祥物"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain animate-breath
                       drop-shadow-[0_3px_3px_rgba(91,66,38,0.3)]"
          />
          <div className="leading-tight">
            <p className="font-game text-sm sm:text-base font-black text-[#5A3E22]
                          drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
              {currentQuiz?.title ?? '科學偵探'}
            </p>
            <p className="text-xs text-[#7A5232] font-bold drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
              {isFollowUpPhase ? '想法探索' : '迷思診斷'}
            </p>
          </div>
        </div>
      </div>

      {/* 對話氣泡列表 */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col px-3 sm:px-5">
        <div className="max-w-3xl mx-auto w-full flex-1 min-h-0 flex flex-col gap-3 pb-4 overflow-y-auto">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} text={m.text} variant={m.variant} />
          ))}
          {isThinking && <ThinkingBubble />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* 底部 panel */}
      <BottomPanel>
        {isQuestionPhase && optionsEnabled && currentQ && answerStage === 'answer' && (
          <OptionsPanel options={getAnswerOptions(currentQ)} onSelect={handleSelectOption} />
        )}
        {isQuestionPhase && currentQ && answerStage === 'reason' && pendingAnswer && (
          <ReasonOptionsPanel
            options={getReasonOptions(currentQ)}
            answerContent={pendingAnswer.content}
            onSelect={handleSelectReason}
          />
        )}
        {isFollowUpPhase && followUpCtx && followUpQuestion && (
          <AIFollowUpPanel
            inputValue={followUpInput}
            onChange={setFollowUpInput}
            onSend={() => handleFollowUpSend()}
            onSendText={(text) => handleFollowUpSend(text)}
            disabled={!followUpEnabled}
            round={followUpCtx.round}
            totalRounds={FOLLOWUP_MAX_ROUNDS}
            chips={followUpChips}
            questionRecap={{
              stem: followUpQuestion.stem,
              selectedContent: followUpSelectedOption?.content ?? '',
            }}
          />
        )}
        {phase === 'done' && <DonePanel />}
      </BottomPanel>

      {/* 中途離開確認（測驗進行中按返回時提醒；spec-07 木框風，見 LeaveConfirmModal） */}
      {showLeaveConfirm && (
        <LeaveConfirmModal
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => { setShowLeaveConfirm(false); navigate('/student'); }}
        />
      )}
    </div>
  );
}

