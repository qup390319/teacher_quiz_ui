import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useToast } from '../../context/ToastContext';
import { useUnits } from '../../hooks/useAdminUnits';
import { useAllKnowledgeNodes, nodesForUnit } from '../../hooks/useKnowledgeNodes';
import {
  useCustomMisconceptions,
  useCreateCustomMisconception,
  useDeleteCustomMisconception,
} from '../../hooks/useCustomMisconceptions';
import { mergeCustomsIntoNode } from '../../data/knowledgeGraph';
import AddCustomMisconceptionModal from '../../components/teacher/AddCustomMisconceptionModal';
import KnowledgeSkillTree from '../../components/teacher/KnowledgeSkillTree';
import NodeBadge from '../../components/NodeBadge';
import { useTour } from '../../context/TourContext';
import { Icon } from '../../components/ui/woodKit';

export default function CustomKnowledgeMap() {
  const navigate = useNavigate();
  const { startTour } = useTour();
  const { toast } = useToast();

  const { data: units = [], isLoading: unitsLoading } = useUnits({ type: 'unit' });
  const { data: allNodes = [], isLoading: nodesLoading } = useAllKnowledgeNodes();
  const { data: customs = [] } = useCustomMisconceptions();
  const createMut = useCreateCustomMisconception();
  const deleteMut = useDeleteCustomMisconception();

  const [addModalNodeId, setAddModalNodeId] = useState(null);

  const readyUnits = useMemo(() => {
    return units
      .map((u) => {
        const ns = nodesForUnit(u, allNodes);
        const misCount = ns.reduce((s, n) => s + (n.misconceptions?.length ?? 0), 0);
        return { unit: u, nodes: ns, misCount };
      })
      .filter((x) => x.nodes.length > 0 && x.misCount > 0)
      .sort((a, b) =>
        (a.unit.displayOrder ?? 0) - (b.unit.displayOrder ?? 0)
        || a.unit.name.localeCompare(b.unit.name));
  }, [units, allNodes]);

  const [storedUnitId, setStoredUnitId] = useState(null);
  const [storedNodeId, setStoredNodeId] = useState(null);

  const current = useMemo(() => {
    const byId = readyUnits.find((x) => x.unit.id === storedUnitId);
    return byId ?? readyUnits[0] ?? null;
  }, [readyUnits, storedUnitId]);

  const unit = current?.unit ?? null;
  const unitNodes = useMemo(() => current?.nodes ?? [], [current]);
  const totalDefault = unitNodes.reduce((s, n) => s + n.misconceptions.length, 0);
  const unitCustomCount = useMemo(
    () => customs.filter((c) => unitNodes.some((n) => n.id === c.nodeId)).length,
    [customs, unitNodes],
  );

  const groups = useMemo(() => {
    if (!unit) return [];
    return unit.parentNodes.map((p) => ({
      parentNodeId: p.parentNodeId,
      parentName: p.name ?? p.parentName ?? p.code ?? p.parentNodeId,
      nodes: unitNodes
        .filter((n) => n.parentNodeId === p.parentNodeId)
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.id.localeCompare(b.id)),
    })).filter((g) => g.nodes.length > 0);
  }, [unit, unitNodes]);

  const selectedNodeId = useMemo(() => {
    if (storedNodeId && unitNodes.some((n) => n.id === storedNodeId)) return storedNodeId;
    return groups[0]?.nodes[0]?.id ?? null;
  }, [storedNodeId, unitNodes, groups]);

  const selectedNode = useMemo(() => {
    const base = unitNodes.find((n) => n.id === selectedNodeId) ?? null;
    return base ? mergeCustomsIntoNode(base, customs) : null;
  }, [selectedNodeId, unitNodes, customs]);

  const loading = unitsLoading || nodesLoading;

  const handleSubmitCustom = async (payload) => {
    try {
      await createMut.mutateAsync(payload);
      setAddModalNodeId(null);
      toast.success('自訂迷思已新增');
    } catch (err) {
      toast.error('新增失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleDelete = async (customId, label) => {
    if (!window.confirm(`確定要刪除自訂迷思「${label}」嗎？此操作無法還原。`)) return;
    try {
      await deleteMut.mutateAsync(customId);
      toast.success(`已刪除自訂迷思「${label}」`);
    } catch (err) {
      toast.error('刪除失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁面標題 */}
        <div className="mb-4 sm:mb-6" data-tour="custom-km-header">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <button
              onClick={() => navigate('/teacher')}
              className="text-[#95A5A6] hover:text-[#636E72] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">(自定義) 知識節點與迷思概念總覽</h1>
            <button
              type="button"
              onClick={() => startTour('custom-knowledge-map')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              title="瞭解功能"
            >
              <Icon name="tour" className="text-base" />操作導覽
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-[24px] border border-[#BDC3C7] p-12 text-center text-sm text-[#636E72]">
            載入單元與知識節點中…
          </div>
        )}

        {!loading && readyUnits.length === 0 && (
          <div className="bg-white rounded-[24px] border border-[#BDC3C7] p-12 text-center">
            <p className="text-[#636E72] font-medium">目前沒有可顯示的單元</p>
            <p className="text-sm text-[#95A5A6] mt-1">請聯絡系統管理員建立節點與迷思內容。</p>
          </div>
        )}

        {!loading && unit && (
          <>
            {/* A 區：技能樹 + 單元選擇器 */}
            <div className="mb-6" data-tour="custom-km-tree">
              <KnowledgeSkillTree
                nodes={unitNodes}
                topBar={
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-2 text-[15px] font-bold tracking-wider" style={{ color: '#C19A6B' }}>
                      <span className="material-symbols-rounded text-lg">menu_book</span>
                      <span>教學單元</span>
                    </label>
                    <select
                      value={unit?.id ?? ''}
                      onChange={(e) => { setStoredUnitId(e.target.value); setStoredNodeId(null); }}
                      disabled={loading || readyUnits.length === 0}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#F4C545]"
                      style={{ background: 'rgba(0,0,0,0.35)', color: '#FBE9C7', border: '1px solid #C19A6B' }}
                    >
                      {readyUnits.map(({ unit: u, nodes, misCount }) => (
                        <option key={u.id} value={u.id} style={{ background: '#2E1F10', color: '#FBE9C7' }}>
                          {u.name}（{nodes.length} 節點 · {misCount} 迷思）
                        </option>
                      ))}
                    </select>
                    {unit && (
                      <span className="text-sm ml-auto" style={{ color: '#C19A6B' }}>
                        <span className="font-bold" style={{ color: '#FBE9C7' }}>{unitNodes.length}</span> 知識節點
                        <span className="mx-1.5 opacity-60">·</span>
                        <span className="font-bold" style={{ color: '#FBE9C7' }}>{totalDefault}</span> 系統預設
                        <span className="mx-1.5 opacity-60">·</span>
                        <span className="font-bold" style={{ color: '#F4C545' }}>{unitCustomCount}</span> 自訂
                      </span>
                    )}
                  </div>
                }
              />
            </div>

            {/* B 區：兩欄式（左 sticky 節點清單 / 右 詳情 + 自訂管理） */}
            <div data-tour="custom-km-table">
              {/* Mobile（< lg）：精簡下拉選擇器 */}
              <div className="lg:hidden mb-3">
                <div className="bg-white rounded-[16px] border border-[#BDC3C7] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-3 py-2.5">
                  <label className="block text-[12px] font-semibold text-[#636E72] mb-1.5">選擇知識節點</label>
                  <select
                    value={selectedNodeId ?? ''}
                    onChange={(e) => setStoredNodeId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-[14px] bg-[#FAFBFC] border border-[#BDC3C7] text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#3D5A3E]"
                  >
                    {groups.map((g) => (
                      <optgroup key={g.parentNodeId} label={g.parentName}>
                        {g.nodes.map((n) => {
                          const nodeCustomCount = customs.filter((c) => c.nodeId === n.id).length;
                          return (
                            <option key={n.id} value={n.id}>
                              {n.name}（{n.misconceptions.length} 預設{nodeCustomCount > 0 ? ` · ${nodeCustomCount} 自訂` : ''}）
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* 桌機（lg+）：兩欄佈局 */}
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
                {/* 左欄：節點清單 */}
                <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto overflow-x-hidden">
                  <div className="bg-white rounded-[24px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3">
                    {groups.map((g, gIdx) => (
                      <div key={g.parentNodeId} className="mb-3 last:mb-0">
                        <div
                          className="px-2.5 py-1.5 rounded-lg text-[13px] font-bold mb-1.5"
                          style={{
                            backgroundColor: gIdx % 2 === 0 ? '#E6F2FB' : '#FBEFE0',
                            color: gIdx % 2 === 0 ? '#3B8BC2' : '#D4843C',
                          }}
                        >
                          {g.parentName}
                          <span className="ml-1.5 font-mono font-normal opacity-70">· {g.nodes.length} 節點</span>
                        </div>
                        <ul className="space-y-1">
                          {g.nodes.map((n) => {
                            const active = n.id === selectedNodeId;
                            const nodeCustomCount = customs.filter((c) => c.nodeId === n.id).length;
                            return (
                              <li key={n.id}>
                                <button
                                  type="button"
                                  onClick={() => setStoredNodeId(n.id)}
                                  className={`w-full min-w-0 text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 overflow-hidden ${
                                    active
                                      ? 'bg-[#EEF5E6] border border-[#3D5A3E]'
                                      : 'bg-white border border-transparent hover:bg-[#FAFBFC]'
                                  }`}
                                >
                                  <NodeBadge nodeId={n.id} name={n.name} size="sm" />
                                  <span className={`text-[13px] flex-1 truncate min-w-0 ${active ? 'font-semibold text-[#2D3436]' : 'text-[#2D3436]'}`}>
                                    {n.name}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-[11px] text-[#95A5A6] font-mono tabular-nums">
                                      {n.misconceptions.length}
                                    </span>
                                    {nodeCustomCount > 0 && (
                                      <span className="text-[10px] font-bold text-[#7A4A18] bg-[#FFF1D8] border border-[#F0B962] rounded px-1">
                                        +{nodeCustomCount}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </aside>

                {/* 右欄：詳情 + 自訂管理 */}
                <section className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 sm:p-6">
                  {selectedNode ? (
                    <NodeDetail
                      node={selectedNode}
                      onAddCustom={() => setAddModalNodeId(selectedNode.id)}
                      onDelete={handleDelete}
                      isDeleting={deleteMut.isPending}
                    />
                  ) : (
                    <p className="text-[15px] text-[#95A5A6] text-center py-10">請從左側選擇知識節點</p>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>

      {addModalNodeId !== null && (
        <AddCustomMisconceptionModal
          initialNodeId={addModalNodeId}
          isPending={createMut.isPending}
          onSubmit={handleSubmitCustom}
          onClose={() => setAddModalNodeId(null)}
        />
      )}
    </TeacherLayout>
  );
}

function NodeDetail({ node, onAddCustom, onDelete, isDeleting }) {
  return (
    <>
      <header className="mb-5 pb-4 border-b border-[#EFF1F3]">
        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
          <NodeBadge nodeId={node.id} name={node.name} size="lg" />
          <h2 className="text-lg sm:text-xl font-bold text-[#2D3436]">{node.name}</h2>
        </div>
        {node.description && (
          <p className="text-sm text-[#636E72] leading-relaxed">{node.description}</p>
        )}
      </header>

      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-[#2D3436]">
          迷思概念
          <span className="ml-1.5 text-[#95A5A6] font-normal">（共 {node.misconceptions.length} 條）</span>
        </p>
        <button
          type="button"
          onClick={onAddCustom}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                     bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-sm font-semibold
                     hover:bg-[#FBE9C7] transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新增自訂迷思
        </button>
      </div>

      {node.misconceptions.length === 0 ? (
        <p className="text-[13px] text-[#95A5A6] py-6 text-center bg-[#FAFBFC] rounded-2xl">
          此節點尚未建立迷思概念
        </p>
      ) : (
        <ol className="space-y-3">
          {node.misconceptions.map((m, idx) => {
            const isCustom = m.isCustom;
            return (
              <li
                key={m.id}
                className={`border rounded-2xl p-4 ${isCustom ? 'bg-[#FFFAF2] border-[#F0B962]' : 'bg-[#FAFBFC] border-[#D5D8DC]'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-full text-white text-[13px] flex items-center justify-center font-bold flex-shrink-0 ${isCustom ? 'bg-[#D08B2E]' : 'bg-[#3D5A3E]'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="font-semibold text-[#2D3436] text-[15px] leading-relaxed">
                        {m.label}
                      </p>
                      {isCustom ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-[15px] font-bold flex-shrink-0">自訂</span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#F0F0F0] border border-[#D5D8DC] text-[#95A5A6] text-[15px] font-bold flex-shrink-0">預設</span>
                      )}
                    </div>
                    {m.detail && (
                      <p className="text-sm text-[#636E72] leading-relaxed mb-2">{m.detail}</p>
                    )}
                    {m.studentDetail && (
                      <div className="mt-2 px-3 py-2 bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg">
                        <p className="text-[11px] font-bold text-[#3D5A3E] mb-0.5">學生視角</p>
                        <p className="text-[13px] text-[#2D3436] leading-relaxed">{m.studentDetail}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-[#95A5A6] font-mono">{m.id}</p>
                      {isCustom && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => onDelete(m.id, m.label)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#E74C5E]
                                     bg-[#FAC8CC] border border-[#F5B8BA] rounded-lg px-2 py-1
                                     hover:bg-[#F5B8BA] disabled:opacity-50"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          刪除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
