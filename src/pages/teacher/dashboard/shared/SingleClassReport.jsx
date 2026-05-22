import { useState } from 'react';
import InfoButton from '../../../../components/InfoButton';
import InfoDrawer from '../../../../components/InfoDrawer';
import { CHART_INFO } from '../../../../data/chartInfoConfig';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import { useClassAnswers, useQuizStats } from '../../../../hooks/useAnswers';
import {
  buildClassAnswerRows,
  buildMisconceptionStudents,
  buildPassRates,
} from './classReportData';
import { getAssignment } from './helpers';
import { buildClassSummaryPayload } from './summaryPayload';
import RagflowSummaryPanel from '../../../../components/teacher/RagflowSummaryPanel';
import AIDiagnosisSummary from './AIDiagnosisSummary';
import WeeklyActionChecklist from './WeeklyActionChecklist';
import BreakdownChart from './BreakdownChart';
import MisconceptionDistribution from './MisconceptionDistribution';
import HeatmapView from './HeatmapView';
import QuestionErrorRateChart from './QuestionErrorRateChart';
import ReasoningQualityBars from './ReasoningQualityBars';

export default function SingleClassReport({ cls, assignments, quizzes, quizId }) {
  const classId = cls.id;
  const { data: stats, isLoading: statsLoading } = useQuizStats(quizId, classId);
  const { data: classAnswers, isLoading: answersLoading } = useClassAnswers(quizId, classId);

  // 從後端 API 派生出舊版 mock 介面 shape，子元件不需重寫
  const passRates = buildPassRates(stats);
  const misconStudents = buildMisconceptionStudents(stats, classAnswers);
  const classAnswerRows = buildClassAnswerRows(classAnswers);

  // 該班的學生人數：以 stats.studentCount 為準（DB students 表）
  const totalStudents = stats?.studentCount ?? classAnswerRows.length;
  const submittedCount = stats?.submittedCount ?? 0;
  const completionRate = stats?.completionRate ?? 0;
  const selectedAssignment = getAssignment(assignments, classId, quizId);
  const hasData = submittedCount > 0;

  const [statInfoKey, setStatInfoKey] = useState(null);

  if (statsLoading || answersLoading) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center text-[#636E72] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        載入診斷資料中…
      </div>
    );
  }

  if (!hasData) {
    const quizTitle = quizzes.find(q => q.id === quizId)?.title ?? '此題組';
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <div className="w-16 h-16 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[#636E72] font-medium mb-1">尚無作答資料</p>
        <p className="text-sm text-[#95A5A6]">{cls.name}「{quizTitle}」目前沒有學生已完成作答，請至派題管理確認派題狀態</p>
      </div>
    );
  }

  const passRateValues = Object.values(passRates);
  const avgPassRate = passRateValues.length > 0
    ? Math.round(passRateValues.reduce((s, v) => s + v, 0) / passRateValues.length)
    : (stats?.averageMastery ?? 0);

  const topMisconEntry = Object.entries(misconStudents)
    .map(([id, s]) => ({ id, pct: totalStudents > 0 ? Math.round((s.length / totalStudents) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)[0];
  const topMisconNode = knowledgeNodes.find(n => n.misconceptions.find(m => m.id === topMisconEntry?.id));
  const topMisconLabel = topMisconNode?.misconceptions.find(m => m.id === topMisconEntry?.id)?.label;

  const totalStudentsAssign = selectedAssignment?.totalStudents ?? totalStudents;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '參與學生', value: `${totalStudents} 人`, tip: '已完成診斷測驗的學生數', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]',
            infoKey: 'stat-card-participants', dynamicStatus: `目前有 ${totalStudents} 位學生已完成本次診斷測驗並提交作答。` },
          { label: '作答完成率', value: `${completionRate}%`, tip: `${submittedCount} / ${totalStudentsAssign} 人已提交`,
            color: completionRate === 100 ? 'text-[#3D5A3E]' : completionRate >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
            bg: completionRate === 100 ? 'bg-[#C8EAAE]' : completionRate >= 60 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
            infoKey: 'stat-card-completion', dynamicStatus: `作答完成率 ${completionRate}%（${submittedCount}/${totalStudentsAssign} 人）。${completionRate < 80 ? '建議補齊作答後再解讀。' : '具代表性。'}` },
          { label: '平均答對率', value: `${avgPassRate}%`, tip: '各概念答對率的平均值',
            color: avgPassRate >= 70 ? 'text-[#3D5A3E]' : avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
            bg: avgPassRate >= 70 ? 'bg-[#C8EAAE]' : avgPassRate >= 50 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
            infoKey: 'stat-card-mastery', dynamicStatus: `平均答對率 ${avgPassRate}%。${avgPassRate >= 70 ? '整體表現良好。' : avgPassRate >= 50 ? '建議針對低答對率節點補強。' : '建議安排補救教學。'}` },
          { label: '最高風險迷思', value: topMisconEntry ? `${topMisconEntry.pct}%` : '—', tip: topMisconLabel ?? '無高頻迷思',
            color: topMisconEntry && topMisconEntry.pct >= 30 ? 'text-[#E74C5E]' : 'text-[#3D5A3E]',
            bg: topMisconEntry && topMisconEntry.pct >= 30 ? 'bg-[#FAC8CC]' : 'bg-[#C8EAAE]',
            infoKey: 'stat-card-top-misconception',
            dynamicStatus: topMisconEntry
              ? `最高風險：「${topMisconLabel}」${topMisconEntry.pct}%。${topMisconEntry.pct >= 30 ? '建議優先補救。' : '暫不需緊急介入。'}`
              : '無偵測到迷思。' },
        ].map(s => (
          <div key={s.label} className={`group relative rounded-2xl border border-[#BDC3C7] p-4 ${s.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-help`}>
            <p className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-[#2D3436]">{s.label}</p>
              <InfoButton onClick={() => setStatInfoKey(s.infoKey)} />
            </div>
            {s.tip && (
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 max-w-[85vw] opacity-0 group-hover:opacity-100 transition-opacity z-30" role="tooltip">
                <div className="bg-[#2D3436] text-white text-[15px] font-medium leading-relaxed px-3 py-2 rounded-lg shadow-lg">{s.tip}</div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #2D3436' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <InfoDrawer isOpen={statInfoKey !== null} onClose={() => setStatInfoKey(null)}
        config={statInfoKey ? CHART_INFO[statInfoKey] : null}
        dynamicStatus={statInfoKey ? [
          { infoKey: 'stat-card-participants', dynamicStatus: `${totalStudents} 位學生已完成作答。` },
          { infoKey: 'stat-card-completion', dynamicStatus: `完成率 ${completionRate}%（${submittedCount}/${totalStudentsAssign} 人）。${completionRate < 80 ? '建議補齊後再解讀。' : '具代表性。'}` },
          { infoKey: 'stat-card-mastery', dynamicStatus: `平均答對率 ${avgPassRate}%。${avgPassRate >= 70 ? '表現良好。' : avgPassRate >= 50 ? '建議補強低答對率節點。' : '建議安排補救教學。'}` },
          { infoKey: 'stat-card-top-misconception', dynamicStatus: topMisconEntry ? `最高風險：「${topMisconLabel}」${topMisconEntry.pct}%。${topMisconEntry.pct >= 30 ? '建議優先補救。' : '暫不需介入。'}` : '無迷思。' },
        ].find(item => item.infoKey === statInfoKey)?.dynamicStatus : undefined} />

      <AIDiagnosisSummary quizId={quizId} classId={classId} totalStudents={totalStudents} />
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <WeeklyActionChecklist quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <BreakdownChart quizId={quizId} classId={classId} />
      </div>

      {/* ─── 進階分析（預設摺疊，減少首屏捲動量） ─── */}
      <AdvancedSection title="迷思概念詳細分析" subtitle="迷思分布 · 題目錯誤率 · 選項明細矩陣">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#D5D8DC] p-6">
            <MisconceptionDistribution quizId={quizId} classId={classId} totalStudents={totalStudents} />
          </div>
          <div className="bg-white rounded-2xl border border-[#D5D8DC] p-6">
            <QuestionErrorRateChart quizId={quizId} classId={classId} totalStudents={totalStudents} />
          </div>
          <div className="bg-white rounded-2xl border border-[#D5D8DC] p-6">
            <HeatmapView quizId={quizId} classId={classId} totalStudents={totalStudents} />
          </div>
        </div>
      </AdvancedSection>

      <AdvancedSection title="追問對話分析" subtitle="學生推理品質 · AI 文獻診斷摘要">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#D5D8DC] p-6">
            <ReasoningQualityBars quizId={quizId} classId={classId} />
          </div>
          <RagflowSummaryPanel
            scope="class"
            payload={buildClassSummaryPayload(quizId, quizzes.find((q) => q.id === quizId)?.title ?? '本次題組', cls)}
            title={`${cls.name} AI 診斷摘要（文獻引用版 · N2）`}
          />
        </div>
      </AdvancedSection>
    </div>
  );
}

function AdvancedSection({ title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 flex items-center justify-between gap-3 hover:bg-[#FAFBFC] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-rounded text-[#636E72]" style={{ fontSize: 22 }}>tune</span>
          <div className="text-left">
            <p className="font-bold text-[#2D3436]">{title}</p>
            <p className="text-sm text-[#95A5A6] mt-0.5">{subtitle}</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-[#636E72] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-[#EFF1F3]">
          {children}
        </div>
      )}
    </div>
  );
}
