import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';

export default function ClassStatusCards({ overviewData, onSelectClass }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { classStats } = overviewData;

  const getStatus = (cls) => {
    const good = cls.completionRate >= 60 && cls.avgPassRate >= 50;
    const bad  = cls.completionRate < 60 && cls.avgPassRate < 50;
    if (good) return { label: '表現良好', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]', border: 'border-[#8FC87A]' };
    if (bad)  return { label: '需要介入', color: 'text-[#E74C5E]', bg: 'bg-[#FAC8CC]', border: 'border-[#F5B8BA]' };
    return           { label: '需要關注', color: 'text-[#B7950B]', bg: 'bg-[#FCF0C2]', border: 'border-[#F5D669]' };
  };

  const metrics = [
    { key: 'completionRate', label: '完成率', unit: '%', color: (v) => v >= 80 ? 'text-[#3D5A3E]' : v >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
    { key: 'avgPassRate', label: '掌握率', unit: '%', color: (v) => v >= 70 ? 'text-[#3D5A3E]' : v >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
    { key: 'highFreqMisconCount', label: '高頻迷思', unit: ' 個', color: (v) => v === 0 ? 'text-[#3D5A3E]' : v <= 2 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-bold text-[#2D3436]">各班學習狀況總覽</h3>
          <p className="text-sm text-[#636E72] mt-0.5">三項核心指標一覽，快速掌握各班現況與介入優先序</p>
        </div>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <div className={`grid gap-4 mt-4`} style={{ gridTemplateColumns: `repeat(${classStats.length}, 1fr)` }}>
        {classStats.map((cls) => {
          const status = getStatus(cls);
          return (
            <div key={cls.id} onClick={() => onSelectClass(cls.id)}
              className="bg-white rounded-2xl border border-[#BDC3C7] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer hover:border-[#8FC87A] hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                <span className="text-base font-bold text-[#2D3436]">{cls.name}</span>
              </div>
              <div className="space-y-3 mb-4">
                {metrics.map((m) => { const val = cls[m.key]; return (
                  <div key={m.key} className="flex items-center justify-between">
                    <span className="text-sm text-[#636E72]">{m.label}</span>
                    <span className={`text-sm font-bold ${m.color(val)}`}>{val}{m.unit}</span>
                  </div>
                ); })}
              </div>
              <div className={`rounded-xl px-3 py-2 border text-center ${status.bg} ${status.border}`}>
                <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-xs text-[#95A5A6] text-center mt-3">點擊查看詳細報告 →</p>
            </div>
          );
        })}
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['class-status-cards']} />
    </div>
  );
}
