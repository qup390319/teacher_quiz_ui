import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useStudentMode } from '../../hooks/useStudentMode';
import { useQuiz } from '../../hooks/useQuizzes';
import { useQuizPersistence } from '../../hooks/useQuizPersistence';
import { WoodIconButton } from '../../components/ui/woodKit';
import WoodenProgressBar from '../../components/student/WoodenProgressBar';
import { Bubble, ThinkingBubble } from '../../components/student/ChatStream';
import LeaveConfirmModal from '../../components/student/LeaveConfirmModal';
import AIFollowUpPanel from './followUp/AIFollowUpPanel';
import {
  processStudentReply,
  FOLLOWUP_MAX_ROUNDS,
} from './followUp/followUpEngine';
import { BottomPanel, OptionsPanel, ReasonOptionsPanel, DonePanel } from './studentQuizPanels';
import { INTRO_MESSAGES, sortQuestionsByNodeOrder } from './studentQuizConfig';
import { resolveNextQuestion } from './adaptiveNav';
import { useQuizCompletion } from './useQuizCompletion';
import { useAskFollowUpRound1 } from './useAskFollowUpRound1';
import { useFollowUpFinalizer } from './useFollowUpFinalizer';
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
  // 施測中動態選題：實際問過的題目（依作答順序）。第一層由後端適性引擎逐題決定；
  // 追問階段與進度、報告皆以此序列為準（非題組原始清單）。
  const askedRef = useRef([]);
  const [asked, setAsked] = useState([]);
  const setAskedQuestions = useCallback((next) => {
    askedRef.current = next;
    setAsked(next);
  }, []);

  // 題組全部題目（動態選題的候選池；以 id 對應出下一題物件）
  const questionPool = useMemo(
    () => sortQuestionsByNodeOrder(currentQuiz?.questions ?? []),
    [currentQuiz],
  );
  // 進度分母的名目上限（動態選題實際問的題數可能更少）
  const maxQuestions = questionPool.length;

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
    if (quizError || !currentQuiz || questionPool.length === 0) {
      // 重做模式找不到該題 → 回報告（保留原報告）；一般模式回首頁。
      navigate(isRetryMode ? '/student/report' : '/student', { replace: true });
      return;
    }
    answersRef.current = [];
    followUpResultsRef.current = [];
    // asked 狀態初始即為 []（元件依 quizId 重新掛載）；此處僅需同步清空 ref。
    askedRef.current = [];
    resetPersistence();
    setCurrentQuizId(quizId);
    // 重做模式必須保留現有報告（待結束後併入該題新結果）；一般模式才清空重來。
    if (!isRetryMode) setActiveStudentReport(null);
  }, [
    quizId, currentQuiz, questionPool.length, navigate, isRetryMode,
    quizLoading, quizError, setCurrentQuizId, setActiveStudentReport,
    resetPersistence,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const { finishQuiz, finishRetry } = useQuizCompletion({
    quizId, currentQuiz, retryQuestionId, followUpResultsRef,
    flushAll, addToHistory, mergeRetryIntoReport, navigate,
    setIsThinking, setMessages, setPhase,
  });

  /* ── 第二層：AI 追問（qIdx 為 askedRef 序列索引）──────────── */
  const askFollowUpRound1 = useAskFollowUpRound1({
    askedRef, answersRef, finishQuiz,
    setFollowUpCtx, setFollowUpEnabled, setIsThinking,
    setFollowUpInput, setFollowUpChips, setMessages,
  });

  const startFollowUpPhase = useCallback((finalAnswers) => {
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
  }, [finishQuiz, askFollowUpRound1, setPhase, setFollowUpIndex, setMessages]);

  /* ── 第一層：逐題出題（qIdx 為「已問題目序列」askedRef 的索引）───── */
  const showNextQuestion = useCallback((qIdx) => {
    const q = askedRef.current[qIdx];
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
          // 對話進行中不向學生提及知識節點名稱（節點名稱可能是完整課綱描述句）；
          // 動態選題下總題數未定，只顯示序號不顯示分母。
          text: isRetryMode
            ? '好的，我們再一起看一次這一題～'
            : `接下來我們來看看第 ${qIdx + 1} 題`,
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
  }, [isRetryMode]);

  /* 動態選題：問後端拿下一題,推入 asked 序列並顯示;done 則進追問階段。 */
  const serveNextQuestion = useCallback(async () => {
    let result;
    try {
      result = await resolveNextQuestion(quizId, askedRef.current, answersRef.current, questionPool);
    } catch (err) {
      console.error('[StudentQuiz] resolveNextQuestion failed', err);
      // 後端不可用時的降級：直接進入追問階段（已問過的題目仍完整診斷）
      startFollowUpPhase(askedRef.current);
      return;
    }
    if (result.done || !result.question) {
      startFollowUpPhase(askedRef.current);
      return;
    }
    const nextAsked = [...askedRef.current, result.question];
    setAskedQuestions(nextAsked);
    const idx = nextAsked.length - 1;
    setCurrentQIndex(idx);
    showNextQuestion(idx);
  }, [quizId, questionPool, setAskedQuestions, showNextQuestion, startFollowUpPhase]);

  // 進入第一層：重做模式用固定單題；一般模式向後端適性引擎要第一題。
  const startQuestionPhase = useCallback(() => {
    setPhase('question');
    if (isRetryMode) {
      setAskedQuestions(questionPool);
      setCurrentQIndex(0);
      showNextQuestion(0);
    } else {
      serveNextQuestion();
    }
  }, [isRetryMode, questionPool, setAskedQuestions, showNextQuestion, serveNextQuestion]);

  useEffect(() => {
    if (phase !== 'intro') return;
    // 重做模式：跳過冗長開場，直接進這一題。
    if (isRetryMode) {
      const t = setTimeout(startQuestionPhase, 400);
      return () => clearTimeout(t);
    }
    if (introIdx >= INTRO_MESSAGES.length) {
      const timer = setTimeout(startQuestionPhase, 500);
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
  }, [phase, introIdx, startQuestionPhase, isRetryMode]);

  const handleFollowUpFinal = useFollowUpFinalizer({
    followUpIndex, isRetryMode, askedRef, answersRef, followUpResultsRef, saveFollowup,
    finishQuiz, finishRetry, askFollowUpRound1, setFollowUpIndex, setIsThinking, setFollowUpEnabled,
  });

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
    // 重做模式：只有單題,答完直接進追問；一般模式:交由後端適性引擎決定下一題。
    if (isRetryMode) {
      startFollowUpPhase(updatedAnswers);
    } else {
      serveNextQuestion();
    }
  };

  const handleSelectOption = (opt) => {
    if (!optionsEnabled) return;
    const q = askedRef.current[currentQIndex];
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
    const q = askedRef.current[currentQIndex];
    setMessages((prev) => [
      ...prev,
      { id: `reason-${q.id}`, role: 'student', text: reasonOpt.content },
    ]);
    const updatedAnswers = commitAnswer(q, pendingAnswer.tag, reasonOpt.tag);
    setPendingAnswer(null);
    setAnswerStage('answer');
    advanceAfterAnswer(updatedAnswers);
  };

  const currentQ = phase === 'question' ? asked[currentQIndex] : null;
  const followUpQuestion = phase === 'followUp' ? asked[followUpIndex] : null;
  const followUpSelectedOption = followUpCtx?.selectedOption ?? null;

  const isQuestionPhase = phase === 'question';
  const isFollowUpPhase = phase === 'followUp';

  /* 進度條 0~100：分兩段顯示（第一階段 0~50%、第二階段 50~100%）
   * 「當前題」算成進行到一半（+0.5），避免在最後一題對話尚未結束時就顯示 100%；
   * 唯有 phase === 'done' 才會真正到 100%。
   * 第一階段動態選題總題數未定,分母用名目上限 maxQuestions；第二階段題數已定,用 asked.length。 */
  const progress = isQuestionPhase
    ? Math.round(((currentQIndex + 0.5) / Math.max(maxQuestions, 1)) * 50)
    : isFollowUpPhase
      ? 50 + Math.round(((followUpIndex + 0.5) / Math.max(asked.length, 1)) * 50)
      : phase === 'done' ? 100 : 0;

  const stepInfo = isRetryMode
    ? (isQuestionPhase ? '重新作答這一題' : isFollowUpPhase ? '重新聊聊這一題' : phase === 'done' ? '整理結果中⋯' : null)
    : isQuestionPhase
      ? `第一階段・第 ${currentQIndex + 1} 題`
      : isFollowUpPhase
        ? `第二階段・想法探索 ${followUpIndex + 1}/${asked.length}`
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

