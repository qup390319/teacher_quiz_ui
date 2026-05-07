import { useApp } from '../../../context/AppContext';
import { knowledgeNodes } from '../../../data/knowledgeGraph';

const STAGE_COLORS = {
  blue:   { bg: 'bg-[#BADDF4]', text: 'text-[#2E86C1]', border: 'border-[#BDC3C7]' },
  pink:   { bg: 'bg-[#FAC8CC]', text: 'text-[#E74C5E]', border: 'border-[#BDC3C7]' },
  green:  { bg: 'bg-[#C8EAAE]', text: 'text-[#3D5A3E]', border: 'border-[#BDC3C7]' },
  yellow: { bg: 'bg-[#FCF0C2]', text: 'text-[#B7950B]', border: 'border-[#BDC3C7]' },
  mint:   { bg: 'bg-[#A8E6CF]', text: 'text-[#1E8449]', border: 'border-[#BDC3C7]' },
  purple: { bg: 'bg-[#F3E5F5]', text: 'text-[#7D3C98]', border: 'border-[#BDC3C7]' },
};

// 子主題 A：水溶液中的變化（溶解）— 5 個節點，5 個階段（線性）
const SUBTOPIC_A_STAGES = [
  { ids: ['INe-II-3-01'], color: 'blue',   nextArrow: 'single' },
  { ids: ['INe-II-3-02'], color: 'pink',   nextArrow: 'single' },
  { ids: ['INe-II-3-03'], color: 'green',  nextArrow: 'single' },
  { ids: ['INe-II-3-05'], color: 'yellow', nextArrow: 'single' },
  { ids: ['INe-II-3-04'], color: 'purple', nextArrow: null },
];

// 子主題 B：酸鹼反應 — 7 個節點，6 個階段（5-5、5-6 為平行階段）
const SUBTOPIC_B_STAGES = [
  { ids: ['INe-Ⅲ-5-1'], color: 'blue',   nextArrow: 'single' },
  { ids: ['INe-Ⅲ-5-2'], color: 'pink',   nextArrow: 'single' },
  { ids: ['INe-Ⅲ-5-3'], color: 'green',  nextArrow: 'single' },
  { ids: ['INe-Ⅲ-5-4'], color: 'yellow', nextArrow: 'multi' },
  { ids: ['INe-Ⅲ-5-5', 'INe-Ⅲ-5-6'], color: 'mint', nextArrow: 'multi' },
  { ids: ['INe-Ⅲ-5-7'], color: 'purple', nextArrow: null },
];

function Arrow({ multi = false }) {
  if (multi) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center self-stretch px-1">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-px flex-1 bg-[#BDC3C7]"></div>
          <svg className="w-4 h-4 text-[#95A5A6] flex-shrink-0 my-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="w-px flex-1 bg-[#BDC3C7]"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex items-center px-1">
      <svg className="w-4 h-4 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

function NodePill({ node, colorClass, isSelected, onToggle }) {
  const bg = isSelected ? colorClass.bg : 'bg-[#EEF5E6]';
  const border = isSelected ? colorClass.border : 'border-[#D5D8DC]';
  const text = isSelected ? colorClass.text : 'text-[#95A5A6]';
  const hoverBg = isSelected ? '' : 'hover:bg-white hover:border-[#BDC3C7]';
  return (
    <button
      type="button"
      onClick={() => onToggle(node.id)}
      aria-pressed={isSelected}
      className={`rounded-xl border px-3 py-1.5 min-w-[128px] text-left transition-colors cursor-pointer ${bg} ${border} ${hoverBg}`}
    >
      <p className="text-xs font-mono text-[#95A5A6] leading-tight">{node.id}</p>
      <p className={`text-sm font-semibold leading-snug ${text}`}>{node.name}</p>
    </button>
  );
}

function PathStage({ stage, nodes, selectedNodeIds, onToggle }) {
  const colorClass = STAGE_COLORS[stage.color];
  return (
    <>
      <div className="flex-shrink-0 flex flex-col gap-1.5">
        {nodes(stage.ids).map((node) => (
          <NodePill
            key={node.id}
            node={node}
            colorClass={colorClass}
            isSelected={selectedNodeIds.includes(node.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
      {stage.nextArrow === 'multi' && <Arrow multi />}
      {stage.nextArrow === 'single' && <Arrow />}
    </>
  );
}

export default function Step1Nodes({ onNext }) {
  const { selectedNodeIds, setSelectedNodeIds, setIsWizardDirty } = useApp();

  const toggleNode = (nodeId) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
    setIsWizardDirty(true);
  };

  const missingPrereqs = [];
  selectedNodeIds.forEach((nodeId) => {
    const node = knowledgeNodes.find((n) => n.id === nodeId);
    if (!node) return;
    node.prerequisites.forEach((prereqId) => {
      if (!selectedNodeIds.includes(prereqId)) {
        const prereq = knowledgeNodes.find((n) => n.id === prereqId);
        if (prereq && !missingPrereqs.find((m) => m.id === prereqId)) {
          missingPrereqs.push(prereq);
        }
      }
    });
  });

  const canProceed = selectedNodeIds.length > 0;
  const totalMisconceptions = knowledgeNodes
    .filter((n) => selectedNodeIds.includes(n.id))
    .reduce((sum, n) => sum + n.misconceptions.length, 0);

  const rows = [];
  let nodeGroupIndex = 0;
  knowledgeNodes.forEach((node) => {
    node.misconceptions.forEach((m, mIdx) => {
      rows.push({
        node,
        nodeRowSpan: node.misconceptions.length,
        isFirstOfNode: mIdx === 0,
        misconception: m,
        nodeGroupIndex,
      });
    });
    nodeGroupIndex++;
  });

  const nodes = (ids) => knowledgeNodes.filter((n) => ids.includes(n.id));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#2D3436] mb-1">步驟一：決定出題範圍</h2>
        <p className="text-[#636E72] text-sm">在下方表格中勾選要出題的知識範圍，勾選後可以看到每個節點對應的學生常見迷思</p>
      </div>

      {/* 知識學習路徑圖（兩個子主題各一條） */}
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-5 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold text-[#95A5A6] uppercase tracking-wide mb-4">知識學習路徑（箭頭表示先備關係，建議從左邊的基礎節點開始選起）</p>

        {/* 子主題 A */}
        <p className="text-sm font-semibold text-[#2D3436] mb-2">子主題 A：水溶液中的變化（溶解）</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-3 mb-4">
          {SUBTOPIC_A_STAGES.map((stage, idx) => (
            <PathStage key={`A-${idx}`} stage={stage} nodes={nodes} selectedNodeIds={selectedNodeIds} />
          ))}
        </div>

        {/* 子主題 B */}
        <p className="text-sm font-semibold text-[#2D3436] mb-2 pt-3 border-t border-[#D5D8DC]">子主題 B：酸鹼反應</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {SUBTOPIC_B_STAGES.map((stage, idx) => (
            <PathStage key={`B-${idx}`} stage={stage} nodes={nodes} selectedNodeIds={selectedNodeIds} />
          ))}
        </div>
      </div>

      {/* Sticky 摘要列 */}
      <div className="sticky top-0 z-10 bg-[#C8EAAE] border border-[#BDC3C7] rounded-2xl px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="text-sm text-[#2D3436]">
          {selectedNodeIds.length > 0 ? (
            <>
              已選 <span className="font-bold text-[#2D3436]">{selectedNodeIds.length}</span> 個節點，
              將診斷 <span className="font-bold text-[#2D3436]">{totalMisconceptions}</span> 個迷思概念
            </>
          ) : (
            <span className="text-[#95A5A6]">尚未選擇任何知識節點</span>
          )}
        </div>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all border ${canProceed
              ? 'bg-[#8FC87A] text-[#2D3436] border-[#BDC3C7] hover:bg-[#76B563]'
              : 'bg-[#EEF5E6] text-[#95A5A6] border-[#D5D8DC] cursor-not-allowed'
            }`}
        >
          下一步：製作考卷
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Warning Banner */}
      {missingPrereqs.length > 0 && (
        <div className="mb-5 bg-[#FCF0C2] border border-[#F5D669] rounded-2xl p-4 flex gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-[#D4AC0D] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#B7950B]">建議補充先備節點</p>
            <p className="text-sm text-[#B7950B] mt-0.5">
              您選擇了較後段的節點，建議同時涵蓋以下先備知識節點，可提升診斷完整性。
              <span className="text-[#D4AC0D] font-medium">點擊即可加入：</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {missingPrereqs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleNode(n.id)}
                  className="inline-flex items-center gap-1 text-xs bg-white border border-[#BDC3C7] text-[#B7950B] px-3 py-1.5 rounded-xl hover:bg-[#FCF0C2] transition-all font-semibold cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  {n.id} {n.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 知識節點 × 迷思概念表格 */}
      <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
       <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[640px]">
          <thead>
            <tr className="bg-white border-b-2 border-[#BDC3C7]">
              <th className="border-r border-[#BDC3C7] px-2 py-3 text-center font-semibold text-[#2D3436] w-10">選取</th>
              <th className="border-r border-[#BDC3C7] px-4 py-3 text-left font-semibold text-[#2D3436] w-[24%]">知識節點</th>
              <th className="border-r border-[#BDC3C7] px-4 py-3 text-left font-semibold text-[#2D3436] w-[32%]">迷思概念</th>
              <th className="px-4 py-3 text-left font-semibold text-[#2D3436] w-[40%]">學生常見想法</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const isLastRow = rowIdx === rows.length - 1;
              const isLastOfNode = row.isFirstOfNode && !isLastRow
                ? false
                : row.node.misconceptions[row.node.misconceptions.length - 1].id === row.misconception.id;
              const isSelected = selectedNodeIds.includes(row.node.id);

              const rowBg = isSelected
                ? 'bg-[#EEF5E6]'
                : row.nodeGroupIndex % 2 === 0 ? 'bg-[#EEF5E6]' : 'bg-white';

              return (
                <tr
                  key={`${row.misconception.id}-${rowIdx}`}
                  className={`${rowBg} ${isLastOfNode && !isLastRow ? 'border-b-2 border-[#BDC3C7]' : 'border-b border-[#D5D8DC]'}`}
                >
                  {row.isFirstOfNode && (
                    <td
                      rowSpan={row.nodeRowSpan}
                      onClick={() => toggleNode(row.node.id)}
                      className={`border-r border-[#BDC3C7] px-2 text-center align-middle cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#C8EAAE]' : `${row.nodeGroupIndex % 2 === 0 ? 'bg-[#EEF5E6]' : 'bg-white'} hover:bg-[#EEF5E6]`
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                        isSelected ? 'bg-[#8FC87A] border-[#8FC87A]' : 'border-[#BDC3C7] bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                  )}
                  {row.isFirstOfNode && (
                    <td
                      rowSpan={row.nodeRowSpan}
                      className={`border-r border-[#BDC3C7] px-4 py-3 align-top ${isSelected ? 'bg-[#C8EAAE]' : row.nodeGroupIndex % 2 === 0 ? 'bg-[#EEF5E6]' : 'bg-white'}`}
                    >
                      <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{row.node.id}</p>
                      <p className="font-semibold text-[#2D3436] mb-1">{row.node.name}</p>
                      <p className="text-xs text-[#636E72] leading-relaxed">{row.node.description}</p>
                    </td>
                  )}
                  <td className={`border-r border-[#BDC3C7] px-4 py-2.5 align-top font-medium text-[#2D3436] ${isSelected ? 'bg-[#C8EAAE]' : ''}`}>
                    <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{row.misconception.id}</p>
                    {row.misconception.label}
                  </td>
                  <td className={`px-4 py-2.5 align-top text-[#636E72] leading-relaxed ${isSelected ? 'bg-[#C8EAAE]' : ''}`}>
                    {row.misconception.detail}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
       </div>
      </div>
    </div>
  );
}
