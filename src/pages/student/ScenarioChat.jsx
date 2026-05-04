import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useScenario } from '../../hooks/useScenarios';
import {
  useAdvanceTreatmentQuestion,
  useAppendTreatmentMessage,
  useCompleteTreatmentSession,
  useStartTreatmentSession,
  useTreatmentSessionByKey,
} from '../../hooks/useTreatment';
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

const newId = () => `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/* ============================================================
 *  ScenarioChat 主頁（spec-08 §6 / spec-07 §12）
 *  entryStage: 'intro' → 'scenario' → 'chat'
 *  flowStage : 'chat' → 'between-questions' → 'next-scenario' → 'settling' → 'result' → 'reflection'
 * ============================================================ */
export default function ScenarioChat() {
  const { scenarioQuizId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const studentId = currentUser?.id ?? null;
  const studentName = currentUser?.name ?? '探險者';

  const { data: quiz, isLoading: quizLoading } = useScenario(scenarioQuizId);
  const totalQuestions = quiz?.questions?.length ?? 0;

  // P4: 從 DB 讀既有 session（若有），否則 start 時建立新的
  const sessionQuery = useTreatmentSessionByKey(scenarioQuizId, studentId);
  const startSessionMut = useStartTreatmentSession();
  const appendMsgMut = useAppendTreatmentMessage();
  const advanceMut = useAdvanceTreatmentQuestion();
  const completeMut = useCompleteTreatmentSession();

  const [sessionId, setSessionId] = useState(null);
  // 本地 per-question state（最新 phase/step/stage/hintLevel + messages）
  // 用 useReducer-like 結構：{ [qIndex]: { messages, phase, step, stage, hintLevel, requiresRestatement } }
  const [perQuestion, setPerQuestion] = useState({});
  const [entryStage, setEntryStage] = useState('intro');
  const [flowStage, setFlowStage] = useState('chat');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);

  // hydrate from server when query resolves — one-shot sync of server data
  // into local mutable state; setState-in-effect is the documented pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sessionQuery.data && !sessionId) setSessionId(sessionQuery.data.id);
  }, [sessionQuery.data, sessionId]);

  // hydrate perQuestion from server messages on first load
  useEffect(() => {
    if (!sessionQuery.data) return;
    const grouped = {};
    for (const m of sessionQuery.data.messages ?? []) {
      const qi = m.questionIndex;
      if (!grouped[qi]) {
        grouped[qi] = {
          messages: [], phase: 'diagnosis', step: 0, stage: 'claim',
          hintLevel: 0, requiresRestatement: false,
        };
      }
      grouped[qi].messages.push({
        id: `srv-${m.id}`, role: m.role, text: m.text,
        phase: m.phase, stage: m.stage, step: m.step,
        hintLevel: m.hintLevel, feedback: m.feedback,
        requiresRestatement: m.requiresRestatement,
        createdAt: m.createdAt,
      });
      // last AI message wins for state derivation
      if (m.role === 'ai') {
        grouped[qi].phase = m.phase ?? grouped[qi].phase;
        grouped[qi].stage = m.stage ?? grouped[qi].stage;
        grouped[qi].step = m.step ?? grouped[qi].step;
        grouped[qi].hintLevel = m.hintLevel ?? grouped[qi].hintLevel;
        grouped[qi].requiresRestatement = m.requiresRestatement;
      }
    }
    // Server hydration: one-shot sync of grouped messages + cursor into local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerQuestion(grouped);
     
    setCurrentQuestionIndex(sessionQuery.data.currentQuestionIndex || 1);
  }, [sessionQuery.data]);

  const currentQuestion = quiz?.questions?.[currentQuestionIndex - 1] ?? null;

  const qState = perQuestion[currentQuestionIndex];
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

  /* per-question 操作（local + 同時 POST 到後端） */
  const updateQState = (qIdx, patch) => {
    setPerQuestion((prev) => {
      const cur = prev[qIdx] ?? {
        messages: [], phase: 'diagnosis', step: 0, stage: 'claim',
        hintLevel: 0, requiresRestatement: false,
      };
      return { ...prev, [qIdx]: { ...cur, ...patch } };
    });
  };
  const appendLocalMessage = (qIdx, message) => {
    setPerQuestion((prev) => {
      const cur = prev[qIdx] ?? {
        messages: [], phase: 'diagnosis', step: 0, stage: 'claim',
        hintLevel: 0, requiresRestatement: false,
      };
      return { ...prev, [qIdx]: { ...cur, messages: [...cur.messages, message] } };
    });
  };

  /** local + 同步 POST，失敗時不阻擋 UI（已寫到 console） */
  const persistMessage = async (qIdx, message, sid) => {
    appendLocalMessage(qIdx, message);
    if (!sid) return;
    try {
      await appendMsgMut.mutateAsync({
        sessionId: sid,
        questionIndex: qIdx,
        role: message.role,
        text: message.text,
        phase: message.phase ?? null,
        stage: message.stage ?? null,
        step: message.step ?? null,
        hintLevel: message.hintLevel ?? null,
        feedback: message.feedback ?? null,
        requiresRestatement: !!message.requiresRestatement,
      });
    } catch (err) {
      console.error('[ScenarioChat] persist message failed', err);
    }
  };

  if (quizLoading || !studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBE9C7] p-6">
        <p className="text-[#7A5232]">載入中…</p>
      </div>
    );
  }

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
  const handleStartChallenge = async () => {
    let sid = sessionId;
    if (!sid) {
      try {
        const startedSession = await startSessionMut.mutateAsync(scenarioQuizId);
        sid = startedSession.id;
        setSessionId(sid);
      } catch (err) {
        console.error('[ScenarioChat] start session failed', err);
        // continue anyway with local-only mode
      }
    }
    // 若本地已有第 1 題訊息（hydrate from server），跳過 init
    if (!perQuestion[1] || perQuestion[1].messages.length === 0) {
      await initializeQuestion(1, sid);
    }
    setEntryStage('chat');
    setFlowStage('chat');
    setCurrentQuestionIndex(1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  /* 初始化某題（共用）*/
  const initializeQuestion = async (idx, sid = sessionId) => {
    const init = makeInitialTurn(scenarioQuizId, idx);
    const aiMsg = {
      id: newId(),
      role: 'ai',
      text: init.assistantMessage,
      phase: init.phase,
      stage: init.stage,
      step: init.step,
      hintLevel: init.hintLevel,
      feedback: init.feedback,
      requiresRestatement: init.requiresRestatement,
      createdAt: new Date().toISOString(),
    };
    await persistMessage(idx, aiMsg, sid);
    updateQState(idx, {
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

    await persistMessage(currentQuestionIndex, {
      id: newId(),
      role: 'student',
      text,
      createdAt: new Date().toISOString(),
    }, sessionId);

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

    await persistMessage(currentQuestionIndex, {
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
    }, sessionId);
    updateQState(currentQuestionIndex, {
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

  const handleStartNextQuestion = async () => {
    const nextIdx = currentQuestionIndex + 1;
    if (sessionId) {
      try {
        await advanceMut.mutateAsync({ sessionId, nextIndex: nextIdx });
      } catch (err) {
        console.error('[ScenarioChat] advance failed', err);
      }
    }
    await initializeQuestion(nextIdx, sessionId);
    setCurrentQuestionIndex(nextIdx);
    setFlowStage('chat');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleEnterReflection = () => {
    if (sessionId) {
      completeMut.mutate(sessionId, {
        onError: (err) => console.error('[ScenarioChat] complete failed', err),
      });
    }
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
            session={{ perQuestion }}
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
