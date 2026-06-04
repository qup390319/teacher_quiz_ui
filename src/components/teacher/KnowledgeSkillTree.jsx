import { useState } from 'react';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import {
  SKILL_TREE_A_GREEN as A_PAL,
  SKILL_TREE_B_AMBER as B_PAL,
  SKILL_TREE_DARK as D,
} from '../../constants/theme';

/**
 * 知識節點技能樹（Mockup J-1）
 * - 深木紋夜晚地圖風：radial gradient #5A3E22 → #2E1F10
 * - 六角節點 + 階段漸層配色（A 綠系 / B 橘系，由淺入深）
 * - 銳利輪廓 + 背後柔和光暈（雙層渲染）
 * - 階段欄位（階段 1–6）+ 起點/終點標籤
 * - Hover 節點顯示完整名稱於頂部
 */

// 6 個階段欄位 x 座標
const COL_X = [110, 250, 390, 530, 670, 830];
// 子主題列標題 Y（位於該列上方，避開 hex）
const LABEL_Y_A = 105;
const LABEL_Y_B = 365;
// 子主題列 hex 中心 Y
const ROW_Y_A = 210;
const ROW_Y_B_MAIN = 490;
const ROW_Y_B_UP = 440;
const ROW_Y_B_DOWN = 540;
const HEX_R = 42;
const SVG_H = 610;

const A_NODES = [
  { id: 'INe-Ⅱ-3-01', x: COL_X[0], y: ROW_Y_A, stage: 0 },
  { id: 'INe-Ⅱ-3-02', x: COL_X[1], y: ROW_Y_A, stage: 1 },
  { id: 'INe-Ⅱ-3-03', x: COL_X[2], y: ROW_Y_A, stage: 2 },
  { id: 'INe-Ⅱ-3-05', x: COL_X[3], y: ROW_Y_A, stage: 3 },
  { id: 'INe-Ⅱ-3-04', x: COL_X[4], y: ROW_Y_A, stage: 4, gold: true },
];

const B_NODES = [
  { id: 'INe-Ⅲ-5-1', x: COL_X[0], y: ROW_Y_B_MAIN, stage: 0 },
  { id: 'INe-Ⅲ-5-2', x: COL_X[1], y: ROW_Y_B_MAIN, stage: 1 },
  { id: 'INe-Ⅲ-5-3', x: COL_X[2], y: ROW_Y_B_MAIN, stage: 2 },
  { id: 'INe-Ⅲ-5-4', x: COL_X[3], y: ROW_Y_B_MAIN, stage: 3 },
  { id: 'INe-Ⅲ-5-5', x: COL_X[4], y: ROW_Y_B_UP,   stage: 4 },
  { id: 'INe-Ⅲ-5-6', x: COL_X[4], y: ROW_Y_B_DOWN, stage: 4 },
  { id: 'INe-Ⅲ-5-7', x: COL_X[5], y: ROW_Y_B_MAIN, stage: 5, gold: true },
];

const A_EDGES = [[0, 1], [1, 2], [2, 3], [3, 4]];
const B_EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];

function hexPoints(cx, cy, r = HEX_R) {
  // flat-top 六角形
  const hw = r * 0.5;
  const h = r * 0.87;
  return `${cx - hw},${cy - h} ${cx + hw},${cy - h} ${cx + r},${cy} ${cx + hw},${cy + h} ${cx - hw},${cy + h} ${cx - r},${cy}`;
}

function edgePoints(from, to, r = HEX_R) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ox = (dx / len) * r;
  const oy = (dy / len) * r;
  return {
    x1: from.x + ox, y1: from.y + oy,
    x2: to.x - ox,   y2: to.y - oy,
  };
}

function HexNode({ node, fill, stroke, isGold, label, onHover, selectable, isSelected, onToggle }) {
  const points = hexPoints(node.x, node.y);
  // 勾選模式：未選 → 黯淡無光；已選 → 完整發光
  const isDimmed = selectable && !isSelected;
  const glowColor = isGold ? D.goldStroke : stroke;
  const finalStroke = isDimmed ? '#6F5B40' : (isGold ? D.goldStroke : stroke);
  const finalFill = isDimmed ? 'rgba(110, 90, 65, 0.35)' : (isGold ? D.gold : fill);
  const idTextColor = isDimmed ? '#8B7A5F' : '#1E2420';

  const handleClick = () => {
    if (selectable && onToggle) onToggle(node.id);
  };

  return (
    <g
      style={{ cursor: selectable ? 'pointer' : 'default' }}
      onMouseEnter={() => onHover?.(node)}
      onMouseLeave={() => onHover?.(null)}
      onClick={handleClick}
    >
      {/* 光暈層：模糊放大 stroke 形成 halo（dim 時不顯示） */}
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
      {/* 銳利層：完整輪廓 + 填色（dim 時用灰褐色） */}
      <polygon
        points={points}
        fill={finalFill}
        stroke={finalStroke}
        strokeWidth={isDimmed ? '2' : '3.5'}
        strokeLinejoin="round"
        strokeDasharray={isDimmed ? '4 3' : undefined}
      />
      {/* 短碼（去掉 INe- 前綴），字體 17px 配合 hex r=42 */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={idTextColor}
        fontSize="17"
        fontWeight="700"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
      {/* 終點 ★ 標記（dim 時不顯示） */}
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
      {/* 勾選模式下，已選節點右上角加綠色 ✓ 徽章 */}
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

/**
 * Props
 * @param {boolean} [selectable=false] — 啟用勾選模式（未勾選黯淡、已勾選發光）
 * @param {string[]} [selectedNodeIds=[]] — 已勾選的節點 ID 清單（selectable=true 時使用）
 * @param {(nodeId: string) => void} [onToggle] — 點擊節點切換勾選狀態
 * @param {string} [title] — 自訂卡片標題（預設「知識學習路徑（技能樹）」）
 */
export default function KnowledgeSkillTree({
  selectable = false,
  selectedNodeIds = [],
  onToggle,
  title,
} = {}) {
  const [hovered, setHovered] = useState(null);
  const [showNames, setShowNames] = useState(false);
  const nodeName = (id) => knowledgeNodes.find((n) => n.id === id)?.name ?? '';
  const isNodeSelected = (id) => selectedNodeIds.includes(id);

  const connectorStyle = {
    filter: `drop-shadow(0 0 3px ${D.connector}) drop-shadow(0 0 1.5px ${D.connector})`,
  };

  const headerTitle = title ?? (selectable
    ? '知識學習路徑（技能樹）· 點選節點以勾選'
    : '知識學習路徑（技能樹）');
  const placeholderText = '滑鼠移到節點上可看完整名稱（或開啟右上「顯示節點名稱」）';

  return (
    <div
      className="relative rounded-[28px] p-5 sm:p-6 overflow-hidden"
      style={{
        background: D.bgGradient,
        border: `2px solid ${D.border}`,
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.18)',
      }}
    >
      {/* 頂部標題列：標題 + 切換鈕（不含 hover 內容，避免 layout shift） */}
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

      {/* 最小高度的 hover 資訊條 — 永遠存在，長名稱可換行不溢出 */}
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
            <span
              className="font-mono text-[15px] font-bold flex-shrink-0"
              style={{ color: D.goldStroke }}
            >
              {hovered.id}
            </span>
            <span className="text-[15px] font-medium" style={{ color: D.text }}>
              {nodeName(hovered.id)}
            </span>
          </div>
        ) : (
          <span className="text-[15px] leading-relaxed" style={{ color: D.textMuted }}>
            {placeholderText}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 1000 ${SVG_H}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        {/* 階段欄位垂直導引線 */}
        <g stroke={D.guide} strokeWidth="1" strokeDasharray="2 5" opacity="0.4">
          {COL_X.map((x) => (
            <line key={`guide-${x}`} x1={x} y1={50} x2={x} y2={SVG_H - 20} />
          ))}
        </g>

        {/* 階段標頭（移除「起點/終點」副標，避免暗示階段 6 是兩條路的共同終點） */}
        {COL_X.map((x, i) => (
          <text
            key={`tier-${i}`}
            x={x}
            y={32}
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill={D.textMuted}
            style={{ letterSpacing: '1.5px' }}
          >
            階段 {i + 1}
          </text>
        ))}

        {/* === 子主題 A 標題列（位於該列上方，徹底避開 hex） === */}
        <text x={COL_X[0]} y={LABEL_Y_A} fontSize="17" fontWeight="700" fill={D.labelA} textAnchor="start">
          子主題 A · 溶解
        </text>
        <text x={COL_X[0]} y={LABEL_Y_A + 20} fontSize="15" fill={D.textMuted} textAnchor="start">
          5 階段（線性）
        </text>

        {/* A 連線 */}
        <g
          stroke={D.connector}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
          style={connectorStyle}
        >
          {A_EDGES.map(([i, j], idx) => {
            const e = edgePoints(A_NODES[i], A_NODES[j]);
            return <line key={`a-edge-${idx}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />;
          })}
        </g>

        {/* A 節點 */}
        {A_NODES.map((n) => (
          <HexNode
            key={n.id}
            node={n}
            fill={A_PAL.fill[n.stage]}
            stroke={A_PAL.stroke[n.stage]}
            isGold={!!n.gold}
            label={n.id.replace(/^INe-/, '')}
            onHover={setHovered}
            selectable={selectable}
            isSelected={isNodeSelected(n.id)}
            onToggle={onToggle}
          />
        ))}

        {/* 分隔線（A 區與 B 區之間） */}
        <line
          x1={20} y1={325} x2={980} y2={325}
          stroke={D.connector} strokeWidth="1" strokeDasharray="2 6" opacity="0.5"
        />

        {/* === 子主題 B 標題列（位於該列上方，徹底避開 hex） === */}
        <text x={COL_X[0]} y={LABEL_Y_B} fontSize="17" fontWeight="700" fill={D.labelB} textAnchor="start">
          子主題 B · 酸鹼
        </text>
        <text x={COL_X[0]} y={LABEL_Y_B + 20} fontSize="15" fill={D.textMuted} textAnchor="start">
          6 階段（5-5 / 5-6 平行）
        </text>

        {/* B 連線（含 5-4 → 5-5/5-6 分岔、5-5/5-6 → 5-7 合流） */}
        <g
          stroke={D.connector}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
          style={connectorStyle}
        >
          {B_EDGES.map(([i, j], idx) => {
            const e = edgePoints(B_NODES[i], B_NODES[j]);
            return <line key={`b-edge-${idx}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />;
          })}
        </g>

        {/* B 節點 */}
        {B_NODES.map((n) => (
          <HexNode
            key={n.id}
            node={n}
            fill={B_PAL.fill[n.stage]}
            stroke={B_PAL.stroke[n.stage]}
            isGold={!!n.gold}
            label={n.id.replace(/^INe-/, '')}
            onHover={setHovered}
            selectable={selectable}
            isSelected={isNodeSelected(n.id)}
            onToggle={onToggle}
          />
        ))}
      </svg>

      {/* 節點名稱面板（showNames 開啟時顯示 — 兩欄、完整名稱不截斷） */}
      {showNames && (
        <div
          className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 p-4 rounded-2xl"
          style={{
            background: 'rgba(0,0,0,0.28)',
            border: `1px solid ${D.connector}`,
          }}
        >
          {/* 子主題 A */}
          <div>
            <h4
              className="text-base font-bold mb-2.5 pb-1.5 flex items-baseline gap-2"
              style={{ color: D.labelA, borderBottom: `1px solid ${D.connector}` }}
            >
              <span>子主題 A · 溶解</span>
              <span className="text-[15px] font-normal" style={{ color: D.textMuted }}>
                （5 階段、線性）
              </span>
            </h4>
            <ol className="space-y-2">
              {A_NODES.map((n) => (
                <li key={n.id} className="flex gap-3 items-start">
                  <span
                    aria-hidden="true"
                    className="flex-shrink-0 w-5 h-5 rounded-full mt-1 shadow"
                    style={{
                      background: n.gold ? D.gold : A_PAL.fill[n.stage],
                      border: `2px solid ${n.gold ? D.goldStroke : A_PAL.stroke[n.stage]}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="font-mono text-[15px] font-bold"
                        style={{ color: D.textMuted }}
                      >
                        {n.id.replace(/^INe-/, '')}
                      </span>
                      {n.gold && (
                        <span
                          className="text-[15px] px-2 py-0.5 rounded font-bold"
                          style={{
                            color: '#1E2420',
                            background: D.gold,
                          }}
                        >
                          ★ 終點
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] leading-relaxed mt-1" style={{ color: D.text }}>
                      {nodeName(n.id)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {/* 子主題 B */}
          <div>
            <h4
              className="text-base font-bold mb-2.5 pb-1.5 flex items-baseline gap-2"
              style={{ color: D.labelB, borderBottom: `1px solid ${D.connector}` }}
            >
              <span>子主題 B · 酸鹼</span>
              <span className="text-[15px] font-normal" style={{ color: D.textMuted }}>
                （6 階段、5-5 與 5-6 平行）
              </span>
            </h4>
            <ol className="space-y-2">
              {B_NODES.map((n) => (
                <li key={n.id} className="flex gap-3 items-start">
                  <span
                    aria-hidden="true"
                    className="flex-shrink-0 w-5 h-5 rounded-full mt-1 shadow"
                    style={{
                      background: n.gold ? D.gold : B_PAL.fill[n.stage],
                      border: `2px solid ${n.gold ? D.goldStroke : B_PAL.stroke[n.stage]}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="font-mono text-[15px] font-bold"
                        style={{ color: D.textMuted }}
                      >
                        {n.id.replace(/^INe-/, '')}
                      </span>
                      {n.gold && (
                        <span
                          className="text-[15px] px-2 py-0.5 rounded font-bold"
                          style={{
                            color: '#1E2420',
                            background: D.gold,
                          }}
                        >
                          ★ 終點
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] leading-relaxed mt-1" style={{ color: D.text }}>
                      {nodeName(n.id)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[15px] items-center"
        style={{ color: D.textMuted }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3.5 h-3.5 rounded-sm"
            style={{ background: A_PAL.fill[1], boxShadow: `0 0 6px ${A_PAL.stroke[1]}` }}
          />
          子主題 A · 溶解（5 階段）
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3.5 h-3.5 rounded-sm"
            style={{ background: B_PAL.fill[2], boxShadow: `0 0 6px ${B_PAL.stroke[2]}` }}
          />
          子主題 B · 酸鹼（6 階段，5-5/5-6 平行）
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3.5 h-3.5 rounded-sm"
            style={{ background: D.gold, boxShadow: `0 0 8px ${D.goldStroke}` }}
          />
          ★ 終點節點
        </span>
      </div>
    </div>
  );
}
