import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import {
  useAdminKnowledgeNodes,
  useBulkAssignUnit,
  useBulkSetCanvas,
} from '../../hooks/useAdminKnowledgeNodes';
import { useAdminUnits } from '../../hooks/useAdminUnits';
import AddNodesToCanvasModal from './components/AddNodesToCanvasModal';
import AutoLayoutButton from './components/AutoLayoutButton';
import CanvasNodeListPanel from './components/CanvasNodeListPanel';
import KnowledgeNodeCanvas from './components/KnowledgeNodeCanvas';
import NewKnowledgeNodeModal from './components/NewKnowledgeNodeModal';
import ThreeColumnEditor from './components/ThreeColumnEditor';

const UNASSIGNED_GRADE_FILTERS = [
  { value: 'all', label: '全部年段' },
  { value: 'lower', label: '低年級' },
  { value: 'middle', label: '中年級' },
  { value: 'upper', label: '高年級' },
];

const UNASSIGNED_SORTS = [
  { value: 'parent_asc', label: '大節點編碼 A→Z' },
  { value: 'parent_desc', label: '大節點編碼 Z→A' },
  { value: 'count_desc', label: '小節點數 多→少' },
  { value: 'count_asc', label: '小節點數 少→多' },
  { value: 'grade_then_parent', label: '年段 低→高、再依編碼' },
];

/**
 * /admin/knowledge-nodes — 知識節點管理（spec-02 §3.8、spec-14）。
 *
 * 三個視圖：
 *   1. 階層結構：次主題→大節點→小節點 三欄 + 編輯面板
 *   2. 知識節點畫布：選一個次主題，純拓撲編輯（拖曳定位 + 拉線先備關係）；
 *      未上畫布的節點透過工具列「加入節點」modal 加入
 *   3. 未分配：以大節點分組，批次指派到次主題
 */

const VIEW_TABS = [
  { value: 'structure', label: '階層結構', icon: 'list_alt' },
  { value: 'canvas', label: '知識節點畫布', icon: 'account_tree' },
  { value: 'unassigned', label: '未分配', icon: 'inbox' },
];

function UnassignedView({ nodes, units, onChanged }) {
  const { toast } = useToast();
  const bulkAssignMut = useBulkAssignUnit();

  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('parent_asc');
  const [keyword, setKeyword] = useState('');

  // 依大節點分組（先依篩選 + 排序處理）
  const groups = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const filteredNodes = nodes.filter((n) => {
      if (gradeFilter !== 'all' && n.gradeBand !== gradeFilter) return false;
      if (k) {
        const hay = `${n.parentCode || ''} ${n.parentName || ''} ${n.name || ''} ${n.id || ''}`.toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });

    const map = new Map();
    filteredNodes.forEach((n) => {
      const key = n.parentCode || '(無大節點)';
      if (!map.has(key)) {
        map.set(key, {
          parentCode: n.parentCode,
          parentName: n.parentName,
          gradeBand: n.gradeBand,
          items: [],
        });
      }
      map.get(key).items.push(n);
    });

    const arr = Array.from(map.values());
    const GRADE_ORDER = { lower: 0, middle: 1, upper: 2 };
    const byParentAsc = (a, b) => (a.parentCode || '').localeCompare(b.parentCode || '');

    switch (sortBy) {
      case 'parent_desc':
        arr.sort((a, b) => (b.parentCode || '').localeCompare(a.parentCode || ''));
        break;
      case 'count_desc':
        arr.sort((a, b) => b.items.length - a.items.length || byParentAsc(a, b));
        break;
      case 'count_asc':
        arr.sort((a, b) => a.items.length - b.items.length || byParentAsc(a, b));
        break;
      case 'grade_then_parent':
        arr.sort((a, b) => {
          const ga = GRADE_ORDER[a.gradeBand] ?? 9;
          const gb = GRADE_ORDER[b.gradeBand] ?? 9;
          return ga - gb || byParentAsc(a, b);
        });
        break;
      case 'parent_asc':
      default:
        arr.sort(byParentAsc);
    }
    return arr;
  }, [nodes, gradeFilter, sortBy, keyword]);

  const totalFiltered = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  if (nodes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
        目前沒有未分配的節點。
      </div>
    );
  }

  const assignGroup = async (group, unitId) => {
    if (!unitId) return;
    try {
      await bulkAssignMut.mutateAsync({
        nodeIds: group.items.map((n) => n.id),
        unitId,
      });
      toast.success(`已將 ${group.items.length} 個節點指派到 ${units.find((u) => u.id === unitId)?.name}`);
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || '指派失敗');
    }
  };

  return (
    <div className="space-y-4">
      {/* 工具列：搜尋 + 年段篩選 + 排序 */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg pointer-events-none">search</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜尋大節點 / 小節點 / 名稱"
            className="pl-9 pr-3 py-2 w-64 rounded-xl border border-[#E5E7EB] bg-white text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
        >
          {UNASSIGNED_GRADE_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
        >
          {UNASSIGNED_SORTS.map((o) => <option key={o.value} value={o.value}>排序：{o.label}</option>)}
        </select>
        {(gradeFilter !== 'all' || keyword.trim() || sortBy !== 'parent_asc') && (
          <button
            type="button"
            onClick={() => { setGradeFilter('all'); setKeyword(''); setSortBy('parent_asc'); }}
            className="text-xs text-[#6B7280] hover:text-[#1F2937] underline"
          >
            重設
          </button>
        )}
        <div className="flex-1" />
        <div className="text-sm text-[#4B5563]">
          顯示 <strong>{totalFiltered}</strong> / {nodes.length} 個節點 · <strong>{groups.length}</strong> 個大節點群
        </div>
      </div>

      {groups.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
          沒有符合篩選條件的節點
        </div>
      )}

      {groups.map((g) => (
        <div key={g.parentCode || '_none'} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#1F2937] font-mono mb-0.5">{g.parentCode || '(無大節點)'}</div>
              {g.parentName && <div className="text-xs text-[#4B5563] mb-2">{g.parentName}</div>}
              <div className="text-xs text-[#6B7280]">{g.items.length} 個小節點 · {g.gradeBand === 'middle' ? '中年級' : g.gradeBand === 'upper' ? '高年級' : '低年級'}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) { assignGroup(g, e.target.value); e.target.value = ''; } }}
                className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-sm bg-white max-w-[220px]"
              >
                <option value="">指派到單元…</option>
                {/* 同年段優先（不加標籤），其他年段加標籤提醒 admin */}
                {units
                  .filter((u) => u.status === 'active')
                  .sort((a, b) => {
                    const aMatch = a.gradeBand === g.gradeBand ? 0 : 1;
                    const bMatch = b.gradeBand === g.gradeBand ? 0 : 1;
                    return aMatch - bMatch || (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
                  })
                  .map((u) => {
                    const sameBand = u.gradeBand === g.gradeBand;
                    const bandLabel = u.gradeBand === 'middle' ? '中' : u.gradeBand === 'upper' ? '高' : '低';
                    return (
                      <option key={u.id} value={u.id}>
                        {sameBand ? u.name : `[${bandLabel}] ${u.name}`}
                      </option>
                    );
                  })}
                {units.filter((u) => u.status === 'active').length === 0 && (
                  <option value="" disabled>沒有可用的單元，請先到「單元管理」建立</option>
                )}
              </select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {g.items.slice(0, 12).map((n) => (
              <span key={n.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[#F4F8F6] text-[#1F2937] border border-[#E5E7EB] font-mono">
                {n.id}
              </span>
            ))}
            {g.items.length > 12 && (
              <span className="text-xs text-[#6B7280]">…還有 {g.items.length - 12} 個</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function KnowledgeNodesAdmin() {
  const [view, setView] = useState('structure');
  const [unitId, setUnitId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddToCanvasModal, setShowAddToCanvasModal] = useState(false);
  const { toast } = useToast();

  const { data: units = [] } = useAdminUnits({ type: 'subtheme' });
  // 次主題依英文編號（code，如 Aa→Ab→Ba…）排序，方便對照課綱
  const activeUnits = useMemo(
    () => units
      .filter((u) => u.status === 'active')
      .sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name)),
    [units],
  );
  const effectiveUnitId = unitId && activeUnits.find((u) => u.id === unitId)
    ? unitId : (activeUnits[0]?.id || '');

  // W5c：畫布只顯示已加入畫布的節點
  const { data: canvasNodes = [], refetch: refetchCanvas } = useAdminKnowledgeNodes(
    view === 'canvas' && effectiveUnitId ? { unitId: effectiveUnitId, onCanvas: true } : { unitId: null, enabled: false },
  );
  // 節點庫（在單元內但未上畫布）— 用於畫布工具列「加入節點」的計數提示與空畫布說明
  const needLibrary = view === 'canvas' && !!effectiveUnitId;
  const { data: libraryNodes = [], refetch: refetchLibrary } = useAdminKnowledgeNodes(
    needLibrary ? { unitId: effectiveUnitId, onCanvas: false } : { unitId: null, enabled: false },
  );
  const { data: unassignedNodes = [], refetch: refetchUnassigned } = useAdminKnowledgeNodes(
    view === 'unassigned' ? { unassigned: true } : { unassigned: true, enabled: false },
  );

  // 自動排版：算好的座標即時交給畫布套用（不等 DB 來回）
  const [appliedLayout, setAppliedLayout] = useState(null); // { positions, nonce }
  // 左側清單面板：聚焦畫布節點 + 從節點庫快速加入畫布
  const [focusNode, setFocusNode] = useState(null); // { id, nonce }
  const setCanvasMut = useBulkSetCanvas();
  const [addingId, setAddingId] = useState(null);
  const handleQuickAdd = async (nodeId) => {
    setAddingId(nodeId);
    try {
      await setCanvasMut.mutateAsync({ nodeIds: [nodeId], onCanvas: true });
      refetchCanvas();
      refetchLibrary();
    } catch (err) {
      toast.error(err?.message || '加入畫布失敗');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <AdminLayout title="知識節點" breadcrumb="Dashboard / 知識節點">
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex bg-[#F4F8F6] rounded-xl p-1">
          {VIEW_TABS.map((t) => {
            const active = view === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setView(t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  active ? 'bg-white text-[#15803D] shadow-sm' : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
              >
                <span className="material-symbols-rounded text-base">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {view === 'canvas' && (
          <select
            value={effectiveUnitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
          >
            {activeUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        {view === 'canvas' && (
          <AutoLayoutButton
            rawNodes={canvasNodes}
            onApplied={(positions) => {
              setAppliedLayout((prev) => ({ positions, nonce: (prev?.nonce ?? 0) + 1 }));
              toast.success('已自動排版');
            }}
          />
        )}

        <div className="flex-1" />

        {view === 'canvas' && (
          <button
            type="button"
            onClick={() => setShowAddToCanvasModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#7DD3A8] bg-white hover:bg-[#F0FDF4] text-sm font-medium text-[#15803D]"
          >
            <span className="material-symbols-rounded text-base">playlist_add</span>
            加入節點
            {libraryNodes.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold">
                {libraryNodes.length}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold text-sm"
        >
          <span className="material-symbols-rounded text-base">add</span>
          新增節點
        </button>
      </div>

      {/* 主內容 */}
      {view === 'canvas' && (
        <div className="flex gap-3 items-stretch">
          <CanvasNodeListPanel
            canvasNodes={canvasNodes}
            libraryNodes={libraryNodes}
            addingId={addingId}
            onQuickAdd={handleQuickAdd}
            onFocusNode={(id) => setFocusNode({ id, nonce: (focusNode?.nonce ?? 0) + 1 })}
          />
          <div className="flex-1 min-w-0">
            {canvasNodes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
                畫布上還沒有節點。
                {libraryNodes.length > 0 ? (
                  <>
                    <br />
                    此次主題的節點庫有 <strong className="text-[#15803D]">{libraryNodes.length}</strong> 個節點待加入畫布；
                    點左側清單的節點或上方<strong className="text-[#15803D]">「加入節點」</strong>按鈕加入。
                  </>
                ) : (
                  <>
                    <br />
                    先用「新增節點」建立節點，或從「未分配」分區把節點指派到此次主題，再加到畫布。
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
                <KnowledgeNodeCanvas nodes={canvasNodes} focusNode={focusNode} appliedLayout={appliedLayout} />
              </div>
            )}
          </div>
        </div>
      )}
      {view === 'unassigned' && (
        <UnassignedView nodes={unassignedNodes} units={units} onChanged={refetchUnassigned} />
      )}
      {view === 'structure' && (
        <ThreeColumnEditor units={units} />
      )}

      {showCreateModal && (
        <NewKnowledgeNodeModal
          units={units}
          defaultUnitId={view === 'canvas' ? effectiveUnitId : ''}
          defaultGradeBand={activeUnits.find((u) => u.id === effectiveUnitId)?.gradeBand || 'upper'}
          onClose={() => setShowCreateModal(false)}
          onCreated={(n) => toast.success(`已新增節點「${n.name}」到節點庫；點「加入節點」可放上畫布`)}
        />
      )}

{showAddToCanvasModal && (
        <AddNodesToCanvasModal
          unitId={effectiveUnitId}
          onClose={() => setShowAddToCanvasModal(false)}
          onAdded={() => { refetchCanvas(); refetchLibrary(); }}
        />
      )}

    </AdminLayout>
  );
}
