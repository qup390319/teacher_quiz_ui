import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';
import { knowledgeNodes } from '../../data/knowledgeGraph';

export default function QuizLibrary() {
  const navigate = useNavigate();
  const { quizzes, classes, assignments, setQuizQuestions, setSelectedNodeIds } = useApp();

  const handleEdit = (quiz) => {
    setQuizQuestions([...quiz.questions]);
    setSelectedNodeIds([...quiz.knowledgeNodeIds]);
    navigate('/teacher/quiz/create');
  };

  const getAssignedClasses = (quizId) => {
    const classIds = [...new Set(assignments.filter(a => a.quizId === quizId).map(a => a.classId))];
    return classIds.map(id => classes.find(c => c.id === id)).filter(Boolean);
  };

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* 頁首 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3436]">出題管理</h1>
            <p className="text-[#636E72] mt-1 text-sm">這裡是您所有的考卷。出題流程：選擇出題範圍 → 編輯考卷內容 → 儲存 → 到「派題管理」發給班級</p>
          </div>
          <button
            onClick={() => navigate('/teacher/quiz/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl text-sm font-semibold hover:bg-[#76B563] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增考卷
          </button>
        </div>

        {/* 考卷列表 */}
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="w-14 h-14 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium">目前還沒有考卷</p>
            <p className="text-sm text-[#95A5A6] mt-1">點擊右上角「新增考卷」開始出題</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const assignedClasses = getAssignedClasses(quiz.id);
              const coveredNodes = quiz.knowledgeNodeIds
                .map(id => knowledgeNodes.find(n => n.id === id))
                .filter(Boolean);

              return (
                <div key={quiz.id} className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-[#95A5A6]">建立於 {quiz.createdAt}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#2D3436] mb-2">{quiz.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-[#636E72] mb-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {quiz.questionCount} 題
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                          </svg>
                          {quiz.knowledgeNodeIds.length} 個知識節點
                        </span>
                      </div>
                      {/* 知識節點 badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {coveredNodes.map((node) => (
                          <span key={node.id} className="text-xs bg-[#EEF5E6] border border-[#D5D8DC] text-[#636E72] px-2 py-0.5 rounded-full">
                            {node.id} {node.name}
                          </span>
                        ))}
                      </div>
                      {/* 已派班級（資訊顯示，不作為操作入口） */}
                      {assignedClasses.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#95A5A6]">已派發：</span>
                          {assignedClasses.map((cls) => (
                            <span key={cls.id} className="text-xs font-medium px-2 py-0.5 rounded-full border border-[#BDC3C7]"
                              style={{ backgroundColor: cls.color, color: cls.textColor }}>
                              {cls.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(quiz)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        編輯
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
