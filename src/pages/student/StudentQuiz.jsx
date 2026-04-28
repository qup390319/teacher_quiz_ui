import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getQuizQuestions } from '../../data/quizData';
import { getMisconceptionById, knowledgeNodes } from '../../data/knowledgeGraph';

const nodeOrder = Object.fromEntries(knowledgeNodes.map((n, i) => [n.id, i]));
const INTRO_MESSAGES = [
  { id: 'intro-1', text: '你好！我是「科學偵探」系統 🔍', type: 'system' },
  { id: 'intro-2', text: '今天我們要一起探索關於「水溶液」的科學思維。', type: 'system' },
  { id: 'intro-3', text: '沒有對錯評分，只是想了解你目前的想法。請輕鬆選出你覺得最合理的答案！', type: 'system' },
];

const sortQuestionsByNodeOrder = (questions) => (
  [...questions].sort((a, b) => (nodeOrder[a.knowledgeNodeId] ?? 99) - (nodeOrder[b.knowledgeNodeId] ?? 99))
);

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2 mb-4 chat-bubble-in">
      <div className="w-8 h-8 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-sm">🤖</span>
      </div>
      <div className="bg-white border border-[#BDC3C7] rounded-2xl rounded-bl-none px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 bg-[#95A5A6] rounded-full dot-1 inline-block"></span>
          <span className="w-2 h-2 bg-[#95A5A6] rounded-full dot-2 inline-block"></span>
          <span className="w-2 h-2 bg-[#95A5A6] rounded-full dot-3 inline-block"></span>
        </div>
      </div>
    </div>
  );
}

function SystemBubble({ text }) {
  return (
    <div className="flex items-end gap-2 mb-3 chat-bubble-in">
      <div className="w-8 h-8 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-sm">🤖</span>
      </div>
      <div className="bg-white border border-[#BDC3C7] rounded-2xl rounded-bl-none px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-xs sm:max-w-sm">
        <p className="text-sm text-[#2D3436] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function StudentBubble({ text }) {
  return (
    <div className="flex items-end justify-end gap-2 mb-3 chat-bubble-in">
      <div className="bg-[#8FC87A] border border-[#BDC3C7] text-[#2D3436] rounded-2xl rounded-br-none px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-xs sm:max-w-sm">
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
      <div className="w-8 h-8 bg-[#BADDF4] border border-[#BDC3C7] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-sm">👤</span>
      </div>
    </div>
  );
}

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
  }, [quizId, currentQuiz, sortedQuestions.length, navigate, resetStudentAnswers, setCurrentQuizId, setActiveStudentReport]);

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
          text: `接下來我們來看看關於「${node?.name || '熱學'}」的問題（第 ${qIdx + 1}/${sortedQuestions.length} 題）`,
          type: 'system',
        },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `q-${q.id}-stem`, text: q.stem, type: 'system', isQuestion: true },
        ]);
        setOptionsEnabled(true);
      }, 600);
    }, 1200);
  }, [sortedQuestions]);

  useEffect(() => {
    if (phase !== 'intro') return;
    if (introIdx >= INTRO_MESSAGES.length) {
      setTimeout(() => {
        setPhase('question');
        showNextQuestion(0);
      }, 500);
      return;
    }
    const delay = introIdx === 0 ? 300 : 800;
    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, INTRO_MESSAGES[introIdx]]);
      setIntroIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, introIdx, showNextQuestion]);

  const finishQuiz = (finalAnswers, leadText) => {
    const record = {
      quizId,
      quizTitle: currentQuiz?.title ?? '科學診斷',
      completedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      correctCount: finalAnswers.filter((answer) => answer.diagnosis === 'CORRECT').length,
      misconceptions: [...new Set(finalAnswers.filter((answer) => answer.diagnosis !== 'CORRECT').map((answer) => answer.diagnosis))],
      answers: finalAnswers,
    };

    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        { id: `done-1-${Date.now()}`, text: leadText, type: 'system' },
        { id: `done-2-${Date.now()}`, text: '讓我整理一份專屬於你的「學習體檢表」...', type: 'system' },
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
          text: '我想再確認一件事，看看我有沒有理解錯你的想法。',
          type: 'system',
        },
        {
          id: `confirm-question-${currentMisconceptionId}`,
          text: misconception.confirmQuestion,
          type: 'system',
        },
      ]);
      setConfirmActionsEnabled(true);
    }, 1000);
  };

  const startConfirmation = (finalAnswers) => {
    const misconceptionIds = [
      ...new Set(finalAnswers.filter((answer) => answer.diagnosis !== 'CORRECT').map((answer) => answer.diagnosis)),
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
        text: '謝謝你的回答！接下來我想再多確認幾個地方，看看我有沒有理解錯你的想法。',
        type: 'system',
      },
    ]);
    askConfirmationQuestion(misconceptionIds, 0);
  };

  const handleSelectOption = (opt) => {
    if (!optionsEnabled) return;
    setOptionsEnabled(false);
    const q = sortedQuestions[currentQIndex];
    const nextAnswer = { questionId: q.id, selectedTag: opt.tag, diagnosis: opt.diagnosis };
    const updatedAnswers = [...answersRef.current.filter((answer) => answer.questionId !== q.id), nextAnswer];

    answersRef.current = updatedAnswers;
    recordAnswer(q.id, opt.tag, opt.diagnosis);

    setMessages((prev) => [
      ...prev,
      { id: `ans-${q.id}`, text: opt.content, type: 'student' },
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
        text: isConfirmed ? '對，我是這樣想的。' : '不，我不這樣認為。',
        type: 'student',
      },
    ]);

    if (!isConfirmed) {
      updatedAnswers = answersRef.current.map((answer) =>
        answer.diagnosis === misconceptionId
          ? { ...answer, diagnosis: 'CORRECT' }
          : answer
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
  const headerStatusText = isConfirmingPhase ? '迷思想法確認中' : `${currentQuiz?.title ?? '科學診斷'} 進行中`;
  const headerProgress = isQuestionPhase
    ? `${currentQIndex + 1} / ${sortedQuestions.length}`
    : isConfirmingPhase
      ? `${currentConfirmIndex + 1} / ${pendingMisconceptions.length}`
      : null;

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#D5D8DC] px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#BDC3C7] bg-[#EEF5E6] text-[#2D3436] hover:bg-[#D5D8DC] transition-colors"
            aria-label="返回"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-9 h-9 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center">
            <span className="text-base">🤖</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#2D3436]">科學偵探</p>
            <p className="text-xs text-[#5A8A5C] flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 bg-[#8FC87A] rounded-full inline-block"></span>
              {headerStatusText}
            </p>
          </div>
        </div>
        {headerProgress && (
          <div className="text-right">
            <p className="text-xs text-[#95A5A6]">{isConfirmingPhase ? '確認進度' : '進度'}</p>
            <p className="text-sm font-bold text-[#2D3436]">{headerProgress}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {(isQuestionPhase || isConfirmingPhase) && (
        <div className="bg-white border-b border-[#D5D8DC] px-4 py-2.5">
          <div className="w-full bg-[#D5D8DC] rounded-full h-2">
            <div
              className="bg-[#8FC87A] h-2 rounded-full transition-all duration-500"
              style={{
                width: `${isQuestionPhase
                  ? (((currentQIndex + 1) / sortedQuestions.length) * 100)
                  : (((currentConfirmIndex + 1) / pendingMisconceptions.length) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full">
        {messages.map((msg) => (
          msg.type === 'system'
            ? <SystemBubble key={msg.id} text={msg.text} />
            : <StudentBubble key={msg.id} text={msg.text} />
        ))}
        {isThinking && <ThinkingBubble />}
        <div ref={bottomRef}></div>
      </div>

      {/* Options Panel */}
      {isQuestionPhase && optionsEnabled && currentQ && (
        <div className="bg-white border-t border-[#D5D8DC] px-4 py-4 max-w-2xl mx-auto w-full">
          <p className="text-xs text-[#95A5A6] mb-3 text-center">請選擇你覺得最合理的答案</p>
          <div className="grid grid-cols-1 gap-2">
            {currentQ.options.map((opt) => (
              <button
                key={opt.tag}
                onClick={() => handleSelectOption(opt)}
                className="text-left px-4 py-3 rounded-2xl bg-[#C8EAAE] border border-[#BDC3C7] hover:bg-[#8FC87A] text-sm text-[#2D3436] transition-all leading-relaxed shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
              >
                {opt.content}
              </button>
            ))}
          </div>
        </div>
      )}

      {isConfirmingPhase && confirmActionsEnabled && currentConfirmationId && (
        <div className="bg-white border-t border-[#D5D8DC] px-4 py-4 max-w-2xl mx-auto w-full">
          <p className="text-xs text-[#95A5A6] mb-3 text-center">請選擇比較接近你真正想法的回答</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleConfirmResponse(true)}
              className="px-4 py-3 rounded-2xl bg-[#C8EAAE] border border-[#BDC3C7] hover:bg-[#8FC87A] text-sm font-medium text-[#2D3436] transition-all"
            >
              對，我是這樣想的
            </button>
            <button
              onClick={() => handleConfirmResponse(false)}
              className="px-4 py-3 rounded-2xl bg-[#BADDF4] border border-[#BDC3C7] hover:bg-[#8BC8EE] text-sm font-medium text-[#2D3436] transition-all"
            >
              不，我不這樣認為
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="bg-white border-t border-[#D5D8DC] px-4 py-4 text-center">
          <p className="text-sm text-[#636E72]">正在前往您的學習體檢表...</p>
          <div className="mt-2 flex justify-center">
            <div className="w-5 h-5 border-2 border-[#8FC87A] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
    </div>
  );
}
