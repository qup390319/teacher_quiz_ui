import { useOutletContext } from 'react-router-dom';
import OverallAIDiagnosisSummary from './shared/OverallAIDiagnosisSummary';
import ClassScatterChart from './shared/ClassScatterChart';
import RagflowSummaryPanel from '../../../components/teacher/RagflowSummaryPanel';
import { buildGradeSummaryPayload } from './shared/summaryPayload';

export default function OverviewPage() {
  const { overviewData, quizId, quizzes, classes } = useOutletContext();

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此考卷尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此考卷派發給班級</p>
      </div>
    );
  }

  const { classStats } = overviewData;
  const avgCompletion = Math.round(classStats.reduce((s, c) => s + c.completionRate, 0) / classStats.length);
  const avgPassRate   = Math.round(classStats.reduce((s, c) => s + c.avgPassRate,   0) / classStats.length);
  const riskCount     = classStats.filter(c => c.completionRate < 60 || c.avgPassRate < 50).length;

  const cards = [
    { label: '涵蓋班級', value: `${classStats.length} 個`, sub: '已派發此考卷的班級', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]' },
    { label: '平均完成率', value: `${avgCompletion}%`, sub: '各班作答完成率平均',
      color: avgCompletion >= 80 ? 'text-[#3D5A3E]' : avgCompletion >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
      bg:    avgCompletion >= 80 ? 'bg-[#C8EAAE]'   : avgCompletion >= 60 ? 'bg-[#FCF0C2]'   : 'bg-[#FAC8CC]' },
    { label: '平均掌握率', value: `${avgPassRate}%`, sub: '各班概念平均通過率',
      color: avgPassRate >= 70 ? 'text-[#3D5A3E]' : avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
      bg:    avgPassRate >= 70 ? 'bg-[#C8EAAE]'   : avgPassRate >= 50 ? 'bg-[#FCF0C2]'   : 'bg-[#FAC8CC]' },
    { label: '需關注班級', value: `${riskCount} 班`, sub: '完成率<60% 或掌握率<50%',
      color: riskCount === 0 ? 'text-[#3D5A3E]' : riskCount <= 1 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
      bg:    riskCount === 0 ? 'bg-[#C8EAAE]'   : riskCount <= 1 ? 'bg-[#FCF0C2]'   : 'bg-[#FAC8CC]' },
  ];

  const quizTitle = quizzes.find((q) => q.id === quizId)?.title ?? '本次考卷';
  const ragflowPayload = buildGradeSummaryPayload(quizId, quizTitle, classes);

  return (
    <div className="space-y-6">
      <RagflowSummaryPanel
        scope="grade"
        payload={ragflowPayload}
        title="全年級 AI 診斷摘要（文獻引用版 · N1）"
      />

      <OverallAIDiagnosisSummary overviewData={overviewData} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(s => (
          <div key={s.label} className={`rounded-2xl border border-[#BDC3C7] p-3 sm:p-4 ${s.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}>
            <p className={`text-xl sm:text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</p>
            <p className="text-sm font-semibold text-[#2D3436]">{s.label}</p>
            <p className="text-xs text-[#636E72] mt-0.5 leading-snug">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <ClassScatterChart overviewData={overviewData} />
      </div>
    </div>
  );
}
