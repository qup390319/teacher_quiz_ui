import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { getQuizQuestions, getQuestionStats } from '../../../../data/quizData';

export default function HeatmapView({ quizId, classId, totalStudents }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const questions = getQuizQuestions(quizId);
  const rows = questions.map((q, qIdx) => {
    const node = knowledgeNodes.find(n => n.id === q.knowledgeNodeId);
    const stats = getQuestionStats(qIdx, quizId, classId);
    return { q, node, stats };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-bold text-[#2D3436]">題目明細矩陣</h3>
          <p className="text-sm text-[#636E72] mt-0.5">各題選項作答分佈與迷思對應</p>
        </div>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-[#BDC3C7]">
        <table className="w-full text-sm bg-white" style={{ minWidth: '700px' }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase">題目 / 知識節點</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 A</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 B</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 C</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {rows.map(({ q, node, stats }) => (
              <tr key={q.id}>
                <td className="px-4 py-4 align-top" style={{ maxWidth: 220 }}>
                  <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{node?.id}</p>
                  <p className="text-sm font-semibold text-[#2D3436] mb-1">{node?.name}</p>
                  <p className="text-xs text-[#636E72] leading-relaxed">{q.stem}</p>
                </td>
                {q.options.map(opt => {
                  const count = stats[opt.tag] || 0;
                  const pct = Math.round((count / totalStudents) * 100);
                  const isCorrect = opt.diagnosis === 'CORRECT';
                  const bgStyle = isCorrect
                    ? { backgroundColor: `rgba(167,214,150,${pct / 100 * 0.5 + 0.08})` }
                    : { backgroundColor: `rgba(242,139,149,${(isCorrect ? 0 : pct) / 100 * 0.6 + 0.05})` };
                  const misconLabel = isCorrect ? null : node?.misconceptions.find(m => m.id === opt.diagnosis)?.label;
                  return (
                    <td key={opt.tag} className="px-3 py-4 text-center align-top" style={bgStyle}>
                      <div className="font-bold text-lg text-[#2D3436]">{count}</div>
                      <div className="text-xs text-[#636E72] mb-1">{pct}% 學生</div>
                      {isCorrect ? (
                        <span className="text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] px-2 py-0.5 rounded-full">正確答案</span>
                      ) : (
                        <span className="text-xs text-[#E74C5E] bg-[#FAC8CC] border border-[#F5B8BA] px-2 py-0.5 rounded-full leading-tight block mt-1">{misconLabel}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['heatmap-view']} />
    </div>
  );
}
