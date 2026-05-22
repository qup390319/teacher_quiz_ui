import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Label,
} from 'recharts';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { getClassChartKey } from './helpers';

const MASTERY_THRESHOLD = 70;
const WARN_THRESHOLD = 50;

// Hover 提示說明（簡短、避免堆疊太多資訊）
const CARD_TOOLTIPS = {
  below: '全班平均答對率低於 70% 的節點數量。建議列為優先補救對象。',
  worst: '跨班平均答對率最低的節點。代表所有班級在此節點普遍卡關，可能反映課程或概念難度。',
  gap: '各班答對率落差最大的節點。差距大表示不同班級表現不均，可能反映教學差異。',
};

// 共用的卡片內 hover tooltip（深色泡泡 + 上方小三角箭頭）
function CardHoverTip({ text }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 max-w-[80vw] opacity-0 group-hover:opacity-100 transition-opacity z-30"
      role="tooltip"
    >
      <div className="bg-[#2D3436] text-white text-[15px] font-medium leading-relaxed px-3 py-2 rounded-lg shadow-lg">
        {text}
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #2D3436',
        }}
      />
    </div>
  );
}

// 子主題色（與 NodeBadge 一致）
function subjectColor(nodeId) {
  if (!nodeId) return { bg: '#F0F1F2', text: '#2D3436', border: '#95A5A6' };
  if (nodeId.includes('II-3')) return { bg: '#E6F2FB', text: '#0E3A5C', border: '#3B8BC2' };
  if (nodeId.includes('Ⅲ-5')) return { bg: '#FBEFE0', text: '#7A4A18', border: '#D4843C' };
  return { bg: '#F0F1F2', text: '#2D3436', border: '#95A5A6' };
}

function shortenId(id) {
  return (id ?? '').replace(/^INe-/, '');
}

// 自訂 X 軸 tick：渲染 NodeBadge 風格的色塊（短 ID + 左側色帶 + 子主題底色）
// Hover → 透過 onTickHover 通知父層，顯示大字 HTML tooltip
function NodeTick({ x, y, payload, dataMap, onTickHover }) {
  const datum = dataMap[payload.value] || {};
  const color = subjectColor(datum.id);
  const label = shortenId(datum.id) || payload.value;
  const padX = 5;
  const w = Math.max(70, label.length * 9 + 22);
  const h = 24;
  return (
    <g
      transform={`translate(${x - w / 2}, ${y + 6})`}
      style={{ cursor: 'help' }}
      onMouseEnter={() => onTickHover?.({ x, yBottom: y + 6 + h, id: datum.id, name: datum.name })}
      onMouseLeave={() => onTickHover?.(null)}
    >
      <rect x={0} y={0} width={w} height={h} rx={5} fill={color.bg} stroke={color.border} strokeWidth={1.5} />
      <rect x={0} y={0} width={4} height={h} fill={color.border} />
      <text x={4 + padX} y={h / 2 + 1} dominantBaseline="middle" fontSize={15} fontWeight={700} fill={color.text} fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}

function NodeTooltip({ active, payload, label, dataMap }) {
  if (active && payload?.length) {
    const datum = dataMap[label] || {};
    return (
      <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-3 text-[15px] max-w-xs">
        <p className="font-mono text-[15px] text-[#95A5A6] mb-0.5">{datum.id}</p>
        <p className="font-bold text-[#2D3436] mb-2 leading-snug text-[15px]">{datum.name || label}</p>
        {payload.map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 text-[15px] mb-1">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-[#636E72]">{p.name}：</span>
            <span className="font-semibold text-[#2D3436]">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function CrossClassNodeChart({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [sortMode, setSortMode] = useState('rate'); // 'rate' | 'order'
  const [tickHover, setTickHover] = useState(null); // {x, yBottom, id, name} | null
  const { nodePassRates, classStats } = overviewData;

  // 計算每個節點的跨班平均、最大跨班落差，並導出 headline 指標
  const { chartData, dataMap, metrics } = useMemo(() => {
    const classKeys = classStats.map((c) => getClassChartKey(c.id));
    const enriched = nodePassRates.map((n) => {
      const short = shortenId(n.id);
      const rates = classKeys.map((k) => (typeof n[k] === 'number' ? n[k] : 0));
      const avg = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
      const gap = rates.length ? Math.max(...rates) - Math.min(...rates) : 0;
      return { ...n, shortId: short, avg, gap };
    });
    const sorted = sortMode === 'rate'
      ? [...enriched].sort((a, b) => a.avg - b.avg)
      : enriched;
    const map = {};
    sorted.forEach((n) => { map[n.shortId] = n; });
    const belowThreshold = enriched.filter((n) => n.avg < MASTERY_THRESHOLD);
    const worstNode = enriched.length
      ? [...enriched].sort((a, b) => a.avg - b.avg)[0]
      : null;
    const biggestGap = enriched.length
      ? [...enriched].sort((a, b) => b.gap - a.gap)[0]
      : null;
    return {
      chartData: sorted,
      dataMap: map,
      metrics: { belowThreshold, worstNode, biggestGap, totalNodes: enriched.length },
    };
  }, [nodePassRates, classStats, sortMode]);

  return (
    <div>
      {/* 標題列：標題 + 排序切換 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-[#2D3436]">各班在每個知識節點的答對率</h3>
          <InfoButton onClick={() => setInfoOpen(true)} />
        </div>
        <label className="flex items-center gap-2 text-[15px] text-[#636E72]">
          排序：
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="border border-[#BDC3C7] rounded-lg px-2 py-1 text-[15px] bg-white cursor-pointer"
          >
            <option value="rate">依答對率（最弱在左）</option>
            <option value="order">依配題原始順序</option>
          </select>
        </label>
      </div>
      <p className="text-[15px] text-[#636E72] mb-5 leading-relaxed">
        虛線是 <span className="font-semibold text-[#DC2626]">70% 掌握門檻</span>，
        長條低於虛線代表該班該節點需要補救（背景紅 = 嚴重 / 黃 = 警示 / 綠 = 已掌握）
      </p>

      {/* Headline 摘要：三張小卡（左 = 指標 label，右 = 數值，中間以細線分隔） */}
      {metrics.totalNodes > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          {/* 未達掌握門檻數量 */}
          <div className={`group relative rounded-lg px-3 py-2 border flex items-center justify-between gap-3 cursor-help ${
            metrics.belowThreshold.length > 0
              ? 'bg-[#FEE2E2] border-[#FCA5A5]'
              : 'bg-[#D1FAE5] border-[#86EFAC]'
          }`}>
            <CardHoverTip text={CARD_TOOLTIPS.below} />
            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-rounded flex-shrink-0 ${
                  metrics.belowThreshold.length > 0 ? 'text-[#DC2626]' : 'text-[#059669]'
                }`}
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {metrics.belowThreshold.length > 0 ? 'warning' : 'check_circle'}
              </span>
              <span className={`text-[15px] font-semibold whitespace-nowrap ${
                metrics.belowThreshold.length > 0 ? 'text-[#991B1B]' : 'text-[#065F46]'
              }`}>
                {metrics.belowThreshold.length > 0 ? '未達門檻' : '全部達標'}
              </span>
            </div>
            <div
              className="h-5 w-px flex-shrink-0"
              style={{ background: metrics.belowThreshold.length > 0 ? '#FCA5A5' : '#86EFAC' }}
            />
            <span className={`text-lg font-bold tabular-nums ${
              metrics.belowThreshold.length > 0 ? 'text-[#991B1B]' : 'text-[#065F46]'
            }`}>
              {metrics.belowThreshold.length}<span className="text-[15px] font-medium opacity-75"> / {metrics.totalNodes}</span>
            </span>
          </div>

          {/* 最弱節點 — 主視覺：平均答對率%；次資訊：節點代號 pill */}
          {metrics.worstNode && (
            <div className="group relative rounded-lg px-3 py-2.5 border bg-[#FFF7ED] border-[#FDBA74] flex items-center justify-between gap-3 cursor-help">
              <CardHoverTip text={CARD_TOOLTIPS.worst} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="material-symbols-rounded flex-shrink-0 text-[#EA580C]"
                  style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  trending_down
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[15px] font-semibold text-[#9A3412] whitespace-nowrap">最弱</span>
                  <span
                    className="text-[15px] font-mono font-bold mt-0.5 px-1.5 rounded inline-block self-start"
                    style={{ background: '#FDBA74', color: '#7C2D12' }}
                  >
                    {shortenId(metrics.worstNode.id)}
                  </span>
                </div>
              </div>
              <div className="h-9 w-px flex-shrink-0 bg-[#FDBA74]" />
              <span className="text-2xl font-bold text-[#9A3412] tabular-nums whitespace-nowrap">
                {Math.round(metrics.worstNode.avg)}<span className="text-[15px] font-medium opacity-75">%</span>
              </span>
            </div>
          )}

          {/* 跨班差異最大 — 主視覺：差距%；次資訊：節點代號 pill */}
          {metrics.biggestGap && (
            <div className="group relative rounded-lg px-3 py-2.5 border bg-[#EFF6FF] border-[#93C5FD] flex items-center justify-between gap-3 cursor-help">
              <CardHoverTip text={CARD_TOOLTIPS.gap} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="material-symbols-rounded flex-shrink-0 text-[#2563EB]"
                  style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  bar_chart
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[15px] font-semibold text-[#1E40AF] whitespace-nowrap">跨班差距</span>
                  <span
                    className="text-[15px] font-mono font-bold mt-0.5 px-1.5 rounded inline-block self-start"
                    style={{ background: '#93C5FD', color: '#1E3A8A' }}
                  >
                    {shortenId(metrics.biggestGap.id)}
                  </span>
                </div>
              </div>
              <div className="h-9 w-px flex-shrink-0 bg-[#93C5FD]" />
              <span className="text-2xl font-bold text-[#1E40AF] tabular-nums whitespace-nowrap">
                {Math.round(metrics.biggestGap.gap)}<span className="text-[15px] font-medium opacity-75">%</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 摘要卡與圖表之間的視覺分隔 */}
      <hr className="border-t border-dashed border-[#D5D8DC] my-4" />

      {/* 圖例列 */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {classStats.map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-[15px] text-[#636E72]">{c.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-7 border-t-[3px] border-dashed border-[#DC2626]" />
          <span className="text-[15px] text-[#DC2626] font-semibold">70% 掌握門檻</span>
        </div>
        <div className="flex items-center gap-3 ml-auto text-[15px]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-4 rounded-sm" style={{ backgroundColor: '#3B8BC2' }} />
            <span className="text-[#0E3A5C]">A 溶解</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-4 rounded-sm" style={{ backgroundColor: '#D4843C' }} />
            <span className="text-[#7A4A18]">B 酸鹼</span>
          </span>
        </div>
      </div>

      <div className="relative bg-white border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 360 }}>
        {/* Tick hover 大字節點名稱 tooltip — 位於 chart 上方 */}
        {tickHover && (
          <div
            className="absolute pointer-events-none z-30"
            style={{
              left: `${(tickHover.x / 1000) * 100}%`,
              bottom: 16,
              transform: 'translateX(-50%)',
              maxWidth: 'min(360px, 90%)',
            }}
          >
            <div className="bg-[#2D3436] text-white rounded-xl shadow-lg px-4 py-3">
              <div className="font-mono text-[15px] font-bold text-[#FBE9C7] mb-1">{tickHover.id}</div>
              <div className="text-[17px] font-medium leading-relaxed">{tickHover.name}</div>
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
              style={{
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '7px solid #2D3436',
              }}
            />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 80, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            {/* 三段色帶背景：紅 < 50% / 黃 50–70% / 綠 ≥ 70% */}
            <ReferenceArea y1={0} y2={WARN_THRESHOLD} fill="#FEE2E2" fillOpacity={0.35} />
            <ReferenceArea y1={WARN_THRESHOLD} y2={MASTERY_THRESHOLD} fill="#FEF3C7" fillOpacity={0.35} />
            <ReferenceArea y1={MASTERY_THRESHOLD} y2={100} fill="#D1FAE5" fillOpacity={0.35} />
            <XAxis
              dataKey="shortId"
              tick={<NodeTick dataMap={dataMap} onTickHover={setTickHover} />}
              interval={0}
              height={40}
              tickLine={false}
              axisLine={{ stroke: '#BDC3C7' }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 13, fill: '#636E72' }}
              width={64}
            >
              <Label value="答對率 (%)" position="insideLeft" angle={-90} style={{ textAnchor: 'middle', fontSize: 13, fill: '#2D3436', fontWeight: 600 }} offset={-2} />
            </YAxis>
            <Tooltip content={<NodeTooltip dataMap={dataMap} />} cursor={{ fill: 'rgba(143,200,122,0.18)' }} />
            <ReferenceLine
              y={MASTERY_THRESHOLD}
              stroke="#DC2626"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              label={{ value: '70% 門檻', position: 'right', fontSize: 13, fill: '#DC2626', fontWeight: 700 }}
            />
            {classStats.map(c => (
              <Bar key={c.id} dataKey={getClassChartKey(c.id)} name={c.name} fill={c.color} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['cross-class-node-chart']} />
    </div>
  );
}
