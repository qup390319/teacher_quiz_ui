import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { useAdminKnowledgeNodes, useDeleteMisconception } from '../../hooks/useAdminKnowledgeNodes';
import { useAdminUnits } from '../../hooks/useAdminUnits';
import AdminConfirmModal from './components/AdminConfirmModal';
import MisconceptionFormModal from './components/MisconceptionFormModal';

/**
 * /admin/misconceptions — 迷思概念管理（spec-02 §3、spec-14）。
 *
 * 雙欄 master-detail：
 *   左欄：知識節點清單（依次主題分組、可搜尋、顯示每節點迷思數）
 *   右欄：選中節點的迷思卡片，完整 label/detail/studentDetail/confirmQuestion + 新增/編輯/刪除
 *
 * 迷思 CRUD 走既有 admin API：
 *   POST   /admin/knowledge-nodes/{nodeId}/misconceptions
 *   PATCH  /admin/misconceptions/{id}
 *   DELETE /admin/misconceptions/{id}
 */

function NodeListItem({ node, active, onSelect }) {
  const count = node.misconceptions?.length || 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
        active
          ? 'border-[#7DD3A8] bg-[#DCFCE7]'
          : 'border-transparent hover:bg-[#F4F8F6]'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${active ? 'text-[#15803D]' : 'text-[#1F2937]'}`}>
            {node.name}
          </div>
          <div className="text-[11px] text-[#6B7280] font-mono truncate">{node.id}</div>
        </div>
        <span
          className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-xs font-bold shrink-0 ${
            count === 0
              ? 'bg-[#FEF3C7] text-[#B45309]'
              : 'bg-[#DCFCE7] text-[#15803D]'
          }`}
          title={`${count} 條迷思`}
        >
          {count}
        </span>
      </div>
    </button>
  );
}

function MisconceptionCard({ m, onEdit, onDelete }) {
  return (
    <div className="border border-[#E5E7EB] rounded-2xl p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1F2937]">{m.label}</span>
            <span className="text-[11px] text-[#6B7280] font-mono px-1.5 py-0.5 rounded-md bg-[#F4F8F6] border border-[#E5E7EB]">
              {m.id}
            </span>
            {m.isDefault && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#DBEAFE] text-[#1E40AF]">
                系統預設
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(m)}
            className="text-xs px-2 py-1 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-[#1F2937] font-medium"
          >
            編輯
          </button>
          <button
            type="button"
            onClick={() => onDelete(m)}
            className="text-xs px-2 py-1 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#FEE2E2] text-[#B91C1C] font-medium"
          >
            刪除
          </button>
        </div>
      </div>
      <dl className="mt-3 space-y-2">
        {m.detail && (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">教師視角</dt>
            <dd className="text-sm text-[#374151] mt-0.5 leading-relaxed">{m.detail}</dd>
          </div>
        )}
        {!m.detail && (
          <div className="text-xs text-[#9CA3AF] italic">尚未填寫詳細描述，點「編輯」補上。</div>
        )}
      </dl>
      {m.source?.trim() && (
        <div className="mt-3 rounded-lg bg-[#F9FAFB] border border-[#EEF0F2] px-3 py-2 flex items-start gap-2">
          <span className="material-symbols-rounded text-base text-[#9CA3AF] mt-px shrink-0">menu_book</span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-0.5">資料來源</div>
            <div className="text-[11px] text-[#6B7280] leading-relaxed break-words">{m.source}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MisconceptionsManagement() {
  const { toast } = useToast();
  const { data: nodes = [], isLoading } = useAdminKnowledgeNodes({});
  const { data: units = [] } = useAdminUnits({ type: 'subtheme' });
  const deleteMut = useDeleteMisconception();

  const [keyword, setKeyword] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [createForNode, setCreateForNode] = useState(null); // node object
  const [editingMis, setEditingMis] = useState(null); // misconception object
  const [deletingMis, setDeletingMis] = useState(null); // misconception object

  const unitName = useMemo(() => {
    const map = new Map(units.map((u) => [u.id, u]));
    return (unitId) => map.get(unitId)?.name || '（未分配次主題）';
  }, [units]);

  // 依關鍵字過濾節點（比對節點 id/名稱/大節點，以及其下迷思 label/id）
  const filteredNodes = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return nodes;
    return nodes.filter((n) => {
      const hay = `${n.id} ${n.name} ${n.parentCode || ''} ${n.parentName || ''}`.toLowerCase();
      if (hay.includes(k)) return true;
      return (n.misconceptions || []).some(
        (m) => `${m.id} ${m.label}`.toLowerCase().includes(k),
      );
    });
  }, [nodes, keyword]);

  // 依次主題分組，組內依 learningOrder→id 排序
  const groups = useMemo(() => {
    const map = new Map();
    filteredNodes.forEach((n) => {
      const key = n.unitId || '_unassigned';
      if (!map.has(key)) map.set(key, { unitId: n.unitId, name: unitName(n.unitId), nodes: [] });
      map.get(key).nodes.push(n);
    });
    const arr = Array.from(map.values());
    arr.forEach((g) =>
      g.nodes.sort(
        (a, b) => (a.learningOrder ?? 0) - (b.learningOrder ?? 0) || a.id.localeCompare(b.id),
      ),
    );
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [filteredNodes, unitName]);

  const selectedNode = useMemo(() => {
    if (selectedNodeId) return nodes.find((n) => n.id === selectedNodeId) || null;
    return filteredNodes[0] || null;
  }, [nodes, filteredNodes, selectedNodeId]);

  const totalMisconceptions = useMemo(
    () => nodes.reduce((sum, n) => sum + (n.misconceptions?.length || 0), 0),
    [nodes],
  );

  const handleDelete = async () => {
    if (!deletingMis) return;
    try {
      await deleteMut.mutateAsync(deletingMis.id);
      toast.success(`已刪除迷思「${deletingMis.label}」`);
      setDeletingMis(null);
    } catch (err) {
      toast.error(err?.message || '刪除失敗');
    }
  };

  const selectedMisconceptions = selectedNode?.misconceptions || [];

  return (
    <AdminLayout title="迷思概念" breadcrumb="Dashboard / 迷思概念">
      {/* 概覽列 */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg pointer-events-none">search</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜尋節點 / 迷思短標 / 編號"
            className="pl-9 pr-3 py-2 w-72 rounded-xl border border-[#E5E7EB] bg-white text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8]"
          />
        </div>
        {keyword.trim() && (
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="text-xs text-[#6B7280] hover:text-[#1F2937] underline"
          >
            清除
          </button>
        )}
        <div className="flex-1" />
        <div className="text-sm text-[#4B5563]">
          共 <strong>{nodes.length}</strong> 個知識節點 · <strong>{totalMisconceptions}</strong> 條迷思概念
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
          載入中…
        </div>
      ) : nodes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
          目前沒有知識節點。請先到「知識節點」建立節點。
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* 左欄：節點清單 */}
          <div className="w-72 shrink-0 bg-white rounded-2xl border border-[#E5E7EB] p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {groups.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#6B7280]">沒有符合搜尋的節點</div>
            ) : (
              groups.map((g) => (
                <div key={g.unitId || '_unassigned'} className="mb-3 last:mb-0">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    {g.name}
                  </div>
                  <div className="space-y-1">
                    {g.nodes.map((n) => (
                      <NodeListItem
                        key={n.id}
                        node={n}
                        active={selectedNode?.id === n.id}
                        onSelect={setSelectedNodeId}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 右欄：選中節點的迷思 */}
          <div className="flex-1 min-w-0">
            {!selectedNode ? (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm text-[#6B7280]">
                從左側選擇一個知識節點以管理其迷思概念。
              </div>
            ) : (
              <div className="space-y-4">
                {/* 節點標題列 */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-[#1F2937]">{selectedNode.name}</div>
                    <div className="text-xs text-[#6B7280] font-mono mt-0.5">{selectedNode.id}</div>
                    <div className="text-xs text-[#6B7280] mt-1">
                      {unitName(selectedNode.unitId)} · {selectedMisconceptions.length} 條迷思概念
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateForNode(selectedNode)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold text-sm shrink-0"
                  >
                    <span className="material-symbols-rounded text-base">add</span>
                    新增迷思
                  </button>
                </div>

                {/* 迷思卡片清單 */}
                {selectedMisconceptions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center text-sm text-[#6B7280]">
                    此節點還沒有迷思概念。點右上「新增迷思」開始建立。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMisconceptions.map((m) => (
                      <MisconceptionCard
                        key={m.id}
                        m={m}
                        onEdit={setEditingMis}
                        onDelete={setDeletingMis}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 新增 */}
      {createForNode && (
        <MisconceptionFormModal
          nodeId={createForNode.id}
          nodeLabel={`${createForNode.name}（${createForNode.id}）`}
          existingIds={(createForNode.misconceptions || []).map((m) => m.id)}
          onClose={() => setCreateForNode(null)}
          onSuccess={(m) => toast.success(`已新增迷思「${m.label}」`)}
        />
      )}

      {/* 編輯 */}
      {editingMis && (
        <MisconceptionFormModal
          isEdit
          initial={editingMis}
          nodeLabel={selectedNode ? `${selectedNode.name}（${selectedNode.id}）` : undefined}
          onClose={() => setEditingMis(null)}
          onSuccess={(m) => toast.success(`已更新迷思「${m.label}」`)}
        />
      )}

      {/* 刪除確認 */}
      {deletingMis && (
        <AdminConfirmModal
          title="刪除迷思概念"
          message={`確定刪除「${deletingMis.label}」（${deletingMis.id}）？此操作不可復原。`}
          confirmLabel="刪除"
          variant="danger"
          isPending={deleteMut.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeletingMis(null)}
        />
      )}
    </AdminLayout>
  );
}
