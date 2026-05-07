import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { useApp } from '../../context/AppContext';
import { useClasses } from '../../hooks/useClasses';
import { useAssignments } from '../../hooks/useAssignments';
import { useQuizzes, useDeleteQuiz } from '../../hooks/useQuizzes';
import { api } from '../../lib/api';
import { knowledgeNodes } from '../../data/knowledgeGraph';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '題庫（已發布）' },
  { key: 'draft', label: '草稿' },
];

export default function QuizLibrary() {
  const navigate = useNavigate();
  const {
    setQuizQuestions, setSelectedNodeIds,
    setEditingQuizId, setEditingQuizStatus,
  } = useApp();
  const { data: quizzes = [], isLoading } = useQuizzes();
  const { data: classes = [] } = useClasses();
  const { data: assignments = [] } = useAssignments();
  const deleteQuiz = useDeleteQuiz();
  const [activeTab, setActiveTab] = useState('published');
  const [deletingQuiz, setDeletingQuiz] = useState(null);

  const counts = {
    all: quizzes.length,
    published: quizzes.filter((q) => q.status === 'published').length,
    draft: quizzes.filter((q) => q.status === 'draft').length,
  };
  const visibleQuizzes = activeTab === 'all'
    ? quizzes
    : quizzes.filter((q) => q.status === activeTab);

  const handleEdit = async (quiz) => {
    try {
      const detail = await api.get(`/quizzes/${quiz.id}`);
      setQuizQuestions([...detail.questions]);
      setSelectedNodeIds([...detail.knowledgeNodeIds]);
      setEditingQuizId(quiz.id);
      setEditingQuizStatus(detail.status);
      navigate('/teacher/quiz/create?step=2');
    } catch (err) {
      console.error('[QuizLibrary] failed to load quiz', err);
      alert('載入考卷失敗');
    }
  };

  const handleClone = async (quiz) => {
    try {
      const detail = await api.get(`/quizzes/${quiz.id}`);
      const cloned = detail.questions.map((q, idx) => ({
        ...JSON.parse(JSON.stringify(q)),
        id: idx + 1,
      }));
      setQuizQuestions(cloned);
      setSelectedNodeIds([...detail.knowledgeNodeIds]);
      setEditingQuizId(null);          // 新建模式
      setEditingQuizStatus(null);
      navigate('/teacher/quiz/create?step=2');
    } catch (err) {
      console.error('[QuizLibrary] failed to clone quiz', err);
      alert('複製考卷失敗');
    }
  };

  const confirmDelete = async () => {
    if (!deletingQuiz) return;
    try {
      await deleteQuiz.mutateAsync(deletingQuiz.id);
      setDeletingQuiz(null);
    } catch (err) {
      console.error('[QuizLibrary] failed to delete', err);
      alert('刪除考卷失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleNew = () => {
    setEditingQuizId(null);
    setEditingQuizStatus(null);
    navigate('/teacher/quiz/create');
  };

  const getAssignedClasses = (quizId) => {
    const classIds = [...new Set(assignments.filter(a => a.quizId === quizId).map(a => a.classId))];
    return classIds.map(id => classes.find(c => c.id === id)).filter(Boolean);
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="flex flex-wrap items-start justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">出題管理</h1>
            <p className="text-[#636E72] mt-1 text-sm">這裡是您所有的考卷。出題流程：選擇出題範圍 → 編輯考卷內容 → 儲存 → 到「派題管理」發給班級</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl text-sm font-semibold hover:bg-[#76B563] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增考卷
          </button>
        </div>

        {/* Tab Bar */}
        {!isLoading && quizzes.length > 0 && (
          <div className="mb-4 flex gap-1 border-b border-[#BDC3C7]">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2 ${
                    active
                      ? 'border-[#8FC87A] text-[#3D5A3E]'
                      : 'border-transparent text-[#95A5A6] hover:text-[#636E72]'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-[#C8EAAE] text-[#3D5A3E]' : 'bg-[#EEF5E6] text-[#95A5A6]'
                  }`}>
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 考卷列表 */}
        {isLoading && (
          <div className="text-[#636E72] text-sm mb-4">載入中…</div>
        )}
        {!isLoading && quizzes.length === 0 ? (
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
        ) : !isLoading && visibleQuizzes.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="w-14 h-14 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium">
              {activeTab === 'draft' ? '目前沒有草稿' : '題庫尚未有已發布的考卷'}
            </p>
            <p className="text-sm text-[#95A5A6] mt-1">
              {activeTab === 'draft' ? '出題過程中按「儲存草稿」即可暫存' : '完成出題後按「儲存並發布」即可加入題庫'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleQuizzes.map((quiz) => {
              const assignedClasses = getAssignedClasses(quiz.id);
              const coveredNodes = quiz.knowledgeNodeIds
                .map(id => knowledgeNodes.find(n => n.id === id))
                .filter(Boolean);
              const isDraft = quiz.status === 'draft';

              return (
                <div key={quiz.id} className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isDraft ? 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' : 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]'}`}>
                          {isDraft ? '草稿' : '已發布'}
                        </span>
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
                        {isDraft ? '繼續編輯' : '編輯'}
                      </button>
                      <button
                        onClick={() => handleClone(quiz)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#2E86C1] bg-[#BADDF4] border border-[#BDC3C7] rounded-xl hover:bg-[#A8D2EC] transition-colors"
                        title="以這份為範本，建立新考卷"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        複製為新考卷
                      </button>
                      <button
                        onClick={() => setDeletingQuiz(quiz)}
                        disabled={deleteQuiz.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {isDraft ? '刪除草稿' : '刪除'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deletingQuiz && (
        <ConfirmDeleteModal
          title="確認要刪除此題庫？"
          message="此動作無法復原。"
          itemLabel={`${deletingQuiz.status === 'draft' ? '草稿' : '已發布'}・${deletingQuiz.title}`}
          isPending={deleteQuiz.isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeletingQuiz(null)}
        />
      )}
    </TeacherLayout>
  );
}
