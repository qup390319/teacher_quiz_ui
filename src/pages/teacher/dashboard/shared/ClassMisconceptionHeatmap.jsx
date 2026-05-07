import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { getClassChartKey } from './helpers';

export default function ClassMisconceptionHeatmap({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { topMisconceptions, classStats } = overviewData;
  const sorted = [...topMisconceptions].sort((a, b) => b.avg - a.avg);
  const classKeys = classStats.map(c => ({ key: getClassChartKey(c.id), id: c.id }));

  const getCellBg = (pct) => {
    if (pct >= 50) return { bg: 'rgba(242,139,149,0.75)', text: '#C0392B' };
    if (pct >= 35) return { bg: 'rgba(242,139,149,0.45)', text: '#E74C5E' };
    if (pct >= 20) return { bg: 'rgba(244,208,63,0.55)',  text: '#B7950B' };
    return { bg: 'rgba(200,234,174,0.45)', text: '#3D5A3E' };
  };

  if (sorted.length === 0) return null;

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">班級 × 迷思熱力圖</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-3">顏色越深表示持有該迷思的學生比例越高，一眼找出哪個班在哪個迷思特別嚴重</p>
      <div className="flex items-center gap-4 mb-4">
        {[{ color: 'rgba(242,139,149,0.75)', label: '≥50% 嚴重' }, { color: 'rgba(242,139,149,0.45)', label: '35–49% 偏高' }, { color: 'rgba(244,208,63,0.55)', label: '20–34% 留意' }, { color: 'rgba(200,234,174,0.45)', label: '<20% 低風險' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-[#BDC3C7] flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#BDC3C7]">
        <table className="w-full text-sm bg-white" style={{ minWidth: 560 }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase">迷思概念</th>
              <th className="px-3 py-3 text-xs font-bold text-[#636E72] uppercase">知識節點</th>
              {classStats.map(c => (<th key={c.id} className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">{c.name}</th>))}
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">年級平均</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {sorted.map(item => {
              const avgStyle = getCellBg(item.avg);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-[#2D3436]">{item.label}</p>
                    <p className="text-[10px] text-[#95A5A6] font-mono">{item.id}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] px-2 py-0.5 rounded-full whitespace-nowrap">{item.node}</span>
                  </td>
                  {classKeys.map(({ key, id }) => {
                    const pct = item[key] ?? 0;
                    const style = getCellBg(pct);
                    return (
                      <td key={id} className="px-4 py-3 text-center" style={{ backgroundColor: style.bg }}>
                        <span className="text-sm font-bold" style={{ color: style.text }}>{pct}%</span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center" style={{ backgroundColor: avgStyle.bg }}>
                    <span className="text-sm font-bold" style={{ color: avgStyle.text }}>{item.avg}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['class-misconception-heatmap']} />
    </div>
  );
}
