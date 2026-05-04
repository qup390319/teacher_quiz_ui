import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useScenario } from '../../hooks/useScenarios';
import { useClasses } from '../../hooks/useClasses';
import { useStudent } from '../../hooks/useStudents';
import { useTreatmentLog } from '../../hooks/useTreatment';
import { PHASE_LABEL, STAGE_LABEL } from '../../data/treatmentBot';
import { knowledgeNodes } from '../../data/knowledgeGraph';

/* 治療對話紀錄詳情頁（spec-08 §5.4）
 * P4 起：直接從 /api/teachers/treatment-logs/{sessionId} 拉 session + messages
 */
export default function TreatmentLogDetail() {
  const { sessionId: sessionIdParam } = useParams();
  const navigate = useNavigate();
  const sessionId = decodeURIComponent(sessionIdParam ?? '');

  const { data: session, isLoading: sessionLoading, error: sessionError } = useTreatmentLog(sessionId);
  const { data: scenarioQuiz, isLoading: scenarioLoading } = useScenario(session?.scenarioQuizId);
  const { data: studentRow } = useStudent(session?.studentId);
  const { data: classes = [] } = useClasses();

  const [activeIndex, setActiveIndex] = useState(1);

  // 將 server messages 依 questionIndex 分組
  const perQuestion = useMemo(() => {
    const grouped = {};
    for (const m of session?.messages ?? []) {
      const qi = m.questionIndex;
      if (!grouped[qi]) grouped[qi] = { messages: [], lastAi: null };
      grouped[qi].messages.push({
        id: `srv-${m.id}`, role: m.role, text: m.text,
        phase: m.phase, stage: m.stage, step: m.step,
        hintLevel: m.hintLevel, feedback: m.feedback,
        requiresRestatement: m.requiresRestatement,
      });
      if (m.role === 'ai') grouped[qi].lastAi = m;
    }
    return grouped;
  }, [session]);

  if (sessionLoading || scenarioLoading) {
    return (
      <TeacherLayout>
        <div className="p-8 text-[#636E72]">載入中…</div>
      </TeacherLayout>
    );
  }

  if (sessionError || !session || !scenarioQuiz) {
    return (
      <TeacherLayout>
        <div className="p-8 max-w-3xl">
          <div className="bg-white rounded-2xl border border-[#BDC3C7] p-8 text-center">
            <p className="text-[#636E72] mb-4">找不到此治療紀錄（{sessionId}）</p>
            <button
              type="button"
              onClick={() => navigate('/teacher/treatment-logs')}
              className="px-5 py-2 text-sm font-semibold text-[#3F8B5E] border border-[#5BA47A]
                         rounded-xl hover:bg-[#EEF5E6] transition"
            >
              回到紀錄列表
            </button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  const studentClass = studentRow
    ? classes.find((c) => c.id === studentRow.classId)
    : null;
  const student = studentRow ?? { name: `學生 ${session.studentId}` };
  const targetNode = knowledgeNodes.find((n) => n.id === scenarioQuiz.targetNodeId);

  const activeQuestion = scenarioQuiz.questions.find((q) => q.index === activeIndex);
  const activeGroup = perQuestion[activeIndex];
  const activeMessages = activeGroup?.messages ?? [];

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
        {/* 頁首 */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate('/teacher/treatment-logs')}
              className="text-xs text-[#3F8B5E] hover:underline mb-2"
            >
              ← 回紀錄列表
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">{scenarioQuiz.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-[#636E72]">
              <span>學生：<span className="font-bold text-[#2D3436]">{student.name}</span></span>
              <span className="hidden sm:inline">·</span>
              <span>班級：{studentClass?.name ?? '—'}</span>
              {targetNode && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="text-[#3F8B5E] font-semibold">
                    {targetNode.id}・{targetNode.name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-[#95A5A6]">
            <p>開始：{session.startedAt && new Date(session.startedAt).toLocaleString('zh-TW')}</p>
            {session.completedAt && (
              <p>完成：{new Date(session.completedAt).toLocaleString('zh-TW')}</p>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-semibold
                         ${session.status === 'completed'
                           ? 'bg-[#C8EAAE] text-[#2F4A1A]'
                           : 'bg-[#FCF0C2] text-[#7A5232]'}`}
            >
              {session.status === 'completed' ? '已完成' : '進行中'}
            </span>
          </div>
        </div>

        {/* 題目 tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {scenarioQuiz.questions.map((q) => {
            const qState = session.perQuestion?.[q.index];
            const hasMessages = (qState?.messages?.length ?? 0) > 0;
            return (
              <button
                key={q.index}
                type="button"
                onClick={() => setActiveIndex(q.index)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition
                           ${activeIndex === q.index
                             ? 'bg-[#5BA47A] border-[#3F8B5E] text-white'
                             : hasMessages
                               ? 'bg-white border-[#5BA47A] text-[#3F8B5E] hover:bg-[#EEF5E6]'
                               : 'bg-white border-[#BDC3C7] text-[#95A5A6]'}`}
              >
                {q.title}
                {!hasMessages && <span className="ml-1 text-xs opacity-60">（未作答）</span>}
              </button>
            );
          })}
        </div>

        {/* 雙欄 */}
        <div className="grid md:grid-cols-[320px_1fr] lg:grid-cols-[420px_1fr] gap-4">
          {/* 左：題目情境 */}
          <aside className="bg-white rounded-2xl border border-[#BDC3C7] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-fit">
            <h2 className="text-sm font-bold text-[#2D3436] mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#5BA47A] rounded-full" />
              {activeQuestion?.title}
            </h2>
            {activeQuestion && (
              <>
                <div className="mb-3 text-xs leading-6 text-[#636E72] whitespace-pre-line border border-[#EEF5E6]
                                rounded-xl p-3 bg-[#F9FBF7]">
                  {activeQuestion.scenarioText}
                </div>
                {activeQuestion.scenarioImages?.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {activeQuestion.scenarioImages.map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt="情境圖"
                        className="w-full rounded-lg border border-[#BDC3C7]"
                      />
                    ))}
                  </div>
                )}
                {activeQuestion.targetMisconceptions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#636E72] mb-1">針對迷思</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeQuestion.targetMisconceptions.map((mid) => (
                        <span
                          key={mid}
                          className="inline-flex px-2 py-0.5 rounded-full bg-[#FFF1D8] border border-[#F0B962]
                                     text-[#7A4A18] text-xs font-mono"
                        >
                          {mid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>

          {/* 右：對話紀錄 */}
          <section className="bg-white rounded-2xl border border-[#BDC3C7] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="text-sm font-bold text-[#2D3436] mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#3F8B5E] rounded-full" />
              對話紀錄（共 {activeMessages.length} 則）
            </h2>
            {activeMessages.length === 0 ? (
              <p className="text-sm text-[#95A5A6] text-center py-8">
                此題尚無對話內容
              </p>
            ) : (
              <div className="space-y-3">
                {activeMessages.map((m) => <TranscriptMessage key={m.id} message={m} studentName={student.name} />)}
              </div>
            )}
          </section>
        </div>
      </div>
    </TeacherLayout>
  );
}

/* ── 單則訊息：含 phase/stage/step/hintLevel 標註 ────── */
function TranscriptMessage({ message, studentName }) {
  const isAi = message.role === 'ai';
  const labelChips = isAi
    ? [
        message.phase && `phase: ${PHASE_LABEL[message.phase] ?? message.phase}`,
        message.stage && `stage: ${STAGE_LABEL[message.stage] ?? message.stage}`,
        message.step != null && `step: ${message.step}`,
        message.hintLevel != null && `hint: ${message.hintLevel}`,
      ].filter(Boolean)
    : [];

  return (
    <div className={`flex flex-col gap-1 ${isAi ? 'items-start' : 'items-end'}`}>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-bold text-[#636E72]">
          {isAi ? '🤖 AI' : `👦 ${studentName}`}
        </span>
        {message.createdAt && (
          <span className="text-[#95A5A6]">
            {new Date(message.createdAt).toLocaleTimeString('zh-TW', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </span>
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed border
                   ${isAi
                     ? 'bg-[#FFF8E7] border-[#C19A6B]/60 text-[#5A3E22] rounded-bl-md'
                     : 'bg-[#E8F4D8] border-[#A8D88E] text-[#2F4A1A] rounded-br-md'}`}
      >
        <p className="whitespace-pre-line">{message.text}</p>
      </div>
      {labelChips.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-1">
          {labelChips.map((c) => (
            <span
              key={c}
              className="inline-flex px-1.5 py-0.5 rounded bg-[#EEF5E6] border border-[#5BA47A]/40
                         text-[10px] text-[#3F8B5E] font-mono font-semibold"
            >
              {c}
            </span>
          ))}
          {message.feedback && (
            <span className="inline-flex px-1.5 py-0.5 rounded bg-[#FFF1D8] border border-[#F0B962]/40
                             text-[10px] text-[#7A4A18] font-medium">
              💬 {message.feedback}
            </span>
          )}
          {message.requiresRestatement && (
            <span className="inline-flex px-1.5 py-0.5 rounded bg-[#FFE0E5] border border-[#E74C5E]/40
                             text-[10px] text-[#A52938] font-semibold">
              需重述
            </span>
          )}
        </div>
      )}
    </div>
  );
}
