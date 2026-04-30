import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { getMisconceptionStudents, getNodePassRates } from '../../../../data/quizData';

export default function AIDiagnosisSummary({ quizId, classId, totalStudents }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const passRates = getNodePassRates(quizId, classId);
  const misconStudents = getMisconceptionStudents(quizId, classId);

  const passRateValues = Object.values(passRates);
  const avgPassRate = passRateValues.length > 0
    ? Math.round(passRateValues.reduce((s, v) => s + v, 0) / passRateValues.length)
    : 0;

  const highFreqMiscons = Object.entries(misconStudents)
    .map(([id, students]) => ({
      id,
      count: students.length,
      pct: Math.round((students.length / totalStudents) * 100),
    }))
    .filter(({ pct }) => pct >= 30)
    .sort((a, b) => b.pct - a.pct);

  const isGood = avgPassRate >= 70 && highFreqMiscons.length === 0;
  const isWarning = !isGood && (avgPassRate >= 50 || highFreqMiscons.length <= 2);
  const health = isGood
    ? { label: '班級表現良好', color: 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]' }
    : isWarning
    ? { label: '需要關注', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
    : { label: '需要介入', color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' };

  const topMiscon = highFreqMiscons[0];
  const topMisconNode = topMiscon
    ? knowledgeNodes.find(n => n.misconceptions.find(m => m.id === topMiscon.id))
    : null;
  const topMisconLabel = topMisconNode?.misconceptions.find(m => m.id === topMiscon?.id)?.label;

  let coreSentence;
  if (isGood) {
    coreSentence = `概念平均掌握率 ${avgPassRate}%，無高頻迷思需要補救，建議維持現有教學節奏並可安排延伸挑戰活動。`;
  } else if (topMiscon && avgPassRate < 70) {
    coreSentence = `${topMiscon.pct}% 學生持有「${topMisconLabel}」迷思，概念平均掌握率僅 ${avgPassRate}%，建議優先針對此概念進行補救教學。`;
  } else if (topMiscon) {
    coreSentence = `${topMiscon.pct}% 學生持有「${topMisconLabel}」迷思，建議安排針對性補救教學以澄清概念。`;
  } else {
    coreSentence = `概念平均掌握率 ${avgPassRate}%，整體學習情形需要進一步強化，請參考下方各概念分析。`;
  }

  const seenNodeIds = new Set();
  const priorityNodes = highFreqMiscons
    .map(({ id }) => knowledgeNodes.find(n => n.misconceptions.find(m => m.id === id)))
    .filter(Boolean)
    .sort((a, b) => a.level - b.level)
    .filter(node => {
      if (seenNodeIds.has(node.id)) return false;
      seenNodeIds.add(node.id);
      return true;
    });

  const nextStep = isGood
    ? '可設計跨概念的應用情境題，進行延伸學習，強化概念遷移能力。'
    : isWarning
    ? '建議在下次教學中加入針對性例題，觀察學生反應後，再評估是否需要安排補救課。'
    : '建議本週安排一節概念補救課，以小組討論方式澄清核心迷思，再進行診斷複測。';

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
            <h3 className="text-base font-bold text-[#2D3436]">班級診斷摘要</h3>
            <p className="text-xs text-[#636E72]">根據本班診斷結果分析，提供該班學習狀況與具體行動建議</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InfoButton onClick={() => setInfoOpen(true)} />
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${health.color}`}>
            {health.label}
          </span>
        </div>
      </div>

      <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4 mb-4">
        <p className="text-sm text-[#2D3436] leading-relaxed">
          <span className="font-bold text-[#3D5A3E]">核心診斷：</span>
          {coreSentence}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-3">建議教學優先序列</p>
          {priorityNodes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {priorityNodes.map((node, idx) => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#3D5A3E] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#2D3436]">{node.name}</span>
                  </div>
                  {idx < priorityNodes.length - 1 && (
                    <svg className="w-3.5 h-3.5 text-[#95A5A6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#636E72]">無需優先補救的知識節點</p>
          )}
        </div>

        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-2">建議下一步行動</p>
          <p className="text-xs text-[#2D3436] leading-relaxed">{nextStep}</p>
        </div>
      </div>
      <InfoDrawer
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        config={CHART_INFO['ai-diagnosis-summary']}
        dynamicStatus={`目前班級狀態：${health.label}。${coreSentence}`}
      />
    </div>
  );
}
