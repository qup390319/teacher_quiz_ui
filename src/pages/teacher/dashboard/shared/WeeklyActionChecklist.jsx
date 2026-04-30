import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { getMisconceptionStudents } from '../../../../data/quizData';

export default function WeeklyActionChecklist({ quizId, classId, totalStudents }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const misconStudents = getMisconceptionStudents(quizId, classId);
  const highFreqMiscons = Object.entries(misconStudents)
    .map(([id, students]) => ({ id, count: students.length, pct: Math.round((students.length / totalStudents) * 100) }))
    .filter(({ pct }) => pct >= 30)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#2D3436]">本週行動清單</h3>
          <InfoButton onClick={() => setInfoOpen(true)} />
        </div>
        <span className="text-xs text-[#95A5A6]">依緊急程度排序</span>
      </div>
      <p className="text-sm text-[#636E72] mb-4">針對高頻迷思（≥30% 學生持有）的具體補救行動，完成後可安排複測追蹤</p>

      {highFreqMiscons.length === 0 ? (
        <div className="bg-[#C8EAAE] rounded-2xl border border-[#BDC3C7] p-6 text-center">
          <p className="text-[#3D5A3E] font-semibold">班級表現良好，本週無高頻迷思需要補救！</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {highFreqMiscons.map(({ id, pct }, idx) => {
            const node = knowledgeNodes.find(n => n.misconceptions.find(m => m.id === id));
            const miscon = node?.misconceptions.find(m => m.id === id);
            if (!node || !miscon) return null;
            const urgency = pct >= 60
              ? { label: '急需補救', color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }
              : pct >= 45
              ? { label: '建議補救', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
              : { label: '留意觀察', color: 'bg-[#FCF0C2] text-[#D4AC0D] border-[#F5D669]' };
            const prereqNames = node.prerequisites.map(pid => knowledgeNodes.find(n => n.id === pid)?.name).filter(Boolean);

            return (
              <div key={id} className={`bg-white px-5 py-4 ${idx < highFreqMiscons.length - 1 ? 'border-b border-[#D5D8DC]' : ''}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#3D5A3E] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${urgency.color}`}>{urgency.label} {pct}%</span>
                  <p className="text-sm font-semibold text-[#2D3436] flex-1 min-w-0 truncate">{miscon.label}</p>
                  <span className="text-xs text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{node.name}</span>
                </div>
                <div className="flex items-start gap-2 ml-[34px]">
                  <span className="text-[#3D5A3E] font-bold text-sm flex-shrink-0 mt-0.5">→</span>
                  <p className="text-sm text-[#2D3436] leading-relaxed line-clamp-2">{node.teachingStrategy}</p>
                </div>
                {prereqNames.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-[34px]">
                    <span className="text-xs text-[#636E72]">先備確認：</span>
                    {prereqNames.map(name => (
                      <span key={name} className="text-xs bg-[#FCF0C2] border border-[#F5D669] text-[#B7950B] px-2 py-0.5 rounded-full">{name}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="bg-[#EEF5E6] border-t border-[#D5D8DC] px-5 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-[#3D5A3E] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-[#2D3436] leading-relaxed">
              <span className="font-bold text-[#3D5A3E]">下週追蹤：</span>完成上述補救教學後，安排簡短複測確認迷思是否已澄清，再決定是否需要進一步介入。
            </p>
          </div>
        </div>
      )}
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['weekly-action-checklist']}
        dynamicStatus={`目前共有 ${highFreqMiscons.length} 個高頻迷思（持有率 ≥30%）需要教學介入，依緊急程度排列於下方清單。`} />
    </div>
  );
}
