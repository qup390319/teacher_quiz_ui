import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { knowledgeNodes } from '../../../data/knowledgeGraph';
import KnowledgeSkillTree from '../../../components/teacher/KnowledgeSkillTree';

const SUBTOPIC_A_IDS = ['INe-II-3-01', 'INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-II-3-04'];
const SUBTOPIC_B_IDS = ['INe-Ⅲ-5-1', 'INe-Ⅲ-5-2', 'INe-Ⅲ-5-3', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-5', 'INe-Ⅲ-5-6', 'INe-Ⅲ-5-7'];
const TOTAL_A = SUBTOPIC_A_IDS.length;
const TOTAL_B = SUBTOPIC_B_IDS.length;

// 子主題色系（搭配深木紋夜晚地圖 sticky bar）
const A_COLOR = {
  fill: '#7DB044', stroke: '#5C8A2E', text: '#FBE9C7',
  labelColor: '#A7D696',
  tag: 'A 溶解',
};
const B_COLOR = {
  fill: '#D08B2E', stroke: '#9B5E18', text: '#FBE9C7',
  labelColor: '#F0B962',
  tag: 'B 酸鹼',
};

function shortenId(id) {
  return (id ?? '').replace(/^INe-/, '');
}

/**
 * MiniPath：sticky bar 用的精簡路徑列。
 * 每個子主題一行小六角形 chip，selected = 填滿子主題色，unselected = 灰色虛框。
 * Hover 顯示完整名稱，點擊切換選取。
 */
function MiniPath({ subjectIds, color, label, selectedNodeIds, onToggle }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[15px] font-bold whitespace-nowrap flex-shrink-0" style={{ color: color.labelColor }}>{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {subjectIds.map((id) => {
          const node = knowledgeNodes.find((n) => n.id === id);
          const selected = selectedNodeIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className="inline-flex items-center justify-center text-[15px] font-mono font-bold rounded-md border transition-all hover:scale-110"
              style={{
                backgroundColor: selected ? color.fill : 'rgba(0,0,0,0.25)',
                borderColor: selected ? color.stroke : '#7A5232',
                color: selected ? color.text : '#C19A6B',
                padding: '3px 8px',
                minWidth: 72,
                boxShadow: selected ? `0 0 6px ${color.fill}66` : undefined,
              }}
              title={node ? `${id} · ${node.name}` : id}
            >
              {shortenId(id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Step1Nodes({ onNext }) {
  const { selectedNodeIds, setSelectedNodeIds, setIsWizardDirty } = useApp();

  // 偵測完整技能樹是否在畫面內：在畫面內 → 不重複顯示 MiniPath；滾出視窗 → sticky bar 顯示 MiniPath
  const treeRef = useRef(null);
  const [treeVisible, setTreeVisible] = useState(true);
  useEffect(() => {
    if (!treeRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setTreeVisible(entry.isIntersecting),
      { rootMargin: '-60px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(treeRef.current);
    return () => observer.disconnect();
  }, []);

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

  return (
    <div>
      <div className="mb-6" data-tour="step1-hero">
        <h2 className="text-xl font-bold text-[#2D3436] mb-1">步驟一：決定出題範圍</h2>
        <p className="text-[#636E72] text-[15px]">點擊下方技能樹節點以勾選要出題的知識範圍；勾選後節點會發亮，未勾選會黯淡。勾選後可在下方表格看到每個節點對應的學生常見迷思。</p>
      </div>

      {/* 完整技能樹 — 頁面頂端、不 sticky；用 IntersectionObserver 追蹤是否在畫面內 */}
      <div className="mb-6" ref={treeRef} data-tour="knowledge-skill-tree">
        <KnowledgeSkillTree
          selectable
          selectedNodeIds={selectedNodeIds}
          onToggle={toggleNode}
        />
      </div>

      {/* Sticky bar — 僅在完整技能樹滾出畫面後才顯示 MiniPath + 摘要 + 下一步。
          技能樹仍在畫面時，sticky bar 完全隱藏，避免重複資訊與奇怪的浮動條。 */}
      {!treeVisible && (
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-2 pb-2 mb-5">
          <div
            className="rounded-2xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5"
            style={{
              background: 'radial-gradient(ellipse at center, #5A3E22 0%, #2E1F10 100%)',
              border: '2px solid #8B5E3C',
              boxShadow: '0 4px 16px rgba(46,31,16,0.45), inset 0 0 30px rgba(0,0,0,0.45)',
            }}
          >
            <div className="space-y-1">
              <MiniPath subjectIds={SUBTOPIC_A_IDS} color={A_COLOR} label={A_COLOR.tag} selectedNodeIds={selectedNodeIds} onToggle={toggleNode} />
              <MiniPath subjectIds={SUBTOPIC_B_IDS} color={B_COLOR} label={B_COLOR.tag} selectedNodeIds={selectedNodeIds} onToggle={toggleNode} />
            </div>
            <div className="text-[15px] flex-1 min-w-[140px]" style={{ color: '#FBE9C7' }}>
              {selectedNodeIds.length > 0 ? (
                <span>
                  已勾選{' '}
                  <span className="font-bold" style={{ color: '#FFF3B0' }}>{selectedNodeIds.length}</span> 節點 ·{' '}
                  <span className="font-bold" style={{ color: '#FFF3B0' }}>{totalMisconceptions}</span> 迷思
                </span>
              ) : (
                <span style={{ color: '#C19A6B' }}>請從下方勾選至少 1 個知識節點以繼續</span>
              )}
            </div>
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-[15px] transition-all border-2"
              style={canProceed
                ? { backgroundColor: '#F4C545', color: '#3E2A10', borderColor: '#9B5E18', boxShadow: '0 2px 8px rgba(244,197,69,0.4)' }
                : { backgroundColor: 'rgba(0,0,0,0.25)', color: '#7A5232', borderColor: '#7A5232', cursor: 'not-allowed' }}
            >
              下一步
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                  className="inline-flex items-center gap-1 text-sm bg-white border border-[#BDC3C7] text-[#B7950B] px-3 py-1.5 rounded-xl hover:bg-[#FCF0C2] transition-all font-semibold cursor-pointer"
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
      <div data-tour="step1-minipath" className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
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
                      <p className="text-sm font-mono text-[#95A5A6] mb-0.5">{row.node.id}</p>
                      <p className="font-semibold text-[#2D3436] mb-1">{row.node.name}</p>
                      <p className="text-sm text-[#636E72] leading-relaxed">{row.node.description}</p>
                    </td>
                  )}
                  <td className={`border-r border-[#BDC3C7] px-4 py-2.5 align-top font-medium text-[#2D3436] ${isSelected ? 'bg-[#C8EAAE]' : ''}`}>
                    <p className="text-sm font-mono text-[#95A5A6] mb-0.5">{row.misconception.id}</p>
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

      {/* 頁底 CTA：完成節點選取後的「下一步」 — 取代過去的浮動 bar 配置，避免畫面頂端冗餘。
          滾動到一半想直接跳下一步時，可用滾動後出現的 sticky MiniPath bar 上的同名按鈕。 */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all border-2 ${canProceed
              ? 'bg-[#8FC87A] text-[#2D3436] border-[#5C8A2E] hover:bg-[#76B563] shadow-[0_2px_8px_rgba(143,200,122,0.4)]'
              : 'bg-[#EEF5E6] text-[#95A5A6] border-[#D5D8DC] cursor-not-allowed'
            }`}
        >
          下一步：製作題組
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
