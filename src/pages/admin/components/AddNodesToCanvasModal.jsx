import { useMemo, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import {
  useAdminKnowledgeNodes,
  useBulkSetCanvas,
} from '../../../hooks/useAdminKnowledgeNodes';

/**
 * 從節點庫挑選節點加入到當前單元畫布（W5c）。
 *
 * 列出：當前單元內、on_canvas=false 的所有節點。
 * 可多選 + 一鍵全選 / 全不選 + 關鍵字搜尋。
 */
export default function AddNodesToCanvasModal({ unitId, onClose, onAdded }) {
  const { data: nodes = [], isLoading } = useAdminKnowledgeNodes({
    unitId, onCanvas: false,
  });
  const bulkMut = useBulkSetCanvas();
  const { toast } = useToast();

  const [selected, setSelected] = useState(() => new Set());
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    if (!keyword.trim()) return nodes;
    const k = keyword.trim().toLowerCase();
    return nodes.filter((n) =>
      (n.name || '').toLowerCase().includes(k) ||
      (n.id || '').toLowerCase().includes(k) ||
      (n.parentCode || '').toLowerCase().includes(k),
    );
  }, [nodes, keyword]);

  const allFilteredSelected = filtered.length > 0 &&
    filtered.every((n) => selected.has(n.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((n) => next.delete(n.id));
      } else {
        filtered.forEach((n) => next.add(n.id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 依 parent_code 分組顯示（保持與未分配頁一致）
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((n) => {
      const key = n.parentCode || '(無大節點)';
      if (!map.has(key)) {
        map.set(key, {
          parentCode: n.parentCode,
          parentName: n.parentName,
          items: [],
        });
      }
      map.get(key).items.push(n);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.parentCode || '').localeCompare(b.parentCode || ''),
    );
  }, [filtered]);

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    try {
      await bulkMut.mutateAsync({
        nodeIds: Array.from(selected),
        onCanvas: true,
      });
      toast.success(`已將 ${selected.size} 個節點加入畫布`);
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || '操作失敗');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
      role="dialog" aria-modal="true" onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-[#E5E7EB] shadow-lg max-h-[80vh] flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#E5E7EB]">
          <h3 className="text-lg font-bold text-[#1F2937]">加入節點到畫布</h3>
          <p className="text-sm text-[#6B7280] mt-1">
            從目前單元的節點庫挑選要繪製到畫布上的節點。加入後可以拖曳定位、連線設定先備關係。
          </p>
        </div>

        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg pointer-events-none">search</span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋節點名稱 / ID / 大節點"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
            />
          </div>
          <button
            type="button"
            onClick={toggleAll}
            disabled={filtered.length === 0}
            className="px-3 py-2 rounded-xl text-sm font-medium border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-[#1F2937] disabled:opacity-50"
          >
            {allFilteredSelected ? '全部取消' : '全選'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && <div className="text-sm text-[#6B7280] py-12 text-center">載入中…</div>}
          {!isLoading && nodes.length === 0 && (
            <div className="text-sm text-[#6B7280] py-12 text-center">
              此單元的節點庫是空的。<br />
              請先用「新增節點」建立節點，或從「未分配」分區把節點指派到此單元。
            </div>
          )}
          {!isLoading && nodes.length > 0 && filtered.length === 0 && (
            <div className="text-sm text-[#6B7280] py-12 text-center">沒有符合搜尋條件的節點</div>
          )}
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.parentCode || '_none'}>
                <div className="text-xs uppercase tracking-wide text-[#6B7280] mb-2 flex items-center gap-2">
                  <span className="font-mono">{g.parentCode || '(無大節點)'}</span>
                  {g.parentName && <span className="text-[#9CA3AF]">· {g.parentName}</span>}
                  <span className="text-[#9CA3AF]">· {g.items.length} 個</span>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((n) => {
                    const isSel = selected.has(n.id);
                    return (
                      <label
                        key={n.id}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          isSel
                            ? 'border-[#7DD3A8] bg-[#F0FDF4]'
                            : 'border-[#E5E7EB] bg-white hover:bg-[#F4F8F6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(n.id)}
                          className="mt-0.5 w-4 h-4 accent-[#7DD3A8]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#1F2937] font-medium">{n.name}</div>
                          <div className="text-xs font-mono text-[#6B7280] mt-0.5">{n.id}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-[#E5E7EB] flex justify-between items-center">
          <div className="text-sm text-[#4B5563]">
            已選 <strong className="text-[#15803D]">{selected.size}</strong> 個 / 共 {filtered.length} 個
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={bulkMut.isPending}
              className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937] text-sm font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0 || bulkMut.isPending}
              className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white text-sm font-semibold disabled:opacity-50"
            >
              {bulkMut.isPending ? '加入中…' : `加入 ${selected.size} 個到畫布`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
