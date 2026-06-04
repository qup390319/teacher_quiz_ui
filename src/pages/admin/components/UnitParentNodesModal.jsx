/**
 * 教學單元附掛大節點 modal（spec-02 §3.5 / spec-11 §3.21）。
 *
 * 左欄：所有大節點（依次主題分組、可搜尋），未綁的可勾選後一次新增
 * 右欄：本單元已綁的大節點清單，可逐筆移除
 */

import { useMemo, useState } from 'react';
import { useAdminParentNodes } from '../../../hooks/useAdminParentNodes';
import { useAdminUnits } from '../../../hooks/useAdminUnits';
import {
  useUnitParentNodes,
  useAttachUnitParentNodes,
  useDetachUnitParentNode,
} from '../../../hooks/useUnitParentNodes';
import { useToast } from '../../../context/ToastContext';

export default function UnitParentNodesModal({ unit, onClose }) {
  const { toast } = useToast();
  const { data: attached = [], isLoading: attachedLoading } = useUnitParentNodes(unit?.id);
  const { data: allParents = [], isLoading: parentsLoading } = useAdminParentNodes();
  const { data: subthemes = [] } = useAdminUnits({ type: 'subtheme' });
  const attachMut = useAttachUnitParentNodes(unit?.id);
  const detachMut = useDetachUnitParentNode(unit?.id);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [query, setQuery] = useState('');

  const attachedIds = useMemo(
    () => new Set(attached.map((a) => a.parentNodeId)),
    [attached],
  );

  const subthemeById = useMemo(
    () => new Map(subthemes.map((s) => [s.id, s])),
    [subthemes],
  );

  // 左欄：分組 → [{subtheme, parents: [...]}]
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map();
    for (const p of allParents) {
      if (q) {
        const hay = `${p.code} ${p.name}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = p.unitId ?? '__none__';
      if (!groups.has(key)) {
        const s = subthemeById.get(p.unitId);
        groups.set(key, {
          unitId: p.unitId,
          name: s?.name ?? '（未指派次主題）',
          parents: [],
        });
      }
      groups.get(key).parents.push(p);
    }
    return [...groups.values()]
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      .map((g) => ({ ...g, parents: g.parents.sort((a, b) => a.code.localeCompare(b.code)) }));
  }, [allParents, subthemeById, query]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAttach = () => {
    const ids = [...selectedIds].filter((id) => !attachedIds.has(id));
    if (ids.length === 0) return;
    attachMut.mutate(ids, {
      onSuccess: () => {
        toast.success(`已新增 ${ids.length} 個大節點`);
        setSelectedIds(new Set());
      },
      onError: (err) => toast.error(`新增失敗：${err?.message ?? '未知錯誤'}`),
    });
  };

  const handleDetach = (parentNodeId, code) => {
    detachMut.mutate(parentNodeId, {
      onSuccess: () => toast.success(`已移除「${code}」`),
      onError: (err) => toast.error(`移除失敗：${err?.message ?? '未知錯誤'}`),
    });
  };

  const selectableCount = [...selectedIds].filter((id) => !attachedIds.has(id)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !attachMut.isPending && !detachMut.isPending && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937]">
              管理大節點：{unit?.name}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              將課綱內容細目（大節點）綁定到這個教學單元
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1F2937] p-1"
            aria-label="關閉"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        {/* Body — 兩欄 */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 p-5">
          {/* 左欄：可選大節點 */}
          <div className="flex flex-col min-h-0 border border-[#E5E7EB] rounded-2xl">
            <div className="px-3 py-2 border-b border-[#E5E7EB] flex items-center gap-2">
              <span className="text-xs font-semibold text-[#4B5563]">所有大節點</span>
              <span className="text-[10px] text-[#9CA3AF]">({allParents.length})</span>
              <input
                type="search"
                placeholder="搜尋代碼或名稱…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-xs border border-[#E5E7EB] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {parentsLoading && (
                <div className="text-xs text-[#9CA3AF] text-center py-6">載入中…</div>
              )}
              {!parentsLoading && grouped.length === 0 && (
                <div className="text-xs text-[#9CA3AF] text-center py-6">
                  {query ? '沒有符合的大節點' : '尚無大節點資料'}
                </div>
              )}
              {grouped.map((g) => (
                <div key={g.unitId ?? '__none__'}>
                  <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide px-2 py-1">
                    {g.name}
                  </div>
                  <div className="space-y-1">
                    {g.parents.map((p) => {
                      const already = attachedIds.has(p.id);
                      const checked = selectedIds.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                            already ? 'bg-[#F3F4F6] text-[#9CA3AF]' : checked ? 'bg-[#DCFCE7]' : 'hover:bg-[#F4F8F6]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={already}
                            checked={checked || already}
                            onChange={() => toggleSelect(p.id)}
                            className="mt-0.5 accent-[#7DD3A8]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono font-semibold">{p.code}</div>
                            <div className="text-[#4B5563] line-clamp-2">{p.name}</div>
                          </div>
                          {already && (
                            <span className="text-[10px] font-medium text-[#15803D] shrink-0">已加入</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">已選 {selectableCount} 個</span>
              <button
                type="button"
                onClick={handleAttach}
                disabled={selectableCount === 0 || attachMut.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {attachMut.isPending ? '新增中…' : `新增到單元（${selectableCount}）`}
              </button>
            </div>
          </div>

          {/* 右欄：已綁定 */}
          <div className="flex flex-col min-h-0 border border-[#E5E7EB] rounded-2xl">
            <div className="px-3 py-2 border-b border-[#E5E7EB] flex items-center gap-2">
              <span className="text-xs font-semibold text-[#4B5563]">本單元已綁定</span>
              <span className="text-[10px] text-[#9CA3AF]">({attached.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {attachedLoading && (
                <div className="text-xs text-[#9CA3AF] text-center py-6">載入中…</div>
              )}
              {!attachedLoading && attached.length === 0 && (
                <div className="text-xs text-[#9CA3AF] text-center py-6">
                  尚未綁定任何大節點。從左側勾選後按「新增到單元」。
                </div>
              )}
              {attached.map((a) => (
                <div
                  key={a.parentNodeId}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs bg-white border border-[#E5E7EB]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-semibold text-[#1F2937]">{a.code}</div>
                    <div className="text-[#4B5563] line-clamp-2">{a.name}</div>
                    {a.subthemeName && (
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        次主題：{a.subthemeName}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDetach(a.parentNodeId, a.code)}
                    disabled={detachMut.isPending}
                    className="p-1 rounded text-[#9CA3AF] hover:text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-30"
                    title="從本單元移除"
                  >
                    <span className="material-symbols-rounded text-base">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border border-[#E5E7EB] text-[#1F2937] hover:bg-[#F4F8F6]"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
