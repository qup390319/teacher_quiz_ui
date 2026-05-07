import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal';
import { useScenarios, useDeleteScenario } from '../../../hooks/useScenarios';
import { useAssignments } from '../../../hooks/useAssignments';
import { useClasses } from '../../../hooks/useClasses';
import { knowledgeNodes } from '../../../data/knowledgeGraph';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '題庫（已發布）' },
  { key: 'draft', label: '草稿' },
];

/* 情境考卷庫（spec-08 §5.1）
 * 列出全部情境考卷，可預覽題數 / 目標節點 / 目標迷思，並可編輯／新增。
 */
export default function ScenarioLibrary() {
  const navigate = useNavigate();
  const { data: scenarioQuizzes = [], isLoading } = useScenarios();
  const { data: assignments = [] } = useAssignments();
  const { data: classes = [] } = useClasses();
  const deleteScenario = useDeleteScenario();
  const [activeTab, setActiveTab] = useState('published');
  const [deletingScenario, setDeletingScenario] = useState(null);

  const confirmDelete = async () => {
    if (!deletingScenario) return;
    try {
      await deleteScenario.mutateAsync(deletingScenario.id);
      setDeletingScenario(null);
    } catch (err) {
      console.error('[ScenarioLibrary] failed to delete', err);
      alert('刪除情境考卷失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const counts = {
    all: scenarioQuizzes.length,
    published: scenarioQuizzes.filter((s) => s.status === 'published').length,
    draft: scenarioQuizzes.filter((s) => s.status === 'draft').length,
  };
  const visibleScenarios = activeTab === 'all'
    ? scenarioQuizzes
    : scenarioQuizzes.filter((s) => s.status === activeTab);

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
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="flex flex-wrap items-start justify-between mb-3 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">情境出題</h1>
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

        {/* 認知師徒制四階段速覽（每階段一行 chip，極簡） */}
        <div className="mb-6 sm:mb-8 bg-[#FFFBF0] border border-[#F0B962] rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#7A4A18]">
            <span className="text-base">💡</span>認知師徒制四階段
          </span>
          {[
            { step: '1', name: '主張 Claim', what: '學生先說判斷' },
            { step: '2', name: '證據 Evidence', what: 'AI 追問依據' },
            { step: '3', name: '推理 Reasoning', what: '對照科學原理' },
            { step: '4', name: '修正 Revision', what: 'AI 反例引導' },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#F0B962]">
                <span className="w-5 h-5 rounded-full bg-[#D08B2E] text-white text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <span className="text-xs font-semibold text-[#5A3E22]">{s.name}</span>
                <span className="text-xs text-[#7A5232]">· {s.what}</span>
              </span>
              {i < arr.length - 1 && (
                <svg className="w-3 h-3 text-[#D08B2E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        {!isLoading && scenarioQuizzes.length > 0 && (
          <div className="mb-4 flex gap-1 border-b border-[#BDC3C7]">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2 ${
                    active
                      ? 'border-[#5BA47A] text-[#3F8B5E]'
                      : 'border-transparent text-[#95A5A6] hover:text-[#636E72]'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-[#E0F0E8] text-[#3F8B5E]' : 'bg-[#EEF5E6] text-[#95A5A6]'
                  }`}>
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 情境考卷列表 */}
        {isLoading && (
          <div className="text-[#636E72] text-sm mb-4">載入中…</div>
        )}
        {!isLoading && scenarioQuizzes.length === 0 ? (
          <EmptyState onCreate={() => navigate('/teacher/scenarios/create')} />
        ) : !isLoading && visibleScenarios.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium">
              {activeTab === 'draft' ? '目前沒有草稿' : '題庫尚未有已發布的情境考卷'}
            </p>
            <p className="text-sm text-[#95A5A6] mt-1">
              {activeTab === 'draft' ? '建立情境考卷時可先儲存為草稿' : '建立完情境考卷後按發布即可加入題庫'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleScenarios.map((sq) => {
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
                        建立於 {sq.createdAt} · 共 {sq.questionCount} 題情境
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
                      <button
                        type="button"
                        onClick={() => setDeletingScenario(sq)}
                        disabled={deleteScenario.isPending}
                        className="px-4 py-1.5 text-sm font-semibold text-[#E74C5E] bg-[#FAC8CC]
                                   border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition disabled:opacity-50"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deletingScenario && (
        <ConfirmDeleteModal
          title="確認要刪除此題庫？"
          message="此動作無法復原。"
          itemLabel={`${deletingScenario.status === 'draft' ? '草稿' : '已發布'}・${deletingScenario.title}`}
          isPending={deleteScenario.isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeletingScenario(null)}
        />
      )}
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
