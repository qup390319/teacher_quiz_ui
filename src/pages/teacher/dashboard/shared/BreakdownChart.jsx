import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { getNodePassRates } from '../../../../data/quizData';

const getBarColor = (rate) => rate >= 70 ? '#8FC87A' : rate >= 50 ? '#F4D03F' : '#F28B95';

function BreakdownTooltip({ active, payload }) {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
        <p className="font-bold text-[#2D3436]">{d.name}</p>
        <p className="text-xs text-[#636E72] mb-1">{d.id}</p>
        <p className="font-semibold" style={{ color: getBarColor(d.passRate) }}>答對率：{d.passRate}%</p>
        <p className="text-xs text-[#95A5A6] mt-0.5">（答對人數 / 全班人數）</p>
      </div>
    );
  }
  return null;
}

export default function BreakdownChart({ quizId, classId }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const passRates = getNodePassRates(quizId, classId);
  const chartData = knowledgeNodes.filter(n => passRates[n.id] !== undefined)
    .map(node => ({ name: node.name, id: node.id, passRate: passRates[node.id] || 0 }));

  const rateValues = Object.values(passRates);
  const avgPassRate = rateValues.length > 0 ? Math.round(rateValues.reduce((s, v) => s + v, 0) / rateValues.length) : 0;
  const belowThreshold = rateValues.filter(r => r < 50).length;
  const breakdownStatus = `目前班級各概念平均答對率為 ${avgPassRate}%。${belowThreshold > 0 ? `共有 ${belowThreshold} 個概念答對率低於 50%，建議優先安排補救教學。` : '所有概念答對率均達 50% 以上，表現良好。'}`;
  const getBarColor = (rate) => rate >= 70 ? '#8FC87A' : rate >= 50 ? '#F4D03F' : '#F28B95';

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">各概念掌握程度分析</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-2">每個概念對應一道診斷題，長條越高代表全班答對比例越高、掌握程度越佳</p>
      <div className="flex items-center gap-4 mb-4">
        {[{ color: '#8FC87A', label: '≥70% 多數學生掌握' }, { color: '#F4D03F', label: '50–69% 部分學生有迷思' }, { color: '#F28B95', label: '<50% 多數學生需補救' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#636E72' }} angle={-15} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <Tooltip content={<BreakdownTooltip />} />
            <ReferenceLine y={70} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '70%', position: 'right', fontSize: 11, fill: '#95A5A6' }} />
            <Bar dataKey="passRate" radius={[8, 8, 0, 0]}>
              {chartData.map(entry => (<Cell key={entry.id} fill={getBarColor(entry.passRate)} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['breakdown-chart']} dynamicStatus={breakdownStatus} />
    </div>
  );
}
