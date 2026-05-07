import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useStudentHistory } from '../../hooks/useStudents';
import { getQuizQuestions } from '../../data/quizData';
import { knowledgeNodes } from '../../data/knowledgeGraph';

export default function StudentReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentQuizId, activeStudentReport } = useApp();
  const { currentUser } = useAuth();

  // P4: canonical 來源是 DB（/api/students/{id}/history），但「剛剛完成的測驗」
  // 走 in-memory 暫存路徑（activeStudentReport），避免 race condition + 不必要
  // 的 server 來回。重新登入後沒有 in-memory 快照時 fall back 撈 DB 摘要。
  const queryQuizId = searchParams.get('quizId');
  const reportQuizId = activeStudentReport?.quizId || queryQuizId || currentQuizId || 'quiz-001';
  const needBackend = !activeStudentReport;
  const { data: history = [] } = useStudentHistory(currentUser?.id, { enabled: needBackend });
  const backendRow = needBackend ? history.find((h) => h.quizId === reportQuizId) : null;

  const reportQuestions = getQuizQuestions(reportQuizId);
  const answerSource = activeStudentReport?.answers || [];
  const misconceptionSource =
    activeStudentReport?.misconceptions || backendRow?.misconceptions || [];
  const followUpResults = activeStudentReport?.followUpResults || [];
  const hasFullAnswers = answerSource.length > 0;            // in-memory detailed
  const hasAnswers = hasFullAnswers || !!backendRow;         // any source has data
  const totalQuestions =
    activeStudentReport?.totalQuestions ?? backendRow?.totalQuestions ?? reportQuestions.length ?? 5;
  const displayCorrect = activeStudentReport?.correctCount ?? backendRow?.correctCount ?? (hasAnswers ? 0 : 2);
  const displayWrong = totalQuestions - displayCorrect;

  /* 答對但 reasoningQuality 為 WEAK / GUESSING 的題目（spec §3.7 黃色標記） */
  const weakCorrectResults = followUpResults.filter((r) =>
    r.diagnosis?.finalStatus === 'CORRECT'
    && (r.diagnosis?.reasoningQuality === 'WEAK' || r.diagnosis?.reasoningQuality === 'GUESSING')
  );

  /* 取得單一迷思相關的學生對話引用 */
  const getStudentQuote = (questionId) => {
    const result = followUpResults.find((r) => r.questionId === questionId);
    if (!result?.conversationLog) return null;
    const studentMsgs = result.conversationLog.filter((m) => m.role === 'student');
    if (studentMsgs.length === 0) return null;
    return studentMsgs[0].content; // 第一則學生回覆，最能代表初始想法
  };

  const misconDetails = (hasAnswers ? misconceptionSource : ['M02-2', 'M03-1', 'M09-1'])
    .map((mId) => {
      const node = knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === mId));
      const miscon = node?.misconceptions.find((m) => m.id === mId);
      if (!node || !miscon) return null;
      // 有完整作答快照（剛做完那次）→ 對到該題；只有 DB 摘要 → 列出該迷思可能對應的題目。
      const relatedQs = hasFullAnswers
        ? answerSource
            .filter((a) => a.diagnosis === mId)
            .map((a) => reportQuestions.find((q) => q.id === a.questionId))
            .filter(Boolean)
        : reportQuestions.filter((q) => q.options.find((o) => o.diagnosis === mId));
      return { node, miscon, relatedQs };
    })
    .filter(Boolean);

  // 從迷思清單反查涉及的知識節點（in-memory 快照可從 answerSource 直接拿，
  // DB 摘要則靠迷思 → 節點對應）。
  const wrongNodeIds = (hasFullAnswers
    ? answerSource.filter((a) => a.diagnosis !== 'CORRECT').map((a) => reportQuestions.find((q) => q.id === a.questionId)?.knowledgeNodeId)
    : hasAnswers
      ? misconceptionSource
          .map((mId) => knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === mId))?.id)
          .filter(Boolean)
      : ['INe-II-3-02', 'INe-Ⅲ-5-4']
  ).filter(Boolean);

  const uniqueWrongNodes = [...new Set(wrongNodeIds)];

  const wrongNodesWithPrereqs = uniqueWrongNodes
    .map((id) => knowledgeNodes.find((n) => n.id === id))
    .filter((n) => n && n.prerequisites.length > 0);

  const needsPrereqReview = wrongNodesWithPrereqs.length > 0;

  const remedialNodeIds = needsPrereqReview
    ? ['INe-II-3-01', 'INe-II-3-02', 'INe-Ⅲ-5-1']
    : uniqueWrongNodes;

  const remedialNodes = remedialNodeIds
    .map((id) => knowledgeNodes.find((n) => n.id === id))
    .filter(Boolean);

  const handleRetry = () => {
    navigate(`/student/quiz/${reportQuizId}`);
  };

  return (
    <div className="min-h-screen bg-[#EEF5E6]">
      {/* Header */}
      <div className="bg-[#8FC87A] border-b border-[#BDC3C7] px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => navigate('/student')}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-[#BDC3C7] bg-white/90 text-[#2D3436] hover:bg-white transition-colors"
              aria-label="返回"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <p className="text-[#3D5A3E] text-sm font-semibold">學習體檢表</p>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436] mb-3 sm:mb-4">你的科學思維診斷結果</h1>

          <div className="bg-white border border-[#BDC3C7] rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-[#3D5A3E] mb-1">{displayCorrect}</div>
                <div className="text-sm text-[#636E72]">個核心概念已掌握 ✓</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-[#D4AC0D] mb-1">{displayWrong}</div>
                <div className="text-sm text-[#636E72]">個科學觀念待更新 ✧</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#D5D8DC]">
              <p className="text-sm text-[#636E72] text-center leading-relaxed">
                科學學習是一段探索的旅程。了解自己目前的想法是進步的第一步！
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Section 1: My Misconceptions */}
        <div>
          <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#FAC8CC] border border-[#BDC3C7] text-[#E74C5E] rounded-full flex items-center justify-center text-sm font-bold">!</span>
            我的科學小迷思
          </h2>

          {misconDetails.length > 0 ? (
            <div className="space-y-4">
              {misconDetails.map(({ node, miscon, relatedQs }) => {
                const quote = relatedQs.length > 0 ? getStudentQuote(relatedQs[0].id) : null;
                return (
                  <div key={miscon.id} className="rounded-[32px] border border-[#BDC3C7] p-5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-[#EEF5E6] border border-[#BDC3C7] text-[#636E72]">
                        {node.name}
                      </span>
                    </div>

                    <div className="bg-[#FAC8CC] border border-[#F5B8BA] rounded-2xl p-4 mb-3">
                      <p className="text-xs font-semibold text-[#E74C5E] mb-1.5">💡 你目前的想法</p>
                      <p className="text-sm text-[#2D3436] font-medium leading-relaxed">「{miscon.label}」</p>
                      <p className="text-sm text-[#636E72] mt-1 leading-relaxed">{miscon.studentDetail || miscon.detail}</p>
                    </div>

                    {quote && (
                      <div className="bg-[#FFF6E0] border border-[#F0CFA4] rounded-2xl p-3 mb-3">
                        <p className="text-xs font-semibold text-[#B9770E] mb-1.5">💬 你在對話中提到</p>
                        <p className="text-sm text-[#7A5232] leading-relaxed italic">「{quote}」</p>
                      </div>
                    )}

                    {relatedQs.length > 0 && (
                      <div className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-2xl p-3 mb-3">
                        <p className="text-xs font-semibold text-[#95A5A6] mb-2">這個想法出現在以下情境：</p>
                        {relatedQs.map((q) => (
                          <p key={q.id} className="text-xs text-[#636E72] leading-relaxed mb-1">
                            • {q.stem}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="bg-[#BADDF4] border border-[#BDC3C7] rounded-2xl p-3.5">
                      <p className="text-xs font-semibold text-[#2E86C1] mb-1.5">🧪 科學上是這樣的</p>
                      <p className="text-sm text-[#2471A3] leading-relaxed">
                        {node.studentHint || `${node.teachingStrategy.split('。')[0]}。`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#C8EAAE] border border-[#BDC3C7] rounded-[32px] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-bold text-[#3D5A3E]">你答對了所有題目！</p>
              <p className="text-sm text-[#5A8A5C] mt-1">你對這些科學概念有很好的理解！</p>
            </div>
          )}
        </div>

        {/* Section 1.5: Correct but Weak Reasoning（答對但可深入理解） */}
        {weakCorrectResults.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#FCF0C2] border border-[#BDC3C7] text-[#B9770E] rounded-full flex items-center justify-center text-sm font-bold">?</span>
              答對了，但可以更深入理解
            </h2>
            <div className="space-y-3">
              {weakCorrectResults.map((r) => {
                const q = reportQuestions.find((qq) => qq.id === r.questionId);
                const node = q ? knowledgeNodes.find((n) => n.id === q.knowledgeNodeId) : null;
                const studentMsg = r.conversationLog?.find((m) => m.role === 'student');
                return (
                  <div key={r.questionId} className="rounded-2xl border border-[#F5D669] p-4 bg-[#FFFBF0] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FCF0C2] border border-[#F5D669] text-[#B9770E]">
                        {node?.name || '科學概念'}
                      </span>
                      <span className="text-xs text-[#B9770E] font-semibold">答對了，但可以更深入理解</span>
                    </div>
                    {studentMsg && (
                      <p className="text-sm text-[#7A5232] mb-2 leading-relaxed italic">
                        你的回答：「{studentMsg.content}」
                      </p>
                    )}
                    <p className="text-sm text-[#5A3E22] leading-relaxed">
                      {r.diagnosis?.aiSummary || '建議再花點時間想想：這個現象背後的原理是什麼？'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Remedial Path */}
        <div>
          <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#BADDF4] border border-[#BDC3C7] text-[#2E86C1] rounded-full flex items-center justify-center text-sm font-bold">→</span>
            下一步學習建議
          </h2>

          {needsPrereqReview && (
            <div className="bg-[#FCF0C2] border border-[#F5D669] rounded-2xl p-4 mb-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-[#D4AC0D] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-[#B7950B] leading-relaxed">
                你在較後段的概念有些疑惑，建議先回頭複習基礎的「溶解現象」與「水溶液組成」概念，打穩基礎後再往後學習會更有效喔！
              </p>
            </div>
          )}

          <div className="space-y-3">
            {remedialNodes.map((node) => (
              <div key={node.id} className="rounded-2xl border border-[#BDC3C7] p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#95A5A6]">{node.id}</span>
                    <span className="text-sm font-bold text-[#2D3436]">{node.name}</span>
                  </div>
                </div>
                <p className="text-xs text-[#636E72] mb-3">{node.description}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 bg-[#C8EAAE] border border-[#BDC3C7] rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <span className="text-base">📺</span>
                    <div>
                      <p className="text-xs font-semibold text-[#2D3436]">教學影片</p>
                      <p className="text-xs text-[#2E86C1] font-medium">{node.id} · 因材網</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleRetry}
            className="flex-1 py-3 text-sm font-semibold text-[#636E72] border border-[#BDC3C7] bg-white rounded-2xl hover:bg-[#EEF5E6] transition-colors"
          >
            重新作答
          </button>
          <button
            onClick={() => navigate('/student')}
            className="flex-1 py-3 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl hover:bg-[#76B563] transition-colors"
          >
            回到首頁
          </button>
        </div>
      </div>
    </div>
  );
}
