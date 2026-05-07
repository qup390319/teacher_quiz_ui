import { useEffect, useMemo, useState } from 'react';
import { useQuizzes } from '../../../hooks/useQuizzes';
import { api } from '../../../lib/api';
import { getNodeById } from '../../../data/knowledgeGraph';

/**
 * 從題庫挑題抽屜（右側 slide-over）。
 * - 列出所有 quizzes，展開後 lazy 載入該 quiz 的 questions
 * - 預設過濾「與 selectedNodeIds 有交集」的考卷；可切換顯示全部
 * - 勾選的題目以 deep clone append 到當前 quizQuestions（呼叫端負責重新編號）
 */
export default function QuestionImportDrawer({
  selectedNodeIds,
  excludeQuizId,
  onImport,
  onClose,
}) {
  const { data: quizzes = [], isLoading } = useQuizzes();
  const [showAll, setShowAll] = useState(false);
  const [expandedQuizIds, setExpandedQuizIds] = useState(new Set());
  const [quizDetails, setQuizDetails] = useState({});  // { quizId: detail }
  const [loadingQuizIds, setLoadingQuizIds] = useState(new Set());
  /** 勾選狀態：{ quizId: { questionId: cloneOfQuestion } } */
  const [picked, setPicked] = useState({});

  const filteredQuizzes = useMemo(() => {
    return quizzes
      .filter((q) => q.id !== excludeQuizId)
      .filter((q) => {
        if (showAll) return true;
        if (!selectedNodeIds || selectedNodeIds.length === 0) return true;
        return q.knowledgeNodeIds.some((id) => selectedNodeIds.includes(id));
      });
  }, [quizzes, excludeQuizId, showAll, selectedNodeIds]);

  const toggleExpand = async (quizId) => {
    setExpandedQuizIds((prev) => {
      const next = new Set(prev);
      if (next.has(quizId)) next.delete(quizId);
      else next.add(quizId);
      return next;
    });
    if (!quizDetails[quizId] && !loadingQuizIds.has(quizId)) {
      setLoadingQuizIds((prev) => new Set(prev).add(quizId));
      try {
        const detail = await api.get(`/quizzes/${quizId}`);
        setQuizDetails((prev) => ({ ...prev, [quizId]: detail }));
      } catch (err) {
        console.error('[QuestionImportDrawer] failed to load detail', err);
      } finally {
        setLoadingQuizIds((prev) => {
          const next = new Set(prev);
          next.delete(quizId);
          return next;
        });
      }
    }
  };

  const toggleQuestion = (quizId, question) => {
    setPicked((prev) => {
      const quizPicked = { ...(prev[quizId] || {}) };
      if (quizPicked[question.id]) {
        delete quizPicked[question.id];
      } else {
        quizPicked[question.id] = JSON.parse(JSON.stringify(question));
      }
      return { ...prev, [quizId]: quizPicked };
    });
  };

  const totalPicked = Object.values(picked)
    .reduce((sum, qMap) => sum + Object.keys(qMap).length, 0);

  const handleImport = () => {
    const flat = [];
    Object.values(picked).forEach((qMap) => {
      Object.values(qMap).forEach((q) => flat.push(q));
    });
    if (flat.length === 0) return;
    onImport(flat);
  };

  // ESC 關閉
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose}></div>
      <div className="w-full max-w-xl bg-white border-l border-[#BDC3C7] shadow-[-4px_0_20px_rgba(0,0,0,0.08)] flex flex-col">
        <div className="px-5 py-4 border-b border-[#D5D8DC] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-[#2D3436]">從題庫挑題</h3>
            <p className="text-xs text-[#636E72] mt-0.5">展開考卷、勾選題目，匯入後可再編輯</p>
          </div>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#D5D8DC] flex items-center gap-3 flex-shrink-0 bg-[#EEF5E6]">
          <label className="flex items-center gap-2 text-sm text-[#636E72] cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-4 h-4 accent-[#8FC87A]"
            />
            顯示全部考卷（不限當前選中的節點）
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && <p className="text-sm text-[#95A5A6]">載入中…</p>}
          {!isLoading && filteredQuizzes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-[#95A5A6]">
                {showAll ? '題庫中沒有可挑選的考卷' : '沒有與當前節點相關的考卷，可勾選「顯示全部」查看其他考卷'}
              </p>
            </div>
          )}
          <div className="space-y-2">
            {filteredQuizzes.map((quiz) => {
              const expanded = expandedQuizIds.has(quiz.id);
              const detail = quizDetails[quiz.id];
              const loading = loadingQuizIds.has(quiz.id);
              const pickedInQuiz = picked[quiz.id] || {};
              const pickedCount = Object.keys(pickedInQuiz).length;
              return (
                <div key={quiz.id} className="border border-[#D5D8DC] rounded-xl bg-white">
                  <button
                    type="button"
                    onClick={() => toggleExpand(quiz.id)}
                    className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-[#EEF5E6] transition-colors rounded-xl"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${quiz.status === 'draft' ? 'bg-[#FCF0C2] text-[#B7950B]' : 'bg-[#C8EAAE] text-[#3D5A3E]'}`}>
                          {quiz.status === 'draft' ? '草稿' : '已發布'}
                        </span>
                        <p className="text-sm font-semibold text-[#2D3436] truncate">{quiz.title}</p>
                      </div>
                      <p className="text-xs text-[#95A5A6] mt-0.5">{quiz.questionCount} 題 · {quiz.knowledgeNodeIds.length} 節點</p>
                    </div>
                    {pickedCount > 0 && (
                      <span className="text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] px-2 py-0.5 rounded-full">
                        已勾 {pickedCount}
                      </span>
                    )}
                    <svg className={`w-4 h-4 text-[#95A5A6] flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 border-t border-[#D5D8DC] pt-2">
                      {loading && <p className="text-xs text-[#95A5A6] py-2">載入題目中…</p>}
                      {!loading && detail && detail.questions.length === 0 && (
                        <p className="text-xs text-[#95A5A6] py-2">此考卷沒有題目</p>
                      )}
                      {!loading && detail && detail.questions.map((q) => {
                        const node = getNodeById(q.knowledgeNodeId);
                        const isPicked = !!pickedInQuiz[q.id];
                        return (
                          <label
                            key={q.id}
                            className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isPicked ? 'bg-[#C8EAAE] border border-[#8FC87A]' : 'hover:bg-[#EEF5E6] border border-transparent'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={() => toggleQuestion(quiz.id, q)}
                              className="mt-0.5 w-4 h-4 accent-[#8FC87A]"
                            />
                            <div className="flex-1 min-w-0">
                              {node && (
                                <p className="text-[10px] font-mono text-[#95A5A6] mb-0.5">{node.id} · {node.name}</p>
                              )}
                              <p className="text-xs text-[#2D3436] leading-snug">{q.stem}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#D5D8DC] bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-[#636E72]">
            已勾選 <span className="font-bold text-[#2D3436]">{totalPicked}</span> 題
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6]"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={totalPicked === 0}
              className="px-5 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              匯入 {totalPicked > 0 ? `${totalPicked} 題` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
