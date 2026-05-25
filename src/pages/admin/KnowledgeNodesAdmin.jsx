import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import {
  useAdminKnowledgeNodes,
  useBulkAssignUnit,
} from '../../hooks/useAdminKnowledgeNodes';
import { useAdminUnits } from '../../hooks/useAdminUnits';
import AddNodesToCanvasModal from './components/AddNodesToCanvasModal';
import AutoLayoutButton from './components/AutoLayoutButton';
import KnowledgeNodeCanvas from './components/KnowledgeNodeCanvas';
import KnowledgeNodeEditPanel from './components/KnowledgeNodeEditPanel';
import NewKnowledgeNodeModal from './components/NewKnowledgeNodeModal';
import NodeExcelImportModal from './components/NodeExcelImportModal';

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
 *   1. 單元畫布：選一個單元，看其節點 + 先備關係，可拖曳 / 連線編輯
 *   2. 未分配：以大節點 (parent_code) 分組，批次指派到單元
 *   3. Excel 匯入：上傳「整合-知識節點大全」一次匯入多筆
 */

const VIEW_TABS = [
  { value: 'canvas', label: '單元畫布', icon: 'account_tree' },
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
        目前沒有未分配的節點。從上方「Excel 匯入」可一次加入大量節點。
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
  const [view, setView] = useState('canvas');
  const [unitId, setUnitId] = useState('unit-water-solution');
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddToCanvasModal, setShowAddToCanvasModal] = useState(false);
  const { toast } = useToast();

  const { data: units = [] } = useAdminUnits();
  // W5c：畫布只顯示已加入畫布的節點
  const { data: canvasNodes = [], refetch: refetchCanvas } = useAdminKnowledgeNodes(
    view === 'canvas' ? { unitId, onCanvas: true } : { unitId: null, enabled: false },
  );
  // 節點庫（在單元內但未上畫布）— 用於計數提示
  const { data: libraryNodes = [] } = useAdminKnowledgeNodes(
    view === 'canvas' && unitId ? { unitId, onCanvas: false } : { unitId: null, enabled: false },
  );
  const { data: unassignedNodes = [], refetch: refetchUnassigned } = useAdminKnowledgeNodes(
    view === 'unassigned' ? { unassigned: true } : { unassigned: true, enabled: false },
  );

  // 重新查詢時若選中節點還在，更新其資料；否則清空
  const liveSelectedNode = selectedNode
    ? canvasNodes.find((n) => n.id === selectedNode.id) || null
    : null;

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
                onClick={() => { setView(t.value); setSelectedNode(null); }}
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
          <>
            <select
              value={unitId}
              onChange={(e) => { setUnitId(e.target.value); setSelectedNode(null); }}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
            >
              {units.filter((u) => u.status === 'active').map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <AutoLayoutButton rawNodes={canvasNodes} onApplied={() => { refetchCanvas(); toast.success('已自動排版'); }} />
          </>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-sm font-medium text-[#1F2937]"
        >
          <span className="material-symbols-rounded text-base">upload_file</span>
          Excel 匯入
        </button>
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
      {view === 'canvas' ? (
        canvasNodes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
            畫布上還沒有節點。
            {libraryNodes.length > 0 ? (
              <>
                <br />
                此單元的節點庫有 <strong className="text-[#15803D]">{libraryNodes.length}</strong> 個節點待加入畫布；
                點上方<strong className="text-[#15803D]">「加入節點」</strong>按鈕挑選。
              </>
            ) : (
              <>
                <br />
                先用「新增節點」建立節點，或從「未分配」分區把節點指派到此單元，再點「加入節點」加到畫布。
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden flex">
            <div className="flex-1 min-w-0">
              <KnowledgeNodeCanvas
                nodes={canvasNodes}
                selectedId={selectedNode?.id}
                onSelectNode={setSelectedNode}
              />
            </div>
            <KnowledgeNodeEditPanel
              node={liveSelectedNode}
              units={units}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )
      ) : (
        <UnassignedView nodes={unassignedNodes} units={units} onChanged={refetchUnassigned} />
      )}

      {showCreateModal && (
        <NewKnowledgeNodeModal
          units={units}
          defaultUnitId={view === 'canvas' ? unitId : ''}
          defaultGradeBand={units.find((u) => u.id === unitId)?.gradeBand || 'upper'}
          onClose={() => setShowCreateModal(false)}
          onCreated={(n) => toast.success(`已新增節點「${n.name}」到節點庫；點「加入節點」可放上畫布`)}
        />
      )}

      {showImportModal && (
        <NodeExcelImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { refetchUnassigned(); setView('unassigned'); }}
        />
      )}

      {showAddToCanvasModal && (
        <AddNodesToCanvasModal
          unitId={unitId}
          onClose={() => setShowAddToCanvasModal(false)}
          onAdded={() => refetchCanvas()}
        />
      )}
    </AdminLayout>
  );
}
