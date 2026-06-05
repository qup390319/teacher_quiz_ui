import { useMemo, useState } from 'react';
import { knowledgeNodes as globalNodes } from '../../data/knowledgeGraph';
import { SKILL_TREE_PALETTES, SKILL_TREE_DARK as D } from '../../constants/theme';
import { computeSkillTreeLayout, shortNodeLabel, HEX_R } from '../../utils/skillTreeLayout';

/**
 * 知識節點技能樹（資料驅動版，Mockup J-1 風格）
 * - 深木紋夜晚地圖：radial gradient #5A3E22 → #2E1F10
 * - 六角節點 + 群組色盤（依大節點 / 子主題分列，由淺入深表階段）
 * - 銳利輪廓 + 背後柔和光暈（雙層渲染）
 * - 任何單元都能渲染：座標由 computeSkillTreeLayout 依先備關係算出
 *
 * Props
 * @param {Array}   [nodes]            — 要渲染的節點（含 prerequisites / parentCode）；未給則 fallback 全域水溶液節點
 * @param {boolean} [selectable=false] — 勾選模式（未勾選黯淡、已勾選發光）
 * @param {string[]}[selectedNodeIds]  — 已勾選的節點 ID 清單
 * @param {Function}[onToggle]         — 點擊節點切換勾選
 * @param {string}  [title]            — 自訂卡片標題
 */

function paletteFor(groupIndex, stage) {
  const pal = SKILL_TREE_PALETTES[groupIndex % SKILL_TREE_PALETTES.length];
  const idx = Math.min(stage, pal.fill.length - 1);
  return { fill: pal.fill[idx], stroke: pal.stroke[idx] };
}

function hexPoints(cx, cy, r = HEX_R) {
  const hw = r * 0.5;
  const h = r * 0.87;
  return `${cx - hw},${cy - h} ${cx + hw},${cy - h} ${cx + r},${cy} ${cx + hw},${cy + h} ${cx - hw},${cy + h} ${cx - r},${cy}`;
}

function edgePoints(from, to, r = HEX_R) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = (dx / len) * r;
  const oy = (dy / len) * r;
  return { x1: from.x + ox, y1: from.y + oy, x2: to.x - ox, y2: to.y - oy };
}

function HexNode({ node, fill, stroke, isGold, label, onHover, selectable, isSelected, onToggle }) {
  const points = hexPoints(node.x, node.y);
  const isDimmed = selectable && !isSelected;
  const glowColor = isGold ? D.goldStroke : stroke;
  const finalStroke = isDimmed ? '#6F5B40' : (isGold ? D.goldStroke : stroke);
  const finalFill = isDimmed ? 'rgba(110, 90, 65, 0.35)' : (isGold ? D.gold : fill);
  const idTextColor = isDimmed ? '#8B7A5F' : '#1E2420';

  return (
    <g
      style={{ cursor: selectable ? 'pointer' : 'default' }}
      onMouseEnter={() => onHover?.(node)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => { if (selectable && onToggle) onToggle(node.id); }}
    >
      {!isDimmed && (
        <polygon
          points={points}
          fill={glowColor}
          stroke={glowColor}
          strokeWidth="7"
          opacity={isGold ? 0.55 : 0.45}
          style={{ filter: `blur(${isGold ? 8 : 6}px)` }}
        />
      )}
      <polygon
        points={points}
        fill={finalFill}
        stroke={finalStroke}
        strokeWidth={isDimmed ? '2' : '3.5'}
        strokeLinejoin="round"
        strokeDasharray={isDimmed ? '4 3' : undefined}
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={idTextColor}
        fontSize="16"
        fontWeight="700"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
      {isGold && !isDimmed && (
        <text
          x={node.x}
          y={node.y - HEX_R - 10}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={D.goldStroke}
          style={{ filter: `drop-shadow(0 0 4px ${D.goldStroke})`, pointerEvents: 'none' }}
        >
          ★ 終點
        </text>
      )}
      {selectable && isSelected && (
        <g style={{ pointerEvents: 'none' }}>
          <circle
            cx={node.x + HEX_R - 8}
            cy={node.y - HEX_R + 10}
            r="11"
            fill="#5C8A2E"
            stroke="#FBE9C7"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 4px rgba(124,176,68,0.8))' }}
          />
          <path
            d={`M ${node.x + HEX_R - 12} ${node.y - HEX_R + 10} L ${node.x + HEX_R - 9} ${node.y - HEX_R + 13} L ${node.x + HEX_R - 4} ${node.y - HEX_R + 7}`}
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      )}
    </g>
  );
}

export default function KnowledgeSkillTree({
  nodes,
  selectable = false,
  selectedNodeIds = [],
  onToggle,
  title,
} = {}) {
  const [hovered, setHovered] = useState(null);
  const [showNames, setShowNames] = useState(false);

  // 有傳 nodes（即使是空陣列）→ 用該單元節點；完全沒傳（如 KnowledgeMap）→ fallback 全域水溶液圖
  const data = Array.isArray(nodes) ? nodes : globalNodes;
  const layout = useMemo(() => computeSkillTreeLayout(data), [data]);
  const nameById = useMemo(() => {
    const m = new Map();
    data.forEach((n) => m.set(n.id, n.name));
    return m;
  }, [data]);

  const isNodeSelected = (id) => selectedNodeIds.includes(id);
  const connectorStyle = {
    filter: `drop-shadow(0 0 3px ${D.connector}) drop-shadow(0 0 1.5px ${D.connector})`,
  };

  const headerTitle = title ?? (selectable
    ? '知識學習路徑（技能樹）· 點選節點以勾選'
    : '知識學習路徑（技能樹）');
  const placeholderText = '滑鼠移到節點上可看完整名稱（或開啟右上「顯示節點名稱」）';

  const svgH = Math.max(360, layout.height);
  const stageCols = Array.from({ length: layout.maxStage + 1 }, (_, i) => i);

  return (
    <div
      className="relative rounded-[28px] p-5 sm:p-6 overflow-hidden"
      style={{
        background: D.bgGradient,
        border: `2px solid ${D.border}`,
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.18)',
      }}
    >
      {/* 標題列 + 顯示節點名稱切換 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-[15px] font-bold tracking-wider" style={{ color: D.textMuted }}>
          {headerTitle}
        </p>
        <label
          className="flex items-center gap-2 text-[15px] font-medium cursor-pointer select-none px-3 py-1.5 rounded-full"
          style={{
            color: D.text,
            background: showNames ? 'rgba(247,197,69,0.18)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${showNames ? D.goldStroke : D.connector}`,
          }}
        >
          <input
            type="checkbox"
            checked={showNames}
            onChange={(e) => setShowNames(e.target.checked)}
            className="w-4 h-4 accent-[#F4C545] cursor-pointer"
          />
          顯示節點名稱
        </label>
      </div>

      {/* hover 資訊條 */}
      <div
        className="mb-4 px-4 py-2.5 rounded-xl flex items-center"
        style={{
          minHeight: '60px',
          background: hovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)',
          border: `1px solid ${hovered ? D.goldStroke : D.connector}`,
          transition: 'background 0.18s, border-color 0.18s',
        }}
      >
        {hovered ? (
          <div className="flex items-baseline gap-2.5 flex-wrap leading-relaxed">
            <span className="font-mono text-[15px] font-bold flex-shrink-0" style={{ color: D.goldStroke }}>
              {hovered.id}
            </span>
            <span className="text-[15px] font-medium" style={{ color: D.text }}>
              {nameById.get(hovered.id)}
            </span>
          </div>
        ) : (
          <span className="text-[15px] leading-relaxed" style={{ color: D.textMuted }}>
            {placeholderText}
          </span>
        )}
      </div>

      {layout.nodes.length === 0 ? (
        <div className="px-4 py-12 text-center text-[15px]" style={{ color: D.textMuted }}>
          此單元尚未建立知識節點
        </div>
      ) : (
        <svg viewBox={`0 0 ${layout.width} ${svgH}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* 階段欄位導引線 + 標頭 */}
          <g stroke={D.guide} strokeWidth="1" strokeDasharray="2 5" opacity="0.4">
            {stageCols.map((s) => {
              const x = layout.colX + s * layout.colW;
              return <line key={`guide-${s}`} x1={x} y1={50} x2={x} y2={svgH - 20} />;
            })}
          </g>
          {stageCols.map((s) => (
            <text
              key={`tier-${s}`}
              x={layout.colX + s * layout.colW}
              y={32}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill={D.textMuted}
              style={{ letterSpacing: '1.5px' }}
            >
              階段 {s + 1}
            </text>
          ))}

          {/* 群組標題列 */}
          {layout.groups.map((g) => (
            <text
              key={`glabel-${g.key}`}
              x={layout.colX}
              y={g.labelY}
              fontSize="17"
              fontWeight="700"
              fill={paletteFor(g.groupIndex, 1).fill}
              textAnchor="start"
            >
              {g.label}
            </text>
          ))}

          {/* 先備關係連線 */}
          <g
            stroke={D.connector}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
            style={connectorStyle}
          >
            {layout.edges.map(([fromId, toId]) => {
              const from = layout.positions.get(fromId);
              const to = layout.positions.get(toId);
              if (!from || !to) return null;
              const e = edgePoints(from, to);
              return <line key={`edge-${fromId}-${toId}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />;
            })}
          </g>

          {/* 節點 */}
          {layout.nodes.map((n) => {
            const pal = paletteFor(n.groupIndex, n.stage);
            return (
              <HexNode
                key={n.id}
                node={n}
                fill={pal.fill}
                stroke={pal.stroke}
                isGold={n.gold}
                label={shortNodeLabel(n.id)}
                onHover={setHovered}
                selectable={selectable}
                isSelected={isNodeSelected(n.id)}
                onToggle={onToggle}
              />
            );
          })}
        </svg>
      )}

      {/* 節點名稱面板（依群組列出） */}
      {showNames && layout.groups.length > 0 && (
        <div
          className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 p-4 rounded-2xl"
          style={{ background: 'rgba(0,0,0,0.28)', border: `1px solid ${D.connector}` }}
        >
          {layout.groups.map((g) => {
            const groupNodes = layout.nodes
              .filter((n) => n.groupIndex === g.groupIndex)
              .sort((a, b) => a.stage - b.stage || a.y - b.y);
            return (
              <div key={`names-${g.key}`}>
                <h4
                  className="text-base font-bold mb-2.5 pb-1.5 flex items-baseline gap-2"
                  style={{ color: paletteFor(g.groupIndex, 1).fill, borderBottom: `1px solid ${D.connector}` }}
                >
                  <span>{g.label}</span>
                  <span className="text-[15px] font-normal" style={{ color: D.textMuted }}>
                    （{g.count} 節點）
                  </span>
                </h4>
                <ol className="space-y-2">
                  {groupNodes.map((n) => (
                    <li key={n.id} className="flex gap-3 items-start">
                      <span
                        aria-hidden="true"
                        className="flex-shrink-0 w-5 h-5 rounded-full mt-1 shadow"
                        style={{
                          background: n.gold ? D.gold : paletteFor(n.groupIndex, n.stage).fill,
                          border: `2px solid ${n.gold ? D.goldStroke : paletteFor(n.groupIndex, n.stage).stroke}`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-mono text-[15px] font-bold" style={{ color: D.textMuted }}>
                            {shortNodeLabel(n.id)}
                          </span>
                          {n.gold && (
                            <span className="text-[15px] px-2 py-0.5 rounded font-bold" style={{ color: '#1E2420', background: D.gold }}>
                              ★ 終點
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] leading-relaxed mt-1" style={{ color: D.text }}>
                          {nameById.get(n.id)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[15px] items-center" style={{ color: D.textMuted }}>
        {layout.groups.map((g) => (
          <span key={`legend-${g.key}`} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3.5 h-3.5 rounded-sm"
              style={{
                background: paletteFor(g.groupIndex, 1).fill,
                boxShadow: `0 0 6px ${paletteFor(g.groupIndex, 1).stroke}`,
              }}
            />
            {g.label}（{g.count} 節點）
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-sm" style={{ background: D.gold, boxShadow: `0 0 8px ${D.goldStroke}` }} />
          ★ 終點節點
        </span>
      </div>
    </div>
  );
}
