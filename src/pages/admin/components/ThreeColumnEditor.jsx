import { useMemo, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import {
  useAdminParentNodes,
  useBulkReorderParentNodes,
  useCreateParentNode,
  useDeleteParentNode,
  useUpdateParentNode,
} from '../../../hooks/useAdminParentNodes';
import {
  useAdminKnowledgeNodes,
  useUpdateKnowledgeNode,
} from '../../../hooks/useAdminKnowledgeNodes';
import { useAdminUnits } from '../../../hooks/useAdminUnits';
import KnowledgeNodeEditPanel from './KnowledgeNodeEditPanel';
import GradeBandBadge from './GradeBandBadge';
import SortableList from './SortableList';

/**
 * 三欄式知識節點編輯器（W7a）。
 *
 * 左欄：次主題（單元）清單，可選擇與新增（透過 /admin/units 處理；此處只列）
 * 中欄：大節點（內容細目），依 display_order 拖曳排序；可新增 / 改名 / 刪除
 * 右欄：小節點（知識節點），依 learning_order 拖曳排序；只列當前選中的大節點下的節點
 *
 * 拖曳結束 debounced 300ms 寫回後端。
 */

const COL_HEADER = 'px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-2';
const COL_BODY = 'flex-1 overflow-y-auto p-3 space-y-1.5';

export default function ThreeColumnEditor({ units: unitsProp }) {
  const { toast } = useToast();
  const { data: unitsFallback = [] } = useAdminUnits();
  const units = unitsProp || unitsFallback;
  const activeUnits = useMemo(() => units.filter((u) => u.status === 'active'), [units]);

  const [unitId, setUnitId] = useState(() => activeUnits[0]?.id || '');
  // unitId 由 activeUnits 第一個提供初值；切換後可能 stale，這裡再保險一次：
  const effectiveUnitId = unitId && activeUnits.find((u) => u.id === unitId)
    ? unitId : (activeUnits[0]?.id || '');

  // ─────────── 大節點 ───────────
  const { data: parentNodes = [], refetch: refetchParents } = useAdminParentNodes({
    unitId: effectiveUnitId,
  });
  const reorderParentsMut = useBulkReorderParentNodes();
  const createParentMut = useCreateParentNode();
  const updateParentMut = useUpdateParentNode();
  const deleteParentMut = useDeleteParentNode();

  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const liveSelectedParent = parentNodes.find((p) => p.id === selectedParentId) || null;
  const effectiveSelectedParent = liveSelectedParent || parentNodes[0] || null;

  // ─────────── 小節點 ───────────
  const { data: childNodes = [], refetch: refetchChildren } = useAdminKnowledgeNodes(
    effectiveSelectedParent
      ? { unitId: effectiveUnitId }
      : { unitId: null, enabled: false },
  );
  const filteredChildren = useMemo(() => {
    if (!effectiveSelectedParent) return [];
    return childNodes
      .filter((n) => n.parentNodeId === effectiveSelectedParent.id)
      .sort((a, b) => (a.learningOrder ?? 0) - (b.learningOrder ?? 0));
  }, [childNodes, effectiveSelectedParent]);

  const updateChildMut = useUpdateKnowledgeNode();

  const liveSelectedChild = selectedChildId
    ? childNodes.find((n) => n.id === selectedChildId) || null
    : null;

  // ─────────── handler ───────────
  const handleParentReorder = async (newOrder) => {
    const items = newOrder.map((p, idx) => ({ id: p.id, displayOrder: idx + 1 }));
    try {
      await reorderParentsMut.mutateAsync(items);
    } catch (err) {
      toast.error(err?.message || '排序失敗');
    }
  };

  const handleChildReorder = async (newOrder) => {
    // 逐個更新 learning_order（dndkit 不支援 bulk，後端目前也沒提供 bulk endpoint）
    try {
      await Promise.all(
        newOrder.map((n, idx) =>
          updateChildMut.mutateAsync({ id: n.id, learningOrder: idx + 1 }),
        ),
      );
      refetchChildren();
    } catch (err) {
      toast.error(err?.message || '排序失敗');
    }
  };

  const handleAddParent = async () => {
    const code = window.prompt('輸入大節點編碼（例：INe-Ⅱ-3）：');
    if (!code?.trim()) return;
    const name = window.prompt('輸入大節點名稱：', code.trim()) || code.trim();
    try {
      await createParentMut.mutateAsync({
        unitId: effectiveUnitId,
        code: code.trim(),
        name: name.trim(),
      });
      toast.success('已新增大節點');
      refetchParents();
    } catch (err) {
      if (err?.code === 'PARENT_CODE_EXISTS') toast.error('此 code 在當前單元已存在');
      else toast.error(err?.message || '新增失敗');
    }
  };

  const handleRenameParent = async (p) => {
    const newName = window.prompt(`修改大節點「${p.code}」的名稱：`, p.name);
    if (!newName || newName === p.name) return;
    try {
      await updateParentMut.mutateAsync({ id: p.id, name: newName });
      toast.success('已更新大節點名稱');
    } catch (err) {
      toast.error(err?.message || '更新失敗');
    }
  };

  const handleDeleteParent = async (p) => {
    if (!window.confirm(`確定刪除大節點「${p.code} ${p.name}」？\n若還有小節點掛在此大節點下，刪除會失敗。`)) return;
    try {
      await deleteParentMut.mutateAsync(p.id);
      toast.success('已刪除大節點');
      if (selectedParentId === p.id) setSelectedParentId(null);
    } catch (err) {
      if (err?.code?.startsWith('PARENT_HAS_CHILDREN')) {
        const n = err.code.split(':')[1];
        toast.error(`此大節點還有 ${n} 個小節點，請先移走再刪除`);
      } else {
        toast.error(err?.message || '刪除失敗');
      }
    }
  };

  // ─────────── render ───────────
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] flex overflow-x-auto" style={{ minHeight: 520 }}>
      {/* 左欄：次主題 */}
      <div className="w-56 shrink-0 border-r border-[#E5E7EB] flex flex-col bg-[#F9FAFB]">
        <div className={COL_HEADER}>
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">次主題</div>
          <span className="text-[11px] text-[#9CA3AF]">{activeUnits.length}</span>
        </div>
        <div className={COL_BODY}>
          {activeUnits.map((u) => {
            const isSel = u.id === effectiveUnitId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => { setUnitId(u.id); setSelectedParentId(null); setSelectedChildId(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSel
                    ? 'bg-[#DCFCE7] text-[#15803D] font-semibold'
                    : 'text-[#4B5563] hover:bg-white border border-transparent hover:border-[#E5E7EB]'
                }`}
              >
                <div className="truncate">{u.name}</div>
                <div className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">{u.code}</div>
              </button>
            );
          })}
          {activeUnits.length === 0 && (
            <div className="px-3 py-4 text-xs text-[#9CA3AF]">尚無單元；請至「單元管理」建立</div>
          )}
        </div>
      </div>

      {/* 中欄：大節點 */}
      <div className="w-72 shrink-0 border-r border-[#E5E7EB] flex flex-col">
        <div className={COL_HEADER}>
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">大節點 / 內容細目</div>
          <button
            type="button"
            onClick={handleAddParent}
            disabled={!effectiveUnitId}
            className="text-xs text-[#15803D] hover:text-[#0F6F35] font-medium disabled:opacity-30"
          >
            + 新增
          </button>
        </div>
        <div className={COL_BODY}>
          {!effectiveUnitId && (
            <div className="px-3 py-4 text-xs text-[#9CA3AF]">請先選擇單元</div>
          )}
          {effectiveUnitId && parentNodes.length === 0 && (
            <div className="px-3 py-4 text-xs text-[#9CA3AF]">此單元尚無大節點，點上方「+ 新增」建立</div>
          )}
          {parentNodes.length > 0 && (
            <SortableList
              items={parentNodes}
              onReorder={handleParentReorder}
              renderItem={(p, { isDragging }) => {
                const isSel = effectiveSelectedParent?.id === p.id;
                return (
                  <div
                    className={`group flex items-start gap-2 px-2 py-2 rounded-lg border transition-colors ${
                      isSel
                        ? 'bg-[#DCFCE7] border-[#7DD3A8]'
                        : isDragging
                          ? 'bg-white border-[#7DD3A8] shadow-md'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    <span className="material-symbols-rounded text-[#9CA3AF] text-base cursor-grab shrink-0 mt-0.5" title="拖曳排序">drag_indicator</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedParentId(p.id); setSelectedChildId(null); }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono text-[#1F2937] font-semibold">{p.code}</span>
                        <GradeBandBadge code={p.code} />
                      </div>
                      <div className="text-xs text-[#4B5563] mt-0.5 line-clamp-2">{p.name}</div>
                    </button>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" onClick={() => handleRenameParent(p)}
                              className="text-[10px] text-[#1E40AF] hover:underline">改名</button>
                      <button type="button" onClick={() => handleDeleteParent(p)}
                              className="text-[10px] text-[#B91C1C] hover:underline">刪除</button>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* 第三欄：小節點 */}
      <div className={`flex flex-col ${liveSelectedChild ? 'w-72 shrink-0' : 'flex-1 min-w-[360px]'}`}>
        <div className={COL_HEADER}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-[#6B7280] shrink-0">小節點 / 知識節點</div>
            {effectiveSelectedParent && (
              <span className="text-[11px] font-mono text-[#15803D] truncate">@ {effectiveSelectedParent.code}</span>
            )}
          </div>
          <span className="text-[11px] text-[#9CA3AF] shrink-0">{filteredChildren.length}</span>
        </div>
        <div className={COL_BODY}>
          {!effectiveSelectedParent && (
            <div className="px-3 py-4 text-xs text-[#9CA3AF]">請先選擇大節點</div>
          )}
          {effectiveSelectedParent && filteredChildren.length === 0 && (
            <div className="px-3 py-4 text-xs text-[#9CA3AF]">
              此大節點下沒有小節點。<br />
              到「節點庫」或「未分配」分區把小節點 attach 到大節點，或從畫布視圖新增。
            </div>
          )}
          {filteredChildren.length > 0 && (
            <SortableList
              items={filteredChildren}
              onReorder={handleChildReorder}
              renderItem={(n, { isDragging }) => {
                const isSel = n.id === selectedChildId;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedChildId(n.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedChildId(n.id); }}
                    className={`flex items-start gap-2 px-2 py-2 rounded-lg border transition-colors cursor-pointer ${
                      isDragging
                        ? 'bg-white border-[#7DD3A8] shadow-md'
                        : isSel
                          ? 'bg-[#DCFCE7] border-[#7DD3A8]'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    <span className="material-symbols-rounded text-[#9CA3AF] text-base cursor-grab shrink-0 mt-0.5" title="拖曳排序">drag_indicator</span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      isSel ? 'bg-[#7DD3A8] text-white' : 'bg-[#F4F8F6] text-[#6B7280]'
                    }`}>
                      {n.learningOrder}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#1F2937]">{n.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs font-mono text-[#6B7280]">{n.id}</span>
                        <GradeBandBadge code={n.id} />
                      </div>
                    </div>
                    {n.onCanvas && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#E0E7FF] text-[#3730A3] shrink-0" title="已在畫布上">
                        畫布
                      </span>
                    )}
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* 第四欄：節點編輯面板 */}
      <KnowledgeNodeEditPanel
        node={liveSelectedChild}
        units={units}
        onClose={() => setSelectedChildId(null)}
      />
    </div>
  );
}
