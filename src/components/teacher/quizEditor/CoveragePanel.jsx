import { knowledgeNodes } from '../../../data/knowledgeGraph';

/**
 * Coverage Panel — 顯示每個節點的迷思覆蓋率，並列出尚未覆蓋的迷思 chip。
 * 點擊 chip 觸發 onAddForMisconception(nodeId, misconceptionId)，呼叫端負責建立題目並開啟編輯 modal。
 */
export default function CoveragePanel({ questions, selectedNodeIds, onAddForMisconception }) {
  const nodeCoverage = knowledgeNodes
    .filter((n) => selectedNodeIds.includes(n.id))
    .map((node) => {
      const nodeQuestions = questions.filter((q) => q.knowledgeNodeId === node.id);
      const coveredMisconceptionIds = new Set();
      nodeQuestions.forEach((q) => {
        q.options.forEach((o) => {
          if (o.diagnosis !== 'CORRECT') coveredMisconceptionIds.add(o.diagnosis);
        });
      });
      const uncovered = node.misconceptions.filter((m) => !coveredMisconceptionIds.has(m.id));
      return {
        node,
        questionCount: nodeQuestions.length,
        coveredCount: coveredMisconceptionIds.size,
        totalCount: node.misconceptions.length,
        uncovered,
      };
    });

  return (
    <div className="bg-white border border-[#BDC3C7] rounded-2xl p-4 mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-sm font-bold text-[#2D3436]">出題涵蓋狀況</h3>
        <span className="text-xs text-[#95A5A6]">點擊紅色 chip 直接針對該迷思新增一題（自動鎖定節點與干擾選項）</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {nodeCoverage.map(({ node, questionCount, coveredCount, totalCount, uncovered }) => {
          const pct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;
          return (
            <div key={node.id} className="flex-1 min-w-[240px] bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-[#95A5A6]">{node.id}</span>
                <span className="text-xs text-[#636E72]">{questionCount} 題</span>
              </div>
              <p className="text-xs font-semibold text-[#2D3436] mb-2 leading-tight">{node.name}</p>
              <div className="w-full bg-[#D5D8DC] rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full transition-all ${pct >= 75 ? 'bg-[#8FC87A]' : pct >= 50 ? 'bg-[#F4D03F]' : 'bg-[#F28B95]'}`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
              <p className="text-xs text-[#636E72] mb-2">已出題涵蓋 {coveredCount} 個迷思（共 {totalCount} 個）</p>

              {uncovered.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#D5D8DC]">
                  <p className="text-[11px] text-[#95A5A6] mb-1.5">尚未覆蓋的迷思（點擊新增題目）：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {uncovered.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onAddForMisconception(node.id, m.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#F5B8BA] hover:bg-[#F5B8BA] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title={m.detail}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-mono text-[10px] opacity-70">{m.id}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {uncovered.length === 0 && coveredCount > 0 && (
                <div className="mt-2 pt-2 border-t border-[#D5D8DC]">
                  <p className="text-[11px] text-[#3D5A3E] font-semibold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    全部迷思皆已涵蓋
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
