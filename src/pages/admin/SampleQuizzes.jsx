import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { useAdminQuizzes, useToggleSampleQuiz } from '../../hooks/useAdminQuizzes';

/**
 * /admin/sample-quizzes — 範例題庫（spec-02 §3.9、spec-14）。
 *
 * - 列出所有教師建立的題組（跨教師）
 * - admin 可一鍵把任一題組標 / 取消「系統範例」
 * - 教師端 `QuestionImportDrawer` 會用 isSample 顯示徽章高亮
 *
 * W6 不支援 admin 從零建立題組（仍走教師端出題精靈）。
 */

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'sample', label: '系統範例' },
  { value: 'regular', label: '一般' },
];

function StatusPill({ status }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
        已發布
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309]">
      草稿
    </span>
  );
}

function SampleBadge({ isSample }) {
  if (!isSample) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1E40AF]">
      <span className="material-symbols-rounded text-sm">verified</span>
      系統範例
    </span>
  );
}

export default function SampleQuizzes() {
  const { data: quizzes = [], isLoading, error } = useAdminQuizzes();
  const { toast } = useToast();
  const toggleMut = useToggleSampleQuiz();
  const [filter, setFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  const items = useMemo(() => {
    let arr = quizzes;
    if (filter === 'sample') arr = arr.filter((q) => q.isSample);
    else if (filter === 'regular') arr = arr.filter((q) => !q.isSample);
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      arr = arr.filter((q) =>
        (q.title || '').toLowerCase().includes(k) ||
        (q.id || '').toLowerCase().includes(k) ||
        (q.createdByName || '').toLowerCase().includes(k),
      );
    }
    return arr;
  }, [quizzes, filter, keyword]);

  const counts = useMemo(() => ({
    total: quizzes.length,
    samples: quizzes.filter((q) => q.isSample).length,
  }), [quizzes]);

  const handleToggle = async (q) => {
    try {
      await toggleMut.mutateAsync({ id: q.id, isSample: !q.isSample });
      toast.success(q.isSample
        ? `已取消「${q.title}」的系統範例標記`
        : `已將「${q.title}」設為系統範例`);
    } catch (err) {
      toast.error(err?.message || '操作失敗');
    }
  };

  return (
    <AdminLayout title="範例題庫" breadcrumb="Dashboard / 範例題庫">
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex bg-[#F4F8F6] rounded-xl p-1">
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-white text-[#15803D] shadow-sm' : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg pointer-events-none">search</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜尋標題 / id / 教師"
            className="pl-9 pr-3 py-2 w-56 rounded-xl border border-[#E5E7EB] bg-white text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
          />
        </div>

        <div className="flex-1" />
        <span className="text-sm text-[#6B7280]">
          {isLoading ? '載入中…' : error ? '載入失敗' : `共 ${items.length} / ${counts.total} 份 · 系統範例 ${counts.samples}`}
        </span>
      </div>

      <div className="bg-[#FEF3C7] border border-[#FBBF24] rounded-xl px-4 py-3 mb-5 text-sm text-[#92400E]">
        <strong>📚 範例題庫</strong>：將品質良好的教師題組標為「系統範例」後，
        所有教師在出題精靈的「從題庫挑題」抽屜會看到藍色「系統範例」徽章高亮，方便引用為新題組的素材。
      </div>

      {/* 列表 */}
      {!isLoading && !error && (
        items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
            目前沒有符合條件的題組
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="bg-[#F4F8F6] text-[#6B7280] text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">題組</th>
                    <th className="text-left px-5 py-3 font-medium">建立教師</th>
                    <th className="text-left px-5 py-3 font-medium">節點</th>
                    <th className="text-left px-5 py-3 font-medium">題數</th>
                    <th className="text-left px-5 py-3 font-medium">狀態</th>
                    <th className="text-left px-5 py-3 font-medium">建立日期</th>
                    <th className="text-right px-5 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {items.map((q) => (
                    <tr key={q.id} className="hover:bg-[#F4F8F6]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium text-[#1F2937]">{q.title}</div>
                          <SampleBadge isSample={q.isSample} />
                        </div>
                        <div className="text-xs text-[#6B7280] font-mono mt-0.5">{q.id}</div>
                      </td>
                      <td className="px-5 py-3 text-[#4B5563]">
                        {q.createdByName || (q.createdBy ? <span className="font-mono">{q.createdBy}</span> : <span className="text-[#9CA3AF]">—</span>)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(q.knowledgeNodeIds || []).slice(0, 3).map((nid) => (
                            <span key={nid} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-[#F4F8F6] text-[#1F2937] border border-[#E5E7EB]">
                              {nid}
                            </span>
                          ))}
                          {(q.knowledgeNodeIds || []).length > 3 && (
                            <span className="text-[11px] text-[#6B7280]">+{q.knowledgeNodeIds.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#4B5563]">{q.questionCount}</td>
                      <td className="px-5 py-3"><StatusPill status={q.status} /></td>
                      <td className="px-5 py-3 text-[#4B5563] text-xs">{q.createdAt}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggle(q)}
                          disabled={toggleMut.isPending}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            q.isSample
                              ? 'border-[#E5E7EB] bg-white hover:bg-[#FEE2E2] text-[#B91C1C]'
                              : 'border-[#E5E7EB] bg-white hover:bg-[#DBEAFE] text-[#1E40AF]'
                          }`}
                        >
                          {q.isSample ? '取消範例' : '設為範例'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </AdminLayout>
  );
}
