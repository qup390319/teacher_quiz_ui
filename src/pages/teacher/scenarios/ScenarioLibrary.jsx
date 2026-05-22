import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal';
import { useScenarios, useScenario, useDeleteScenario } from '../../../hooks/useScenarios';
import { resolveScenarioImage } from '../../../lib/scenarioImage';
import { useAssignments } from '../../../hooks/useAssignments';
import { useClasses } from '../../../hooks/useClasses';
import { knowledgeNodes } from '../../../data/knowledgeGraph';
import { useTour } from '../../../context/TourContext';
import { useToast } from '../../../context/ToastContext';
import { Icon } from '../../../components/ui/woodKit';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '題庫（已發布）' },
  { key: 'draft', label: '草稿' },
];

/* 概念釐清題組庫（spec-08 §5.1）
 * 列出全部概念釐清題組，可預覽題數 / 目標節點 / 目標迷思，並可編輯／新增。
 */
export default function ScenarioLibrary() {
  const navigate = useNavigate();
  const { startTour } = useTour();
  const { toast } = useToast();
  const { data: scenarioQuizzes = [], isLoading } = useScenarios();
  const { data: assignments = [] } = useAssignments();
  // 用空 filter（{}）拿全部班級（含已封存 / 其他學年），讓「已派班級」顯示
  // 能正確查到歷史派題對象（同 QuizLibrary 處理）。
  const { data: classes = [] } = useClasses({});
  const deleteScenario = useDeleteScenario();
  const [activeTab, setActiveTab] = useState('published');
  const [deletingScenario, setDeletingScenario] = useState(null);
  const [previewScenario, setPreviewScenario] = useState(null);

  const confirmDelete = async () => {
    if (!deletingScenario) return;
    try {
      await deleteScenario.mutateAsync(deletingScenario.id);
      toast.success('概念釐清題組已刪除');
      setDeletingScenario(null);
    } catch (err) {
      console.error('[ScenarioLibrary] failed to delete', err);
      toast.error('刪除概念釐清題組失敗：' + (err?.message ?? '未知錯誤'));
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
        <div data-tour="scenario-library-header" className="flex flex-wrap items-start justify-between mb-3 gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">概念釐清出題</h1>
              <button
                type="button"
                onClick={() => startTour('scenario-library')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                title="瞭解功能"
              >
                <Icon name="tour" className="text-base" />操作導覽
              </button>
            </div>
            <p className="text-[#636E72] mt-1 text-sm">
              概念釐清題組以「論證情境 + AI 對話」進行。流程：建立概念釐清題組 → 派發給班級 → 學生與 AI 對話 → 教��查紀錄。
            </p>
          </div>
          <button
            data-tour="scenario-create-btn"
            type="button"
            disabled
            title="目前未開放此功能"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E5E7E8] text-[#95A5A6] border border-[#D5D8DC] rounded-2xl
                       text-sm font-semibold cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增概念釐清題組
          </button>
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
                  <span className={`ml-1.5 text-sm px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-[#E0F0E8] text-[#3F8B5E]' : 'bg-[#EEF5E6] text-[#95A5A6]'
                  }`}>
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 概念釐清題組列表 */}
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
              {activeTab === 'draft' ? '目前沒有草稿' : '題庫尚未有已發布的概念釐清題組'}
            </p>
            <p className="text-sm text-[#95A5A6] mt-1">
              {activeTab === 'draft' ? '建立概念釐清題組時可先儲存為草稿' : '建立完概念釐清題組後按發布即可加入題庫'}
            </p>
          </div>
        ) : (
          <div data-tour="scenario-cards-list" className="space-y-4">
            {visibleScenarios.map((sq, sqIdx) => {
              const targetNode = knowledgeNodes.find((n) => n.id === sq.targetNodeId);
              const assignedClasses = getAssignedClasses(sq.id);
              return (
                <div
                  key={sq.id}
                  data-tour={sqIdx === 0 ? 'scenario-card-first' : undefined}
                  className="bg-white rounded-[24px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]
                             hover:border-[#5BA47A] hover:shadow-[0_4px_16px_rgba(63,139,94,0.18)] transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 標題列 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F0E8]
                                         border border-[#3F8B5E] text-[#2E6B47] text-sm font-bold">
                          🌱 概念釐清
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold
                                     ${sq.status === 'published'
                                       ? 'bg-[#C8EAAE] text-[#2F4A1A]'
                                       : 'bg-[#FCF0C2] text-[#7A5232]'}`}
                        >
                          {sq.status === 'published' ? '已發佈' : '草稿'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#2D3436] mb-1">{sq.title}</h3>
                      <p className="text-sm text-[#95A5A6] mb-3">
                        建立於 {sq.createdAt} · 共 {sq.questionCount} 題概念釐清
                      </p>

                      {/* 目標節點 */}
                      {targetNode && (
                        <div className="mb-3">
                          <p className="text-sm text-[#636E72] mb-1">目標節點</p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF5E6] border border-[#5BA47A]
                                           text-[#3F8B5E] text-sm font-bold">
                            {targetNode.id}・{targetNode.name}
                          </span>
                        </div>
                      )}

                      {/* 目標迷思 */}
                      {sq.targetMisconceptions?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-[#636E72] mb-1">目標迷思</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sq.targetMisconceptions.map((mid) => (
                              <span
                                key={mid}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFF1D8]
                                           border border-[#F0B962] text-[#7A4A18] text-sm font-mono"
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
                          <p className="text-sm text-[#636E72] mb-1">已派發給</p>
                          <div className="flex flex-wrap gap-1.5">
                            {assignedClasses.map((c) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-full text-sm font-semibold border"
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
                        onClick={() => setPreviewScenario(sq)}
                        className="px-4 py-1.5 text-sm font-semibold text-[#1F6FAB] bg-white border border-[#5DADE2]
                                   rounded-xl hover:bg-[#D6EAF8] transition"
                      >
                        預覽
                      </button>
                      <button
                        type="button"
                        disabled
                        title="目前未開放此功能"
                        className="px-4 py-1.5 text-sm font-semibold text-[#95A5A6] bg-[#E5E7E8] border border-[#D5D8DC]
                                   rounded-xl cursor-not-allowed"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/teacher/assignments/scenarios')}
                        className="px-4 py-1.5 text-sm font-semibold text-white bg-[#5BA47A]
                                   border border-[#3F8B5E] rounded-xl hover:bg-[#3F8B5E] transition"
                      >
                        派發
                      </button>
                      <button
                        type="button"
                        disabled
                        title="目前未開放此功能"
                        className="px-4 py-1.5 text-sm font-semibold text-[#95A5A6] bg-[#E5E7E8]
                                   border border-[#D5D8DC] rounded-xl cursor-not-allowed"
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

      {previewScenario && (
        <ScenarioPreviewModal
          scenario={previewScenario}
          onClose={() => setPreviewScenario(null)}
        />
      )}
    </TeacherLayout>
  );
}

function ScenarioPreviewModal({ scenario, onClose }) {
  // 列表 API 不含 questions[]，需單獨抓單筆詳情
  const { data: fullScenario, isLoading } = useScenario(scenario.id);
  const data = fullScenario ?? scenario;
  const targetNode = knowledgeNodes.find((n) => n.id === data.targetNodeId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_8px_32px_rgba(0,0,0,0.18)] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#E1E6E2] bg-[#F1F6EE]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E0F0E8] border border-[#3F8B5E] text-[#2E6B47] text-sm font-bold">
                🌱 概念釐清題組
              </span>
              <span className="text-sm text-[#95A5A6]">{data.questions?.length ?? data.questionCount ?? 0} 題</span>
            </div>
            <h2 className="text-lg font-bold text-[#2D3436]">{data.title}</h2>
            {targetNode && (
              <p className="text-sm text-[#636E72] mt-1">
                目標節點：<span className="font-mono">{targetNode.id}</span>・{targetNode.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#636E72] hover:bg-[#E5E7E8] transition-colors flex-shrink-0"
            aria-label="關閉預覽"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && (
            <p className="text-sm text-[#95A5A6] text-center py-4">載入題目內容中…</p>
          )}
          {!isLoading && (data.questions?.length ?? 0) === 0 && (
            <p className="text-sm text-[#95A5A6] text-center py-4">此題組尚無題目內容</p>
          )}
          {(data.questions ?? []).map((q, idx) => (
            <div key={q.index ?? idx} className="border border-[#E1E6E2] rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[#F1F6EE] border-b border-[#E1E6E2] flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#5C8A2E] text-white text-sm font-bold">{idx + 1}</span>
                <p className="text-sm font-bold text-[#2D3436]">{q.title || `論證議題 ${idx + 1}`}</p>
                {q.targetMisconceptions?.length > 0 && (
                  <div className="ml-auto flex items-center gap-1 flex-wrap">
                    <span className="text-[15px] text-[#95A5A6]">目標迷思：</span>
                    {q.targetMisconceptions.map((mid) => (
                      <span key={mid} className="inline-flex items-center px-1.5 py-px rounded bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-[15px] font-mono">{mid}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[#5A6663] mb-1">📖 情境</p>
                  <p className="text-sm text-[#2D3436] leading-relaxed whitespace-pre-line">{q.scenarioText}</p>
                </div>
                {q.scenarioImages?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#5A6663] mb-1.5">🖼️ 情境圖片</p>
                    <div className={`grid gap-2 ${q.scenarioImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {q.scenarioImages.map((src, i) => {
                        const resolved = resolveScenarioImage(src);
                        return (
                          <a
                            key={i}
                            href={resolved}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg border border-[#E1E6E2] overflow-hidden hover:border-[#5BA47A] hover:shadow-md transition-all bg-[#FAFBFC]"
                            title="點擊以新分頁查看大圖"
                          >
                            <img src={resolved} alt={`情境圖 ${i + 1}`} className="w-full h-auto max-h-64 object-contain" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {q.initialMessage && (
                  <div>
                    <p className="text-sm font-semibold text-[#5A6663] mb-1">💬 AI 起手提問</p>
                    <div className="bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg px-3 py-2 text-sm text-[#2D3436]">{q.initialMessage}</div>
                  </div>
                )}
                {q.expertModel && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-semibold text-[#5A6663] inline-flex items-center gap-1 list-none [&::-webkit-details-marker]:hidden">
                      <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      🎯 專家示範（學生答錯時 AI 會引用）
                    </summary>
                    <div className="mt-2 bg-[#FFF1D8] border border-[#F0B962] rounded-lg px-3 py-2 text-sm text-[#7A4A18] leading-relaxed">
                      {q.expertModel}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-[#E1E6E2] bg-[#F8FAF6] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#C8D6C9] text-sm font-semibold text-[#2D3436] hover:bg-[#F1F6EE] transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
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
      <p className="text-[#636E72] font-medium">還沒有概念釐清題組</p>
      <p className="text-sm text-[#95A5A6] mt-1 mb-4">概念��清題組讓 AI 用「論證對話」引導學生釐清迷思</p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5BA47A] text-white rounded-2xl text-sm font-semibold
                   hover:bg-[#3F8B5E] transition shadow-[0_2px_8px_rgba(63,139,94,0.3)]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        建立第一份概念釐清題組
      </button>
    </div>
  );
}
