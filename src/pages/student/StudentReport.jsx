import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getQuizQuestions } from '../../data/quizData';
import { knowledgeNodes } from '../../data/knowledgeGraph';

export default function StudentReport() {
  const navigate = useNavigate();
  const {
    studentAnswers,
    correctCount,
    studentMisconceptions,
    resetStudentAnswers,
    currentQuizId,
    activeStudentReport,
  } = useApp();

  const reportQuizId = activeStudentReport?.quizId || currentQuizId || 'quiz-001';
  const reportQuestions = getQuizQuestions(reportQuizId);
  const answerSource = activeStudentReport?.answers || studentAnswers;
  const misconceptionSource = activeStudentReport?.misconceptions || studentMisconceptions;
  const hasAnswers = answerSource.length > 0;
  const totalQuestions = reportQuestions.length || 5;
  const displayCorrect = hasAnswers ? (activeStudentReport?.correctCount ?? correctCount) : 2;
  const displayWrong = hasAnswers ? totalQuestions - displayCorrect : 3;

  const misconDetails = (hasAnswers ? misconceptionSource : ['M02-2', 'M03-1', 'M09-1'])
    .map((mId) => {
      const node = knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === mId));
      const miscon = node?.misconceptions.find((m) => m.id === mId);
      if (!node || !miscon) return null;
      const relatedQs = hasAnswers
        ? answerSource
            .filter((a) => a.diagnosis === mId)
            .map((a) => reportQuestions.find((q) => q.id === a.questionId))
            .filter(Boolean)
        : reportQuestions.filter((q) => q.options.find((o) => o.diagnosis === mId));
      return { node, miscon, relatedQs };
    })
    .filter(Boolean);

  const wrongNodeIds = (hasAnswers
    ? answerSource.filter((a) => a.diagnosis !== 'CORRECT').map((a) => reportQuestions.find((q) => q.id === a.questionId)?.knowledgeNodeId)
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
    resetStudentAnswers();
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
          <h1 className="text-2xl font-bold text-[#2D3436] mb-4">你的科學思維診斷結果</h1>

          <div className="bg-white border border-[#BDC3C7] rounded-[32px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#3D5A3E] mb-1">{displayCorrect}</div>
                <div className="text-sm text-[#636E72]">個核心概念已掌握 ✓</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#D4AC0D] mb-1">{displayWrong}</div>
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
              {misconDetails.map(({ node, miscon, relatedQs }) => (
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
              ))}
            </div>
          ) : (
            <div className="bg-[#C8EAAE] border border-[#BDC3C7] rounded-[32px] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-bold text-[#3D5A3E]">你答對了所有題目！</p>
              <p className="text-sm text-[#5A8A5C] mt-1">你對這些科學概念有很好的理解！</p>
            </div>
          )}
        </div>

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
