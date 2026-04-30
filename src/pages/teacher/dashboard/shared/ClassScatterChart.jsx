import { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';

function ScatterTooltip({ active, payload }) {
  if (active && payload?.length) {
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
          <span className="font-bold text-[#2D3436]">{d.name}</span>
        </div>
        <div className="space-y-0.5 text-xs text-[#636E72]">
          <p>掌握率：<span className="font-semibold text-[#2D3436]">{d.x}%</span></p>
          <p>完成率：<span className="font-semibold text-[#2D3436]">{d.y}%</span></p>
          <p>高頻迷思：<span className="font-semibold text-[#2D3436]">{d.miscon} 個</span></p>
        </div>
      </div>
    );
  }
  return null;
}

function ScatterDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={payload.color} fillOpacity={0.9} stroke="white" strokeWidth={2} />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize={11} fill="#2D3436" fontWeight="600">{payload.name}</text>
    </g>
  );
}

export default function ClassScatterChart({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { classStats } = overviewData;

  const scatterData = classStats.map(c => ({ name: c.name, x: c.avgPassRate, y: c.completionRate, color: c.color, miscon: c.highFreqMisconCount }));

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">完成率 × 掌握率 班級分布</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-3">右上角 = 作答完整且掌握良好；左下角 = 優先介入</p>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {[{ label: '右上：表現良好', cls: 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]' }, { label: '左下：優先介入', cls: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }, { label: '其他：需要關注', cls: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }].map(q => (
          <span key={q.label} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${q.cls}`}>{q.label}</span>
        ))}
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 40, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis type="number" dataKey="x" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }}
              label={{ value: '掌握率', position: 'insideBottom', offset: -14, fontSize: 11, fill: '#636E72' }} />
            <YAxis type="number" dataKey="y" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }}
              label={{ value: '完成率', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: '#636E72' }} />
            <ZAxis range={[100, 100]} />
            <Tooltip content={<ScatterTooltip />} />
            <ReferenceLine x={50} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '50%', position: 'top', fontSize: 10, fill: '#95A5A6' }} />
            <ReferenceLine y={60} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '60%', position: 'right', fontSize: 10, fill: '#95A5A6' }} />
            <Scatter data={scatterData} shape={<ScatterDot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['class-scatter-chart']} />
    </div>
  );
}
