import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useUnits } from '../../hooks/useAdminUnits';
import { useAllKnowledgeNodes, nodesForUnit } from '../../hooks/useKnowledgeNodes';
import KnowledgeSkillTree from '../../components/teacher/KnowledgeSkillTree';
import NodeBadge from '../../components/NodeBadge';
import { useTour } from '../../context/TourContext';
import { Icon } from '../../components/ui/woodKit';

export default function KnowledgeMap() {
  const navigate = useNavigate();
  const { startTour } = useTour();

  const { data: units = [], isLoading: unitsLoading } = useUnits({ type: 'unit' });
  const { data: allNodes = [], isLoading: nodesLoading } = useAllKnowledgeNodes();

  // 「可用」單元 = 有節點 + 有迷思（與 Step0Unit 一致的 ready 判準）
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

  // 使用者選擇（未選時 fallback 到第一個可用單元 / 第一個節點）
  const [storedUnitId, setStoredUnitId] = useState(null);
  const [storedNodeId, setStoredNodeId] = useState(null);

  const current = useMemo(() => {
    const byId = readyUnits.find((x) => x.unit.id === storedUnitId);
    return byId ?? readyUnits[0] ?? null;
  }, [readyUnits, storedUnitId]);

  const unit = current?.unit ?? null;
  const unitNodes = useMemo(() => current?.nodes ?? [], [current]);
  const totalDefault = unitNodes.reduce((s, n) => s + n.misconceptions.length, 0);

  // 依大節點（parentNodeId）分組，順序與名稱來自 unit.parentNodes
  const groups = useMemo(() => {
    if (!unit) return [];
    return unit.parentNodes.map((p) => ({
      parentNodeId: p.parentNodeId,
      parentName: p.name ?? p.parentName ?? p.code ?? p.parentNodeId,
      parentCode: p.code ?? p.parentCode ?? '',
      nodes: unitNodes
        .filter((n) => n.parentNodeId === p.parentNodeId)
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.id.localeCompare(b.id)),
    })).filter((g) => g.nodes.length > 0);
  }, [unit, unitNodes]);

  // 切換單元後若 storedNodeId 不在新單元中，退回該單元第一個節點
  const selectedNodeId = useMemo(() => {
    if (storedNodeId && unitNodes.some((n) => n.id === storedNodeId)) return storedNodeId;
    return groups[0]?.nodes[0]?.id ?? null;
  }, [storedNodeId, unitNodes, groups]);

  const selectedNode = useMemo(
    () => unitNodes.find((n) => n.id === selectedNodeId) ?? null,
    [selectedNodeId, unitNodes],
  );

  const loading = unitsLoading || nodesLoading;

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁面標題 */}
        <div className="mb-4 sm:mb-6" data-tour="knowledge-map-hero">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <button
              onClick={() => navigate('/teacher')}
              className="text-[#95A5A6] hover:text-[#636E72] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">(預設) 知識節點與迷思概念總覽</h1>
            <button
              type="button"
              onClick={() => startTour('knowledge-map')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              title="瞭解知識節點總覽"
            >
              <Icon name="tour" className="text-base" />
              操作導覽
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
            {/* A 區：知識路徑技能樹 — 依選中單元的節點繪製；單元選擇器嵌入頂部 */}
            <div className="mb-6" data-tour="knowledge-skill-tree">
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
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        color: '#FBE9C7',
                        border: '1px solid #C19A6B',
                      }}
                    >
                      {readyUnits.length === 0 && <option>（無可用單元）</option>}
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
                        <span className="font-bold" style={{ color: '#FBE9C7' }}>{totalDefault}</span> 系統預設迷思
                      </span>
                    )}
                  </div>
                }
              />
            </div>

            {/* B 區：兩欄式收集冊（左 sticky 節點清單 / 右 詳情卡） */}
            <div data-tour="misconceptions-table">
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
                        {g.nodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}（{n.misconceptions.length} 迷思）
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* 桌機（lg+）：兩欄佈局 */}
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
                {/* 左欄：節點清單，只在 lg+ 顯示 */}
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
                                  <span className="text-[11px] text-[#95A5A6] font-mono tabular-nums flex-shrink-0">
                                    {n.misconceptions.length}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </aside>

                {/* 右欄：被選中節點的詳情 */}
                <section className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 sm:p-6">
                  {selectedNode ? <NodeDetail node={selectedNode} /> : (
                    <p className="text-[15px] text-[#95A5A6] text-center py-10">請從左側選擇知識節點</p>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}

function NodeDetail({ node }) {
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

      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-[#2D3436]">
          系統預設迷思概念
          <span className="ml-1.5 text-[#95A5A6] font-normal">（共 {node.misconceptions.length} 條）</span>
        </p>
      </div>

      {node.misconceptions.length === 0 ? (
        <p className="text-[13px] text-[#95A5A6] py-6 text-center bg-[#FAFBFC] rounded-2xl">
          此節點尚未建立迷思概念
        </p>
      ) : (
        <ol className="space-y-3">
          {node.misconceptions.map((m, idx) => (
            <li
              key={m.id}
              className="border border-[#D5D8DC] rounded-2xl p-4 bg-[#FAFBFC]"
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#3D5A3E] text-white text-[13px] flex items-center justify-center font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2D3436] text-[15px] leading-relaxed mb-1.5">
                    {m.label}
                  </p>
                  {m.detail && (
                    <p className="text-sm text-[#636E72] leading-relaxed mb-2">{m.detail}</p>
                  )}
                  {m.studentDetail && (
                    <div className="mt-2 px-3 py-2 bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg">
                      <p className="text-[11px] font-bold text-[#3D5A3E] mb-0.5">學生視角</p>
                      <p className="text-[13px] text-[#2D3436] leading-relaxed">{m.studentDetail}</p>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-[#95A5A6] font-mono">{m.id}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
