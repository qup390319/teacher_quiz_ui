import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import { useApp } from '../../../context/AppContext';
import { knowledgeNodes } from '../../../data/knowledgeGraph';

/* 情境考卷庫（spec-08 §5.1）
 * 列出全部情境考卷，可預覽題數 / 目標節點 / 目標迷思，並可編輯／新增。
 */
export default function ScenarioLibrary() {
  const navigate = useNavigate();
  const { scenarioQuizzes, assignments, classes } = useApp();

  const getAssignedClasses = (scenarioQuizId) => {
    const classIds = [
      ...new Set(
        assignments
          .filter((a) => a.type === 'scenario' && a.scenarioQuizId === scenarioQuizId)
          .map((a) => a.classId)
      ),
    ];
    return classIds.map((id) => classes.find((c) => c.id === id)).filter(Boolean);
  };

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* 頁首 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3436]">情境出題</h1>
            <p className="text-[#636E72] mt-1 text-sm">
              情境考卷以「論證情境 + AI 對話治療」進行（認知師徒制）。流程：建立情境考卷 → 派發給班級 → 學生與 AI 對話 → 教師查紀錄。
            </p>
          </div>
          <button
            onClick={() => navigate('/teacher/scenarios/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5BA47A] text-white border border-[#3F8B5E] rounded-2xl
                       text-sm font-semibold hover:bg-[#3F8B5E] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增情境考卷
          </button>
        </div>

        {/* 情境考卷列表 */}
        {scenarioQuizzes.length === 0 ? (
          <EmptyState onCreate={() => navigate('/teacher/scenarios/create')} />
        ) : (
          <div className="space-y-4">
            {scenarioQuizzes.map((sq) => {
              const targetNode = knowledgeNodes.find((n) => n.id === sq.targetNodeId);
              const assignedClasses = getAssignedClasses(sq.id);
              return (
                <div
                  key={sq.id}
                  className="bg-white rounded-[24px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]
                             hover:border-[#5BA47A] hover:shadow-[0_4px_16px_rgba(63,139,94,0.18)] transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 標題列 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F0E8]
                                         border border-[#3F8B5E] text-[#2E6B47] text-xs font-bold">
                          🌱 情境治療
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                     ${sq.status === 'published'
                                       ? 'bg-[#C8EAAE] text-[#2F4A1A]'
                                       : 'bg-[#FCF0C2] text-[#7A5232]'}`}
                        >
                          {sq.status === 'published' ? '已發佈' : '草稿'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2D3436] mb-1">{sq.title}</h3>
                      <p className="text-xs text-[#95A5A6] mb-3">
                        建立於 {sq.createdAt} · 共 {sq.questions.length} 題情境
                      </p>

                      {/* 目標節點 */}
                      {targetNode && (
                        <div className="mb-3">
                          <p className="text-xs text-[#636E72] mb-1">目標節點</p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF5E6] border border-[#5BA47A]
                                           text-[#3F8B5E] text-xs font-bold">
                            {targetNode.id}・{targetNode.name}
                          </span>
                        </div>
                      )}

                      {/* 目標迷思 */}
                      {sq.targetMisconceptions?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-[#636E72] mb-1">目標迷思</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sq.targetMisconceptions.map((mid) => (
                              <span
                                key={mid}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF1D8]
                                           border border-[#F0B962] text-[#7A4A18] text-xs font-mono"
                              >
                                {mid}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 已派發班級 */}
                      {assignedClasses.length > 0 && (
                        <div>
                          <p className="text-xs text-[#636E72] mb-1">已派發給</p>
                          <div className="flex flex-wrap gap-1.5">
                            {assignedClasses.map((c) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                                style={{ backgroundColor: c.color, color: c.textColor, borderColor: c.textColor }}
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/scenarios/${sq.id}/edit`)}
                        className="px-4 py-1.5 text-sm font-semibold text-[#3F8B5E] border border-[#5BA47A]
                                   rounded-xl hover:bg-[#EEF5E6] transition"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/teacher/assignments')}
                        className="px-4 py-1.5 text-sm font-semibold text-white bg-[#5BA47A]
                                   border border-[#3F8B5E] rounded-xl hover:bg-[#3F8B5E] transition"
                      >
                        派發
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="text-[#636E72] font-medium">還沒有情境考卷</p>
      <p className="text-sm text-[#95A5A6] mt-1 mb-4">情境考卷讓 AI 用「認知師徒制」對話引導學生治療迷思</p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5BA47A] text-white rounded-2xl text-sm font-semibold
                   hover:bg-[#3F8B5E] transition shadow-[0_2px_8px_rgba(63,139,94,0.3)]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        建立第一份情境考卷
      </button>
    </div>
  );
}
