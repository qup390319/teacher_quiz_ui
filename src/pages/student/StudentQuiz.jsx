import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getQuizQuestions } from '../../data/quizData';
import { getMisconceptionById, knowledgeNodes } from '../../data/knowledgeGraph';
import {
  Icon,
  WOOD_OUTER,
  WOOD_INNER_CREAM,
  WoodIconButton,
} from '../../components/ui/woodKit';
import WoodenProgressBar from '../../components/student/WoodenProgressBar';
import { Bubble, ThinkingBubble } from '../../components/student/ChatStream';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

const nodeOrder = Object.fromEntries(knowledgeNodes.map((n, i) => [n.id, i]));
const INTRO_MESSAGES = [
  { id: 'intro-1', text: '你好！我是「科學偵探」，今天我們要一起探索關於「水溶液」的科學思維。' },
  { id: 'intro-2', text: '沒有對錯評分，只是想了解你目前的想法。請輕鬆選出你覺得最合理的答案！' },
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
  const {
    quizzes,
    recordAnswer,
    removeMisconception,
    resetStudentAnswers,
    addToHistory,
    setCurrentQuizId,
    setActiveStudentReport,
  } = useApp();
  const bottomRef = useRef(null);
  const answersRef = useRef([]);

  const currentQuiz = quizzes.find((quiz) => quiz.id === quizId) ?? null;
  const sortedQuestions = useMemo(
    () => sortQuestionsByNodeOrder(getQuizQuestions(quizId)),
    [quizId]
  );

  const [phase, setPhase] = useState('intro');
  const [messages, setMessages] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const [confirmActionsEnabled, setConfirmActionsEnabled] = useState(false);
  const [introIdx, setIntroIdx] = useState(0);
  const [pendingMisconceptions, setPendingMisconceptions] = useState([]);
  const [currentConfirmIndex, setCurrentConfirmIndex] = useState(0);

  useEffect(() => {
    if (!currentQuiz || sortedQuestions.length === 0) {
      navigate('/student', { replace: true });
      return;
    }
    answersRef.current = [];
    resetStudentAnswers();
    setCurrentQuizId(quizId);
    setActiveStudentReport(null);
  }, [
    quizId, currentQuiz, sortedQuestions.length, navigate,
    resetStudentAnswers, setCurrentQuizId, setActiveStudentReport,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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

  const finishQuiz = (finalAnswers, leadText) => {
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
    };

    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        { id: `done-1-${Date.now()}`, role: 'ai', text: leadText },
        { id: `done-2-${Date.now()}`, role: 'ai', text: '讓我整理一份專屬於你的「學習體檢表」...' },
      ]);
      setPhase('done');
      addToHistory(record);
      setTimeout(() => navigate('/student/report'), 1800);
    }, 1200);
  };

  const askConfirmationQuestion = (misconceptionIds, index) => {
    const currentMisconceptionId = misconceptionIds[index];
    const misconception = getMisconceptionById(currentMisconceptionId);
    if (!misconception) {
      finishQuiz(answersRef.current, '謝謝你的回答！我已經整理好你的診斷結果了。');
      return;
    }

    setCurrentConfirmIndex(index);
    setIsThinking(true);
    setConfirmActionsEnabled(false);

    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-intro-${currentMisconceptionId}`,
          role: 'ai',
          text: '我想再確認一件事，看看我有沒有理解錯你的想法。',
        },
        {
          id: `confirm-question-${currentMisconceptionId}`,
          role: 'ai',
          text: misconception.confirmQuestion,
        },
      ]);
      setConfirmActionsEnabled(true);
    }, 1000);
  };

  const startConfirmation = (finalAnswers) => {
    const misconceptionIds = [
      ...new Set(
        finalAnswers.filter((a) => a.diagnosis !== 'CORRECT').map((a) => a.diagnosis)
      ),
    ];
    if (misconceptionIds.length === 0) {
      finishQuiz(finalAnswers, '謝謝你的回答！我已經了解你目前的科學思維了。');
      return;
    }

    setPhase('confirming');
    setPendingMisconceptions(misconceptionIds);
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-start-${Date.now()}`,
        role: 'ai',
        text: '謝謝你的回答！接下來我想再多確認幾個地方，看看我有沒有理解錯你的想法。',
      },
    ]);
    askConfirmationQuestion(misconceptionIds, 0);
  };

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
    recordAnswer(q.id, opt.tag, opt.diagnosis);

    setMessages((prev) => [
      ...prev,
      { id: `ans-${q.id}`, role: 'student', text: opt.content },
    ]);

    const nextIdx = currentQIndex + 1;
    if (nextIdx >= sortedQuestions.length) {
      startConfirmation(updatedAnswers);
    } else {
      setCurrentQIndex(nextIdx);
      showNextQuestion(nextIdx);
    }
  };

  const handleConfirmResponse = (isConfirmed) => {
    if (!confirmActionsEnabled) return;
    const misconceptionId = pendingMisconceptions[currentConfirmIndex];
    let updatedAnswers = answersRef.current;

    setConfirmActionsEnabled(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-answer-${misconceptionId}-${currentConfirmIndex}`,
        role: 'student',
        text: isConfirmed ? '對，我是這樣想的。' : '不，我不這樣認為。',
      },
    ]);

    if (!isConfirmed) {
      updatedAnswers = answersRef.current.map((a) =>
        a.diagnosis === misconceptionId ? { ...a, diagnosis: 'CORRECT' } : a
      );
      answersRef.current = updatedAnswers;
      removeMisconception(misconceptionId);
    }

    const nextIndex = currentConfirmIndex + 1;
    if (nextIndex >= pendingMisconceptions.length) {
      finishQuiz(updatedAnswers, '謝謝你再幫我確認一次！我已經整理好你的診斷結果了。');
      return;
    }
    askConfirmationQuestion(pendingMisconceptions, nextIndex);
  };

  const currentQ = phase === 'question' ? sortedQuestions[currentQIndex] : null;
  const currentConfirmationId = pendingMisconceptions[currentConfirmIndex];
  const isQuestionPhase = phase === 'question';
  const isConfirmingPhase = phase === 'confirming';

  /* 進度條 0~100 */
  const progress = isQuestionPhase
    ? Math.round(((currentQIndex + 1) / sortedQuestions.length) * 100)
    : isConfirmingPhase
      ? Math.round(((currentConfirmIndex + 1) / pendingMisconceptions.length) * 100)
      : phase === 'done'
        ? 100
        : 0;

  const stepInfo = isQuestionPhase
    ? `診斷・第 ${currentQIndex + 1}/${sortedQuestions.length} 題`
    : isConfirmingPhase
      ? `確認・${currentConfirmIndex + 1}/${pendingMisconceptions.length}`
      : phase === 'done'
        ? '整理結果中...'
        : null;

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
              迷思診斷
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

      {/* 底部選項區（米紙木框 panel） */}
      <BottomPanel>
        {isQuestionPhase && optionsEnabled && currentQ && (
          <OptionsPanel options={currentQ.options} onSelect={handleSelectOption} />
        )}
        {isConfirmingPhase && confirmActionsEnabled && currentConfirmationId && (
          <ConfirmPanel onConfirm={handleConfirmResponse} />
        )}
        {phase === 'done' && <DonePanel />}
      </BottomPanel>
    </div>
  );
}

/* ── 底部 panel 包裝（米紙 + 木紋邊）─────────────── */
function BottomPanel({ children }) {
  if (!children) return null;
  return (
    <div className="relative z-10 px-3 sm:px-5 pb-4 sm:pb-6 animate-fade-up">
      <div className="max-w-3xl mx-auto">
        <div className={WOOD_OUTER}>
          <div className={WOOD_INNER_CREAM + ' p-3 sm:p-4'}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ── 4 選 1 選項清單 ───────────────────────────── */
function OptionsPanel({ options, onSelect }) {
  return (
    <>
      <p className="text-xs sm:text-sm text-[#7A5232] mb-2 sm:mb-3 text-center font-bold">
        請選擇你覺得最合理的答案
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <button
            key={opt.tag}
            type="button"
            onClick={() => onSelect(opt)}
            className="text-left flex items-start gap-2 px-4 py-3 rounded-2xl border-2 border-[#C19A6B]
                       bg-white hover:bg-[#FFF1D8] hover:border-[#D08B2E]
                       text-sm leading-relaxed text-[#5A3E22]
                       shadow-[0_2px_0_-1px_#8B5E3C] hover:translate-y-0.5
                       transition-all duration-200"
          >
            <span className="shrink-0 inline-flex w-6 h-6 rounded-full
                             bg-gradient-to-b from-[#F4D58A] to-[#F0B962]
                             border-2 border-[#9B5E18] text-[#7A4A18]
                             font-game font-black text-xs items-center justify-center
                             shadow-[0_2px_0_#9B5E18]">
              {opt.tag}
            </span>
            <span className="flex-1">{opt.content}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── 確認題 2 選 1 ─────────────────────────────── */
function ConfirmPanel({ onConfirm }) {
  return (
    <>
      <p className="text-xs sm:text-sm text-[#7A5232] mb-2 sm:mb-3 text-center font-bold">
        請選擇比較接近你真正想法的回答
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onConfirm(true)}
          className="px-4 py-3 rounded-2xl border-2
                     bg-gradient-to-b from-[#B8DC83] to-[#7DB044] border-[#5C8A2E] text-[#2F4A1A]
                     font-game font-black text-sm
                     shadow-[0_4px_0_#3D5A1A] hover:translate-y-0.5 hover:shadow-[0_2px_0_#3D5A1A]
                     transition-all duration-200"
        >
          對，我是這樣想的
        </button>
        <button
          type="button"
          onClick={() => onConfirm(false)}
          className="px-4 py-3 rounded-2xl border-2
                     bg-gradient-to-b from-[#8AC0D8] to-[#5293B4] border-[#3A7397] text-white
                     font-game font-black text-sm
                     shadow-[0_4px_0_#3A7397] hover:translate-y-0.5 hover:shadow-[0_2px_0_#3A7397]
                     transition-all duration-200"
        >
          不，我不這樣認為
        </button>
      </div>
    </>
  );
}

/* ── 完成畫面 loading ──────────────────────────── */
function DonePanel() {
  return (
    <div className="text-center py-3">
      <p className="text-sm font-bold text-[#5A3E22]">
        正在前往你的學習體檢表...
      </p>
      <div className="mt-2 flex justify-center">
        <Icon
          name="autorenew"
          filled
          className="text-2xl text-[#5C8A2E] animate-spin"
        />
      </div>
    </div>
  );
}
