import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { useQuiz } from '../../../../hooks/useQuizzes';
import { useQuizStats } from '../../../../hooks/useAnswers';
import { buildQuestionStats } from './classReportData';

export default function QuestionErrorRateChart({ quizId, classId, totalStudents }) {
  const { data: quiz } = useQuiz(quizId);
  const { data: statsData } = useQuizStats(quizId, classId);
  const questionStats = buildQuestionStats(statsData);
  const questions = quiz?.questions ?? [];

  const data = questions.map((q, idx) => {
    const stats = questionStats[q.id] ?? {};
    const correctTag = q.options.find(o => o.diagnosis === 'CORRECT')?.tag;
    const correctCount = correctTag ? (stats[correctTag] || 0) : 0;
    const errorCount = totalStudents > 0 ? totalStudents - correctCount : 0;
    const errorRate = totalStudents > 0 ? Math.round((errorCount / totalStudents) * 100) : 0;
    const node = knowledgeNodes.find(n => n.id === q.knowledgeNodeId);
    const topMiscon = q.options
      .filter(o => o.diagnosis !== 'CORRECT')
      .map(o => ({ tag: o.tag, count: stats[o.tag] || 0, diagnosis: o.diagnosis }))
      .sort((a, b) => b.count - a.count)[0];
    const topMisconLabel = topMiscon
      ? node?.misconceptions.find(m => m.id === topMiscon.diagnosis)?.label
      : null;

    return {
      name: `Q${idx + 1}`,
      questionId: q.id,
      errorRate,
      errorCount,
      correctCount,
      totalStudents,
      stem: q.stem.length > 30 ? q.stem.slice(0, 30) + '…' : q.stem,
      nodeName: node?.name ?? q.knowledgeNodeId,
      nodeId: q.knowledgeNodeId,
      topMisconLabel,
      topMisconCount: topMiscon?.count ?? 0,
    };
  });

  const avgErrorRate = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.errorRate, 0) / data.length)
    : 0;

  return (
    <div>
      <div className="mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#2D3436]">各題錯誤率</h3>
        </div>
        <p className="text-sm text-[#636E72] mt-0.5">
          全班各題的答錯比例，紅色虛線為班級平均錯誤率（{avgErrorRate}%）
        </p>
      </div>

      {data.length > 0 ? (
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 48)}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 80, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                tick={{ fontSize: 12, fill: '#636E72' }} />
              <YAxis type="category" dataKey="name" width={60}
                tick={{ fontSize: 12, fill: '#2D3436', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={avgErrorRate} stroke="#E74C5E" strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value: `平均 ${avgErrorRate}%`, position: 'top', fill: '#E74C5E', fontSize: 11 }} />
              <Bar dataKey="errorRate" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.errorRate >= 50 ? '#F28B95' : d.errorRate >= 30 ? '#F4D03F' : '#A7D696'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 flex items-center gap-4 text-xs text-[#636E72]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#F28B95]" /> 高錯誤率（≥50%）
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#F4D03F]" /> 中等（30–49%）
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#A7D696]" /> 低錯誤率（＜30%）
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#95A5A6] mt-3">尚無題目資料</p>
      )}

    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#BDC3C7] rounded-xl px-3 py-2 shadow-lg text-xs max-w-[240px]">
      <p className="font-bold text-[#2D3436] mb-1">{d.name}：{d.nodeName}</p>
      <p className="text-[#636E72] mb-1.5 leading-snug">{d.stem}</p>
      <div className="space-y-0.5">
        <p><span className="text-[#E74C5E] font-bold">{d.errorRate}%</span> 錯誤率（{d.errorCount}/{d.totalStudents} 人答錯）</p>
        {d.topMisconLabel && (
          <p className="text-[#E74C5E]">最常見迷思：{d.topMisconLabel}（{d.topMisconCount} 人）</p>
        )}
      </div>
    </div>
  );
}
