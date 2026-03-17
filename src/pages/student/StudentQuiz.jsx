import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { defaultQuestions } from '../../data/quizData';
import { knowledgeNodes } from '../../data/knowledgeGraph';

const nodeOrder = Object.fromEntries(knowledgeNodes.map((n, i) => [n.id, i]));
const sortedQuestions = [...defaultQuestions].sort((a, b) => {
  return (nodeOrder[a.knowledgeNodeId] ?? 99) - (nodeOrder[b.knowledgeNodeId] ?? 99);
});

const INTRO_MESSAGES = [
  { id: 'intro-1', text: '你好！我是「科學偵探」系統 🔍', type: 'system' },
  { id: 'intro-2', text: '今天我們要一起探索關於「溫度與熱」的科學思維。', type: 'system' },
  { id: 'intro-3', text: '沒有對錯評分，只是想了解你目前的想法。請輕鬆選出你覺得最合理的答案！', type: 'system' },
];

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
  const navigate = useNavigate();
  const { recordAnswer, resetStudentAnswers } = useApp();
  const bottomRef = useRef(null);

  const [phase, setPhase] = useState('intro');
  const [messages, setMessages] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const [introIdx, setIntroIdx] = useState(0);

  useEffect(() => { resetStudentAnswers(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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
  }, [phase, introIdx]);

  const showNextQuestion = (qIdx) => {
    const q = sortedQuestions[qIdx];
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
  };

  const handleSelectOption = (opt) => {
    if (!optionsEnabled) return;
    setOptionsEnabled(false);
    const q = sortedQuestions[currentQIndex];

    recordAnswer(q.id, opt.tag, opt.diagnosis);

    setMessages((prev) => [
      ...prev,
      { id: `ans-${q.id}`, text: opt.content, type: 'student' },
    ]);

    const nextIdx = currentQIndex + 1;
    if (nextIdx >= sortedQuestions.length) {
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          { id: 'done-1', text: '謝謝你的回答！我已經了解你目前的科學思維了。', type: 'system' },
          { id: 'done-2', text: '讓我整理一份專屬於你的「學習體檢表」...', type: 'system' },
        ]);
        setPhase('done');
        setTimeout(() => navigate('/student/report'), 2000);
      }, 1200);
    } else {
      setCurrentQIndex(nextIdx);
      showNextQuestion(nextIdx);
    }
  };

  const currentQ = phase === 'question' ? sortedQuestions[currentQIndex] : null;

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#D5D8DC] px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center">
            <span className="text-base">🤖</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#2D3436]">科學偵探</p>
            <p className="text-xs text-[#5A8A5C] flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 bg-[#8FC87A] rounded-full inline-block"></span>
              溫度與熱診斷進行中
            </p>
          </div>
        </div>
        {phase === 'question' && (
          <div className="text-right">
            <p className="text-xs text-[#95A5A6]">進度</p>
            <p className="text-sm font-bold text-[#2D3436]">{currentQIndex + 1} / {sortedQuestions.length}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {phase === 'question' && (
        <div className="bg-white border-b border-[#D5D8DC] px-4 py-2.5">
          <div className="w-full bg-[#D5D8DC] rounded-full h-2">
            <div
              className="bg-[#8FC87A] h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentQIndex / sortedQuestions.length) * 100}%` }}
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
      {phase === 'question' && optionsEnabled && currentQ && (
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
