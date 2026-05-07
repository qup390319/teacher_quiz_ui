import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { useClassAnswers, useQuizStats } from '../../../../hooks/useAnswers';
import { buildMisconceptionStudents } from './classReportData';

export default function MisconceptionDistribution({ quizId, classId, totalStudents }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [infoOpen, setInfoOpen] = useState(false);
  const { data: stats } = useQuizStats(quizId, classId);
  const { data: classAnswers } = useClassAnswers(quizId, classId);
  const misconStudents = buildMisconceptionStudents(stats, classAnswers);

  const sorted = Object.entries(misconStudents)
    .map(([id, students]) => ({ id, students, pct: Math.round((students.length / totalStudents) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const toggle = (id) => setExpandedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">迷思概念分佈</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-4">依佔比由高至低排列，點擊「展開」可查看持有該迷思的學生名單</p>
      <div className="space-y-2">
        {sorted.map(({ id, students, pct }) => {
          const node = knowledgeNodes.find(n => n.misconceptions.find(m => m.id === id));
          const miscon = node?.misconceptions.find(m => m.id === id);
          const isExpanded = expandedIds.has(id);
          const urgencyColor = pct >= 50
            ? { bar: '#F28B95', badge: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }
            : pct >= 30
            ? { bar: '#F4D03F', badge: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
            : { bar: '#BDC3C7', badge: 'bg-[#EEF5E6] text-[#636E72] border-[#D5D8DC]' };

          return (
            <div key={id} className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${urgencyColor.badge}`}>{pct}%</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D3436] truncate">{miscon?.label}</p>
                  <p className="text-xs text-[#95A5A6] truncate">{node?.name} · {id}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-28 bg-[#D5D8DC] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: urgencyColor.bar }} />
                  </div>
                  <span className="text-xs text-[#636E72] w-14 text-right">{students.length}/{totalStudents} 人</span>
                </div>
                <button onClick={() => toggle(id)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#636E72] hover:text-[#2D3436] transition-colors flex-shrink-0 border border-[#BDC3C7] bg-white rounded-xl px-2.5 py-1">
                  {isExpanded ? '收合' : `展開 ${students.length} 人`}
                  <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {isExpanded && (
                <div className="px-4 pb-3 pt-0 border-t border-[#D5D8DC] bg-white">
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {students.map(name => (
                      <span key={name} className="text-xs bg-[#EEF5E6] border border-[#D5D8DC] text-[#636E72] px-2.5 py-1 rounded-full">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['misconception-distribution']}
        dynamicStatus={`目前共偵測到 ${sorted.length} 種迷思概念。持有率最高的迷思為「${sorted[0]?.label ?? '—'}」（${sorted[0]?.pct ?? 0}%）。高頻迷思（≥30%）共 ${sorted.filter(m => m.pct >= 30).length} 種。`} />
    </div>
  );
}
