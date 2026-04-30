import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getScenarioQuiz } from '../../data/scenarioQuizData';
import {
  runTreatmentTurn,
  makeInitialTurn,
  STEPS_PER_QUESTION,
  PHASE_LABEL,
  STAGE_LABEL,
} from '../../data/treatmentBot';
import {
  WOOD_OUTER,
  WOOD_INNER_CREAM,
  WoodIconButton,
} from '../../components/ui/woodKit';
import WoodenProgressBar from '../../components/student/WoodenProgressBar';
import ScenarioImageLightbox from '../../components/student/ScenarioImageLightbox';
import ScenarioIntro from '../../components/student/ScenarioIntro';
import ScenarioPanel from '../../components/student/ScenarioPanel';
import ChatStream from '../../components/student/ChatStream';
import MascotHintBubble from '../../components/student/MascotHintBubble';
import { SettlingPanel, ResultPanel } from '../../components/student/CompletionWoodenSign';
import ReflectionPanel from '../../components/student/ReflectionPanel';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';

/* 暫定登入學生（與 StudentHome 同步）*/
const STUDENT_CLASS_ID = 'class-A';
const STUDENT_SEAT = 1;

const newId = () => `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/* ============================================================
 *  ScenarioChat 主頁（spec-08 §6 / spec-07 §12）
 *  entryStage: 'intro' → 'scenario' → 'chat'
 *  flowStage : 'chat' → 'between-questions' → 'next-scenario' → 'settling' → 'result' → 'reflection'
 * ============================================================ */
export default function ScenarioChat() {
  const { scenarioQuizId } = useParams();
  const navigate = useNavigate();
  const {
    classes,
    startTreatmentSession,
    appendTreatmentMessage,
    updateTreatmentQuestionState,
    advanceTreatmentQuestion,
    completeTreatmentSession,
    getTreatmentSession,
  } = useApp();

  const quiz = useMemo(() => getScenarioQuiz(scenarioQuizId), [scenarioQuizId]);
  const totalQuestions = quiz?.questions?.length ?? 0;

  const currentClass = classes.find((c) => c.id === STUDENT_CLASS_ID);
  const studentName =
    currentClass?.students?.find((s) => s.seat === STUDENT_SEAT)?.name ?? '探險者';

  const [entryStage, setEntryStage] = useState('intro');
  const [flowStage, setFlowStage] = useState('chat');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);

  const currentQuestion = quiz?.questions?.[currentQuestionIndex - 1] ?? null;

  const session = getTreatmentSession(scenarioQuizId, STUDENT_SEAT);
  const qState = session?.perQuestion?.[currentQuestionIndex];
  const messages = qState?.messages ?? [];
  const phase = qState?.phase ?? 'diagnosis';
  const step = qState?.step ?? 0;
  const stage = qState?.stage ?? 'claim';
  const hintLevel = qState?.hintLevel ?? 0;
  const requiresRestatement = qState?.requiresRestatement ?? false;

  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [feedbackText, setFeedbackText] = useState('試著說說你的想法吧！');

  const [scenarioExpanded, setScenarioExpanded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const chatStreamRef = useRef(null);
  const inputRef = useRef(null);

  const totalSteps = totalQuestions * STEPS_PER_QUESTION;
  const cumulativeStep = (currentQuestionIndex - 1) * STEPS_PER_QUESTION + step;
  const progress = totalSteps > 0 ? Math.round((cumulativeStep / totalSteps) * 100) : 0;
  const [bumping, setBumping] = useState(false);
  const [bumpAmount, setBumpAmount] = useState(1);

  const [reflectionMessages, setReflectionMessages] = useState([]);
  const [reflectionInput, setReflectionInput] = useState('');
  const [activeHistoryTab, setActiveHistoryTab] = useState(1);

  useEffect(() => {
    const el = chatStreamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, isThinking]);

  useEffect(() => {
    if (!bumping) return undefined;
    const t = setTimeout(() => setBumping(false), 700);
    return () => clearTimeout(t);
  }, [bumping]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBE9C7] p-6">
        <div className={WOOD_OUTER + ' max-w-sm'}>
          <div className={WOOD_INNER_CREAM + ' p-6 text-center'}>
            <h2 className="font-game text-2xl font-black text-[#5A3E22] mb-3">找不到情境考卷</h2>
            <p className="text-sm text-[#7A5232] mb-4">{scenarioQuizId}</p>
            <button
              type="button"
              onClick={() => navigate('/student')}
              className="rounded-2xl bg-gradient-to-b from-[#F4D58A] to-[#F0B962] border-[3px] border-[#9B5E18]
                         text-[#7A4A18] font-game font-black px-5 py-2.5
                         shadow-[0_4px_0_#9B5E18] hover:translate-y-0.5 transition"
            >
              回到首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 啟動第 1 題 */
  const handleStartChallenge = () => {
    startTreatmentSession(scenarioQuizId, STUDENT_SEAT);
    initializeQuestion(1);
    setEntryStage('chat');
    setFlowStage('chat');
    setCurrentQuestionIndex(1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  /* 初始化某題（共用）*/
  const initializeQuestion = (idx) => {
    const init = makeInitialTurn(scenarioQuizId, idx);
    appendTreatmentMessage(scenarioQuizId, STUDENT_SEAT, idx, {
      id: newId(),
      role: 'ai',
      text: init.assistantMessage,
      phase: init.phase,
      stage: init.stage,
      step: init.step,
      hintLevel: init.hintLevel,
      feedback: init.feedback,
      createdAt: new Date().toISOString(),
    });
    updateTreatmentQuestionState(scenarioQuizId, STUDENT_SEAT, idx, {
      phase: init.phase,
      step: init.step,
      stage: init.stage,
      hintLevel: init.hintLevel,
      requiresRestatement: init.requiresRestatement,
    });
    setFeedbackText(init.feedback);
  };

  /* 送出訊息 */
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isThinking) return;
    setInputValue('');

    appendTreatmentMessage(scenarioQuizId, STUDENT_SEAT, currentQuestionIndex, {
      id: newId(),
      role: 'student',
      text,
      createdAt: new Date().toISOString(),
    });

    setIsThinking(true);
    await new Promise((r) => setTimeout(r, 700));

    const turn = runTreatmentTurn(
      {
        scenarioQuizId,
        questionIndex: currentQuestionIndex,
        history: messages.map((m) => ({ role: m.role, text: m.text })),
        phase,
        step,
        stage,
        hintLevel,
        requiresRestatement,
      },
      text,
    );

    appendTreatmentMessage(scenarioQuizId, STUDENT_SEAT, currentQuestionIndex, {
      id: newId(),
      role: 'ai',
      text: turn.assistantMessage,
      phase: turn.phase,
      stage: turn.stage,
      step: turn.step,
      hintLevel: turn.hintLevel,
      feedback: turn.feedback,
      requiresRestatement: turn.requiresRestatement,
      createdAt: new Date().toISOString(),
    });
    updateTreatmentQuestionState(scenarioQuizId, STUDENT_SEAT, currentQuestionIndex, {
      phase: turn.phase,
      step: turn.step,
      stage: turn.stage,
      hintLevel: turn.hintLevel,
      requiresRestatement: turn.requiresRestatement,
    });
    setFeedbackText(turn.feedback);
    setBumpAmount(turn.step - step);
    setBumping(true);
    setIsThinking(false);

    if (turn.phase === 'completed' || turn.stage === 'complete') {
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions) {
          setFlowStage('between-questions');
        } else {
          setFlowStage('settling');
          setTimeout(() => setFlowStage('result'), 2200);
        }
      }, 800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    advanceTreatmentQuestion(scenarioQuizId, STUDENT_SEAT, nextIdx);
    initializeQuestion(nextIdx);
    setCurrentQuestionIndex(nextIdx);
    setFlowStage('chat');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleEnterReflection = () => {
    completeTreatmentSession(scenarioQuizId, STUDENT_SEAT);
    setReflectionMessages([
      {
        id: newId(),
        role: 'ai',
        text:
          '你已經完成這次治療對話！我們來做個反思：剛才幾題裡，' +
          '哪一個情境讓你覺得最難判斷？又是怎麼想出答案的？',
      },
    ]);
    setActiveHistoryTab(1);
    setFlowStage('reflection');
  };

  const handleReflectionSend = () => {
    const text = reflectionInput.trim();
    if (!text) return;
    setReflectionInput('');
    setReflectionMessages((prev) => [
      ...prev,
      { id: newId(), role: 'student', text },
      {
        id: newId(),
        role: 'ai',
        text: '謝謝你的分享！把這個想法記下來，遇到類似情境時就會有更清楚的思路 ✨',
      },
    ]);
  };

  const handleExit = () => {
    setShowLeaveModal(false);
    navigate('/student');
  };

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
      <header className="relative z-10 flex items-center gap-3 px-3 sm:px-5 pt-3 sm:pt-4 pb-3 animate-fade-up">
        <WoodIconButton
          icon="close"
          ariaLabel="離開"
          size="sm"
          onClick={() => setShowLeaveModal(true)}
        />
        {entryStage === 'chat' ? (
          <WoodenProgressBar
            progress={progress}
            stepInfo={
              phase
                ? `${PHASE_LABEL[phase] ?? phase}・${STAGE_LABEL[stage] ?? stage}・第 ${currentQuestionIndex}/${totalQuestions} 題`
                : null
            }
            bumping={bumping}
            bumpAmount={bumpAmount}
          />
        ) : (
          <div className="flex-1 flex justify-center">
            <h1 className="font-game text-base sm:text-lg font-black text-[#5A3E22] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
              {quiz.title}
            </h1>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {entryStage === 'intro' && (
          <ScenarioIntro
            quiz={quiz}
            studentName={studentName}
            onStart={() => setEntryStage('scenario')}
          />
        )}

        {entryStage === 'scenario' && (
          <ScenarioPanel
            question={quiz.questions[0]}
            indexLabel={`題組 1 / ${totalQuestions}`}
            onZoomImage={setLightboxSrc}
            onConfirm={handleStartChallenge}
          />
        )}

        {entryStage === 'chat' && (flowStage === 'chat' || flowStage === 'between-questions') && (
          <ChatStream
            scenarioExpanded={scenarioExpanded}
            onToggleScenario={() => setScenarioExpanded((v) => !v)}
            currentQuestion={currentQuestion}
            messages={messages}
            isThinking={isThinking}
            chatStreamRef={chatStreamRef}
            requiresRestatement={requiresRestatement}
            onZoomImage={setLightboxSrc}
            inputValue={inputValue}
            inputRef={inputRef}
            isBetween={flowStage === 'between-questions'}
            onInputChange={setInputValue}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            onNextQuestionScenario={() => setFlowStage('next-scenario')}
          />
        )}

        {entryStage === 'chat' && flowStage === 'next-scenario' && (
          <ScenarioPanel
            question={currentQuestion ?? quiz.questions[0]}
            indexLabel={`題組 ${currentQuestionIndex + 1} / ${totalQuestions}`}
            onZoomImage={setLightboxSrc}
            onConfirm={handleStartNextQuestion}
            confirmLabel="我已閱讀完成，繼續挑戰"
          />
        )}

        {entryStage === 'chat' && flowStage === 'settling' && <SettlingPanel />}

        {entryStage === 'chat' && flowStage === 'result' && (
          <ResultPanel quiz={quiz} stars={3} onEnterReflection={handleEnterReflection} />
        )}

        {entryStage === 'chat' && flowStage === 'reflection' && (
          <ReflectionPanel
            quiz={quiz}
            session={session}
            activeTab={activeHistoryTab}
            onChangeTab={setActiveHistoryTab}
            messages={reflectionMessages}
            inputValue={reflectionInput}
            onInputChange={setReflectionInput}
            onSend={handleReflectionSend}
            onExit={handleExit}
          />
        )}
      </main>

      {entryStage === 'chat' && flowStage === 'chat' && (
        <MascotHintBubble feedback={feedbackText} />
      )}

      <ScenarioImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {showLeaveModal && (
        <LeaveModal onCancel={() => setShowLeaveModal(false)} onConfirm={handleExit} />
      )}
    </div>
  );
}

/* 離開確認 Modal（小，留在主檔）*/
function LeaveModal({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className={`${WOOD_OUTER} max-w-sm w-full animate-fade-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={WOOD_INNER_CREAM + ' p-5 text-center'}>
          <p className="font-game text-lg sm:text-xl font-black text-[#5A3E22] mb-4 leading-relaxed">
            還沒結束喔，確定要離開嗎？
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl border-2
                         bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E] border-[#3D5A1A] text-white
                         font-game font-black
                         shadow-[0_4px_0_#3D5A1A] hover:translate-y-0.5 transition"
            >
              繼續努力
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl border-2
                         bg-white border-[#8B5E3C] text-[#7A4A18]
                         font-game font-bold
                         shadow-[0_2px_0_#8B5E3C] hover:translate-y-0.5 transition"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
