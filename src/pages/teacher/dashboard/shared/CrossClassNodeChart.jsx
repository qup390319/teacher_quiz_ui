import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { CLASS_KEY_MAP } from './helpers';

function NodeTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
        <p className="font-bold text-[#2D3436] mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
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
  const { nodePassRates, classStats } = overviewData;

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">知識節點跨班比較</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-2">同一概念節點，各班通過率並排比較，可快速找出年級共同弱點</p>
      <div className="flex items-center gap-4 mb-4">
        {classStats.map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-xs text-[#636E72]">{c.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t-2 border-dashed border-[#95A5A6]" />
          <span className="text-xs text-[#95A5A6]">70% 掌握門檻</span>
        </div>
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={nodePassRates} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#636E72' }} angle={-15} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <Tooltip content={<NodeTooltip />} />
            <ReferenceLine y={70} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '70%', position: 'right', fontSize: 11, fill: '#95A5A6' }} />
            {classStats.map(c => (
              <Bar key={c.id} dataKey={CLASS_KEY_MAP[c.id] ?? c.id} name={c.name} fill={c.color} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['cross-class-node-chart']} />
    </div>
  );
}
