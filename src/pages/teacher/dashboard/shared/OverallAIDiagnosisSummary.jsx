import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';

export default function OverallAIDiagnosisSummary({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { classStats } = overviewData;
  const avgCompletion = Math.round(classStats.reduce((s, c) => s + c.completionRate, 0) / classStats.length);
  const avgPassRate   = Math.round(classStats.reduce((s, c) => s + c.avgPassRate,   0) / classStats.length);
  const riskClasses   = classStats.filter(c => c.completionRate < 60 || c.avgPassRate < 50);
  const incompleteClasses = classStats.filter(c => c.completionRate < 100).sort((a, b) => a.completionRate - b.completionRate);

  const health = riskClasses.length === 0
    ? { label: '年級表現良好',  color: 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]' }
    : riskClasses.length <= 1
    ? { label: '部分班級需關注', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
    : { label: '多班需要介入',   color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' };

  const coreSentence = riskClasses.length === 0
    ? `全年級平均完成率 ${avgCompletion}%，平均掌握率 ${avgPassRate}%，整體學習情形穩定，建議維持現有教學節奏並規劃進階診斷。`
    : incompleteClasses.length > 0
    ? `${incompleteClasses.map(c => c.name).join('、')} 作答完成率偏低（最低 ${incompleteClasses[0].completionRate}%），全年級平均掌握率僅 ${avgPassRate}%，建議優先補齊作答後再進行概念補救。`
    : `全年級平均掌握率 ${avgPassRate}%，${riskClasses.map(c => c.name).join('、')} 高頻迷思嚴重，建議安排跨班補救資源。`;

  const nextStep = riskClasses.length === 0
    ? '可設計跨班交流活動，分享高通過率班級的學習策略，促進年級整體學習品質提升。'
    : incompleteClasses.length > 0
    ? '本週優先催繳未完成作答，待完成率達 80% 以上後，再統一分析各班迷思分佈，規劃補救教學。'
    : '建議本週針對風險班級安排概念補救課，同時追蹤高頻迷思改善情況，下週進行複測比較。';

  return (
    <div className="bg-white rounded-[32px] border border-[#8FC87A] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#3D5A3E] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 20.4a3.001 3.001 0 01-2.121-.872l-.347-.347z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2D3436]">全年級診斷總覽</h3>
            <p className="text-xs text-[#636E72]">依各班診斷結果彙整學習狀況，提供跨班趨勢與優先介入順序</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InfoButton onClick={() => setInfoOpen(true)} />
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${health.color}`}>{health.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '全年級平均完成率', value: `${avgCompletion}%`, color: avgCompletion >= 80 ? 'text-[#3D5A3E]' : avgCompletion >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
          { label: '全年級平均掌握率', value: `${avgPassRate}%`,   color: avgPassRate  >= 70 ? 'text-[#3D5A3E]' : avgPassRate  >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
          { label: '需關注班級數',    value: `${riskClasses.length} 班`, color: riskClasses.length === 0 ? 'text-[#3D5A3E]' : riskClasses.length <= 1 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
        ].map(item => (
          <div key={item.label} className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-3 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-[#636E72] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4 mb-4">
        <p className="text-sm text-[#2D3436] leading-relaxed"><span className="font-bold text-[#3D5A3E]">跨班診斷：</span>{coreSentence}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-3">優先介入順序</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {[...classStats].sort((a, b) => (a.completionRate + a.avgPassRate) - (b.completionRate + b.avgPassRate)).map((cls, idx) => (
              <div key={cls.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#3D5A3E] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                  <span className="text-xs font-semibold text-[#2D3436]">{cls.name}</span>
                  <span className="text-xs text-[#95A5A6]">({cls.completionRate}% / {cls.avgPassRate}%)</span>
                </div>
                {idx < classStats.length - 1 && (
                  <svg className="w-3.5 h-3.5 text-[#95A5A6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#95A5A6] mt-2">括號內：完成率 / 平均掌握率</p>
        </div>
        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-2">年級層級行動建議</p>
          <p className="text-xs text-[#2D3436] leading-relaxed">{nextStep}</p>
        </div>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['overall-ai-summary']} />
    </div>
  );
}
