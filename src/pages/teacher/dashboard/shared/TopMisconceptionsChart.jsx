import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { CLASS_KEY_MAP } from './helpers';

const getBarColor = (avg) => avg >= 45 ? '#F28B95' : avg >= 30 ? '#F4D03F' : '#BDC3C7';

function MisconTooltip({ active, payload, label, sorted, classStats }) {
  if (active && payload?.length) {
    const item = sorted.find(m => m.label === label);
    return (
      <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm" style={{ maxWidth: 220 }}>
        <p className="font-bold text-[#2D3436] mb-1 text-xs leading-snug">{label}</p>
        <p className="text-xs text-[#95A5A6] mb-2">{item?.node}</p>
        {classStats.map(c => {
          const key = CLASS_KEY_MAP[c.id] ?? c.id;
          return (
            <div key={c.id} className="flex items-center gap-2 text-xs mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[#636E72]">{c.name}：{item?.[key] ?? 0}%</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function TopMisconceptionsChart({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { topMisconceptions, classStats } = overviewData;
  const sorted = [...topMisconceptions].sort((a, b) => b.avg - a.avg);

  if (sorted.length === 0) {
    return (
      <div>
        <h3 className="text-base font-bold text-[#2D3436] mb-2">跨班高頻迷思</h3>
        <div className="bg-[#C8EAAE] rounded-2xl border border-[#BDC3C7] p-6 text-center">
          <p className="text-[#3D5A3E] font-semibold">無顯著高頻迷思</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">跨班高頻迷思 Top {sorted.length}</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-4">依全年級平均持有率由高至低排列，找出需年級層級教學策略的迷思</p>
      <div className="flex items-center gap-4 mb-4">
        {[{ color: '#F28B95', label: '≥45% 急需年級補救' }, { color: '#F4D03F', label: '30–44% 建議關注' }, { color: '#BDC3C7', label: '<30% 低風險' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" horizontal={false} />
            <XAxis type="number" domain={[0, 70]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#636E72' }} width={140} />
            <Tooltip content={<MisconTooltip sorted={sorted} classStats={classStats} />} />
            <Bar dataKey="avg" name="全年級平均" radius={[0, 6, 6, 0]}>
              {sorted.map(entry => (<Cell key={entry.id} fill={getBarColor(entry.avg)} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['top-misconceptions-chart']} />
    </div>
  );
}
