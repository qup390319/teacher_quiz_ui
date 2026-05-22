import { knowledgeNodes } from '../../../data/knowledgeGraph';
import { getNodeColor } from '../../../constants/theme';

export default function CoveragePanel({ questions, selectedNodeIds, nodeQuestionCounts = {}, onAddForMisconception }) {
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
        <span className="text-sm text-[#95A5A6]">點擊琥珀色按鈕可直接針對該迷思新增一題</span>
      </div>

      <div className="divide-y divide-[#E8E8E8]">
        {nodeCoverage.map(({ node, questionCount, coveredCount, totalCount, uncovered }) => {
          const pct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;
          const allCovered = uncovered.length === 0 && coveredCount > 0;
          const color = getNodeColor(node.id);
          return (
            <div key={node.id} className="flex items-stretch gap-3 py-2.5 first:pt-0 last:pb-0">
              {/* 節點色彩條 */}
              <div className={`flex-shrink-0 w-1 rounded-full ${color.bar}`}></div>

              {/* 節點 ID 標籤 + 題數（hover 顯示完整節點名稱）*/}
              <div className="flex-shrink-0 w-[140px] flex items-center gap-1.5 flex-wrap" title={`${node.id} · ${node.name}`}>
                <span className={`inline-flex items-center gap-1 text-[15px] font-mono font-semibold px-2 py-0.5 rounded-sm border-l-[3px] cursor-help ${color.badge}`} title={`${node.id} · ${node.name}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.bar}`}></span>
                  {node.id}
                </span>
                <span className="text-sm text-[#95A5A6]">
                  {questionCount}{nodeQuestionCounts[node.id] ? `/${nodeQuestionCounts[node.id]}` : ''} 題
                </span>
              </div>

              {/* 迷思覆蓋進度 */}
              <div className="flex-shrink-0 flex items-center gap-1.5 w-[80px] pt-0.5">
                <div className="flex gap-[3px]">
                  {Array.from({ length: totalCount }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < coveredCount ? (pct >= 75 ? 'bg-[#8FC87A]' : pct >= 50 ? 'bg-[#F4D03F]' : 'bg-[#F28B95]') : 'bg-[#D5D8DC]'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[#636E72]">{coveredCount}/{totalCount}</span>
              </div>

              {/* 未覆蓋迷思 chips 或完成標記 */}
              <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[24px]">
                {allCovered && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#3D5A3E]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    已全部涵蓋
                  </span>
                )}
                {uncovered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onAddForMisconception(node.id, m.id)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#92400E] bg-[#FEF3CD] border border-[#F0D78C] hover:bg-[#FCEAB0] hover:shadow-sm active:bg-[#F0D78C] px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    title={m.detail}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-mono text-[15px]">{m.id}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
