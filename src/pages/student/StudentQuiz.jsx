import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useQuiz } from '../../hooks/useQuizzes';
import { useRecordAnswers, useRecordFollowups } from '../../hooks/useAnswers';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { WoodIconButton } from '../../components/ui/woodKit';
import WoodenProgressBar from '../../components/student/WoodenProgressBar';
import { Bubble, ThinkingBubble } from '../../components/student/ChatStream';
import AIFollowUpPanel from './followUp/AIFollowUpPanel';
import { buildRound1Message, processStudentReply } from './followUp/followUpEngine';
import { BottomPanel, OptionsPanel, DonePanel } from './studentQuizPanels';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

const nodeOrder = Object.fromEntries(knowledgeNodes.map((n, i) => [n.id, i]));
const INTRO_MESSAGES = [
  { id: 'intro-1', text: '你好！我是「科學偵探」' },
  { id: 'intro-2', text: '今天我們要一起探索關於「水溶液」的科學思維。整個過程有兩個階段：先回答情境選擇題，然後我會跟你聊聊你的想法。' },
  { id: 'intro-3', text: '沒有對錯評分，我只是想更深入了解你的思考方式。準備好了嗎？' },
];

const sortQuestionsByNodeOrder = (questions) =>
  [...questions].sort(
    (a, b) => (nodeOrder[a.knowledgeNodeId] ?? 99) - (nodeOrder[b.knowledgeNodeId] ?? 99)
  );

export default function StudentQuiz() {
  const { quizId } = useParams();
  return <StudentQuizScreen key={quizId} quizId={quizId} />;
}

function StudentQuizScreen({ quizId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const { setCurrentQuizId, setActiveStudentReport, addToHistory } = useApp();
  const { data: currentQuiz, isLoading: quizLoading, error: quizError } = useQuiz(quizId);
  const recordAnswersMut = useRecordAnswers();
  const recordFollowupsMut = useRecordFollowups();
  const bottomRef = useRef(null);
  const answersRef = useRef([]);
  const followUpResultsRef = useRef([]);
  // P4: keep server-returned answer IDs so we can attach followups
  const answerIdByQuestionRef = useRef({});

  const sortedQuestions = useMemo(
    () => sortQuestionsByNodeOrder(currentQuiz?.questions ?? []),
    [currentQuiz]
  );

  /* phase: intro → question → followUp → done */
  const [phase, setPhase] = useState('intro');
  const [messages, setMessages] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const [introIdx, setIntroIdx] = useState(0);

  /* 第二層追問狀態 */
  const [followUpIndex, setFollowUpIndex] = useState(0); // 第幾題的追問
  const [followUpCtx, setFollowUpCtx] = useState(null); // { round, strategy, isCorrect, misconceptionId, knowledgeNodeId }
  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);

  useEffect(() => {
    if (quizLoading) return;
    if (quizError || !currentQuiz || sortedQuestions.length === 0) {
      navigate('/student', { replace: true });
      return;
    }
    answersRef.current = [];
    followUpResultsRef.current = [];
    answerIdByQuestionRef.current = {};
    setCurrentQuizId(quizId);
    setActiveStudentReport(null);
  }, [
    quizId, currentQuiz, sortedQuestions.length, navigate,
    quizLoading, quizError, setCurrentQuizId, setActiveStudentReport,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  /* ── 第一層：逐題出題 ────────────────────────────── */
  const showNextQuestion = useCallback((qIdx) => {
    const q = sortedQuestions[qIdx];
    if (!q) return;
    const node = knowledgeNodes.find((n) => n.id === q.knowledgeNodeId);
    setIsThinking(true);
    setOptionsEnabled(false);

    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `q-${q.id}-node`,
          role: 'ai',
          text: `接下來我們來看看關於「${node?.name || '科學'}」的問題（第 ${qIdx + 1}/${sortedQuestions.length} 題）`,
        },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `q-${q.id}-stem`, role: 'ai', text: q.stem },
        ]);
        setOptionsEnabled(true);
      }, 600);
    }, 1200);
  }, [sortedQuestions]);

  useEffect(() => {
    if (phase !== 'intro') return;
    if (introIdx >= INTRO_MESSAGES.length) {
      const timer = setTimeout(() => {
        setPhase('question');
        showNextQuestion(0);
      }, 500);
      return () => clearTimeout(timer);
    }
    const delay = introIdx === 0 ? 300 : 800;
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { ...INTRO_MESSAGES[introIdx], role: 'ai' },
      ]);
      setIntroIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, introIdx, showNextQuestion]);

  const finishQuiz = async (finalAnswers, leadText) => {
    const record = {
      quizId,
      quizTitle: currentQuiz?.title ?? '科學診斷',
      completedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
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
      { id: `done-2-${Date.now()}`, role: 'ai', text: '讓我把所有對話整理一下，幫你做一份專屬的「學習體檢表」⋯' },
    ]);
    setPhase('done');

    // P4: persist to backend if assignmentId is known
    if (assignmentId) {
      try {
        // Submit all answers in one batch — server returns rows with IDs
        const inserted = await recordAnswersMut.mutateAsync(
          finalAnswers.map((a) => ({
            assignmentId,
            questionId: a.questionId,
            selectedTag: a.selectedTag,
            diagnosis: a.diagnosis,
          })),
        );
        // Build map: questionId → answerId (for followups)
        const idMap = {};
        for (const row of inserted ?? []) idMap[row.questionId] = row.id;
        answerIdByQuestionRef.current = idMap;

        // Submit followups (if any)
        const followupPayload = followUpResultsRef.current
          .map((r) => ({
            studentAnswerId: idMap[r.questionId],
            conversationLog: r.conversationLog,
            finalStatus: r.diagnosis.finalStatus,
            misconceptionCode: r.diagnosis.misconceptionCode ?? null,
            reasoningQuality: r.diagnosis.reasoningQuality,
            statusChange: r.diagnosis.statusChange ?? {},
            aiSummary: r.diagnosis.aiSummary ?? null,
          }))
          .filter((p) => p.studentAnswerId != null);
        if (followupPayload.length > 0) {
          await recordFollowupsMut.mutateAsync(followupPayload);
        }
      } catch (err) {
        console.error('[StudentQuiz] persist failed', err);
        // continue regardless — user-visible failure handled in report page
      }
    }

    addToHistory(record);
    setIsThinking(false);
    setTimeout(() => navigate('/student/report'), 1200);
  };

  /* ── 第二層：AI 追問 ─────────────────────────────── */
  const askFollowUpRound1 = (qIdx) => {
    const q = sortedQuestions[qIdx];
    if (!q) {
      finishQuiz(answersRef.current, '謝謝你！我已經整理好你的診斷結果了。');
      return;
    }
    const answer = answersRef.current.find((a) => a.questionId === q.id);
    const selectedOption = q.options.find((o) => o.tag === answer?.selectedTag);
    const isCorrect = answer?.diagnosis === 'CORRECT';
    const node = knowledgeNodes.find((n) => n.id === q.knowledgeNodeId);

    const ctx = {
      round: 1,
      strategy: null,
      isCorrect,
      misconceptionId: isCorrect ? null : answer?.diagnosis,
      knowledgeNodeId: q.knowledgeNodeId,
      conversationLog: [],
      questionId: q.id,
      selectedOption,
    };
    setFollowUpCtx(ctx);
    setFollowUpEnabled(false);
    setIsThinking(true);
    setFollowUpInput('');

    setTimeout(() => {
      setIsThinking(false);
      const headerText = `接下來想跟你聊聊第 ${qIdx + 1} 題（${node?.name || '科學'}）。`;
      const askText = buildRound1Message(selectedOption, isCorrect);
      setMessages((prev) => [
        ...prev,
        { id: `fu-${q.id}-header`, role: 'ai', text: headerText },
        { id: `fu-${q.id}-r1`, role: 'ai', text: askText },
      ]);
      setFollowUpCtx((c) => c && {
        ...c,
        conversationLog: [{ role: 'ai', content: askText }],
      });
      setFollowUpEnabled(true);
    }, 1100);
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

  const handleFollowUpFinal = (finalDiagnosis, ctxAtFinal, replyForLog) => {
    const updatedLog = [
      ...ctxAtFinal.conversationLog,
      { role: 'student', content: replyForLog },
    ];
    const result = {
      questionId: ctxAtFinal.questionId,
      followUpRounds: ctxAtFinal.round,
      conversationLog: updatedLog,
      diagnosis: finalDiagnosis,
    };
    followUpResultsRef.current = [...followUpResultsRef.current, result];

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
      setMessages((prev) => [
        ...prev,
        {
          id: `fu-${ctxAtFinal.questionId}-summary`,
          role: 'ai',
          text: finalDiagnosis.aiSummary,
        },
      ]);
      if (nextIdx >= sortedQuestions.length) {
        finishQuiz(answersRef.current, '謝謝你陪我聊完所有題目！');
        return;
      }
      setFollowUpIndex(nextIdx);
      setTimeout(() => askFollowUpRound1(nextIdx), 700);
    }, 900);
  };

  const handleFollowUpSend = () => {
    if (!followUpEnabled || !followUpCtx) return;
    const reply = followUpInput.trim();
    if (!reply) return;

    setFollowUpEnabled(false);
    setFollowUpInput('');
    setMessages((prev) => [
      ...prev,
      { id: `fu-${followUpCtx.questionId}-r${followUpCtx.round}-s`, role: 'student', text: reply },
    ]);

    const ctxWithReply = {
      ...followUpCtx,
      conversationLog: [...followUpCtx.conversationLog, { role: 'student', content: reply }],
    };

    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      const result = processStudentReply(ctxWithReply, reply);

      if (result.kind === 'final') {
        handleFollowUpFinal(result.finalDiagnosis, ctxWithReply, reply);
        return;
      }

      const nextRound = ctxWithReply.round + 1;
      const aiMsg = result.aiMessage;
      const updatedCtx = {
        ...ctxWithReply,
        round: nextRound,
        strategy: result.strategy ?? ctxWithReply.strategy,
        conversationLog: [...ctxWithReply.conversationLog, { role: 'ai', content: aiMsg }],
      };
      setFollowUpCtx(updatedCtx);
      setMessages((prev) => [
        ...prev,
        { id: `fu-${ctxWithReply.questionId}-r${nextRound}`, role: 'ai', text: aiMsg },
      ]);
      setFollowUpEnabled(true);
    }, 900);
  };

  /* ── 第一層選項處理 ───────────────────────────────── */
  const handleSelectOption = (opt) => {
    if (!optionsEnabled) return;
    setOptionsEnabled(false);
    const q = sortedQuestions[currentQIndex];
    const nextAnswer = { questionId: q.id, selectedTag: opt.tag, diagnosis: opt.diagnosis };
    const updatedAnswers = [
      ...answersRef.current.filter((a) => a.questionId !== q.id),
      nextAnswer,
    ];
    answersRef.current = updatedAnswers;
    // P4: no longer call recordAnswer here — answers are POSTed in batch at finishQuiz

    setMessages((prev) => [
      ...prev,
      { id: `ans-${q.id}`, role: 'student', text: opt.content },
    ]);

    const nextIdx = currentQIndex + 1;
    if (nextIdx >= sortedQuestions.length) {
      startFollowUpPhase(updatedAnswers);
    } else {
      setCurrentQIndex(nextIdx);
      showNextQuestion(nextIdx);
    }
  };

  const currentQ = phase === 'question' ? sortedQuestions[currentQIndex] : null;
  const followUpQuestion = phase === 'followUp' ? sortedQuestions[followUpIndex] : null;
  const followUpSelectedOption = followUpCtx?.selectedOption ?? null;

  const isQuestionPhase = phase === 'question';
  const isFollowUpPhase = phase === 'followUp';

  /* 進度條 0~100：分兩段顯示（第一階段 0~50%、第二階段 50~100%） */
  const progress = isQuestionPhase
    ? Math.round(((currentQIndex + 1) / sortedQuestions.length) * 50)
    : isFollowUpPhase
      ? 50 + Math.round(((followUpIndex + 1) / sortedQuestions.length) * 50)
      : phase === 'done' ? 100 : 0;

  const stepInfo = isQuestionPhase
    ? `第一階段・第 ${currentQIndex + 1}/${sortedQuestions.length} 題`
    : isFollowUpPhase
      ? `第二階段・想法探索 ${followUpIndex + 1}/${sortedQuestions.length}`
      : phase === 'done' ? '整理結果中⋯' : null;

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* HUD：返回 + 進度條 */}
      <header className="relative z-10 flex items-center gap-3 px-3 sm:px-5 pt-3 sm:pt-4 pb-3 animate-fade-up">
        <WoodIconButton
          icon="arrow_back"
          ariaLabel="返回"
          size="sm"
          onClick={() => navigate('/student')}
        />
        <WoodenProgressBar progress={progress} stepInfo={stepInfo} />
      </header>

      {/* 標題列 */}
      <div className="relative z-10 px-3 sm:px-5 pb-2 animate-fade-up">
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
      <main className="relative z-10 flex-1 flex flex-col px-3 sm:px-5">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-3 pb-4 overflow-y-auto">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} text={m.text} />
          ))}
          {isThinking && <ThinkingBubble />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* 底部 panel */}
      <BottomPanel>
        {isQuestionPhase && optionsEnabled && currentQ && (
          <OptionsPanel options={currentQ.options} onSelect={handleSelectOption} />
        )}
        {isFollowUpPhase && followUpCtx && followUpQuestion && (
          <AIFollowUpPanel
            inputValue={followUpInput}
            onChange={setFollowUpInput}
            onSend={handleFollowUpSend}
            disabled={!followUpEnabled}
            round={followUpCtx.round}
            totalRounds={3}
            questionRecap={{
              stem: followUpQuestion.stem,
              selectedContent: followUpSelectedOption?.content ?? '',
            }}
          />
        )}
        {phase === 'done' && <DonePanel />}
      </BottomPanel>
    </div>
  );
}

