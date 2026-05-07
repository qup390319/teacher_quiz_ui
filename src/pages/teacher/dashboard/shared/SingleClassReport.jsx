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
import FollowupConversations from './FollowupConversations';

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
    const quizTitle = quizzes.find(q => q.id === quizId)?.title ?? '此考卷';
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
          { label: '參與學生', value: `${totalStudents} 人`, sub: '已完成診斷測驗', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]',
            infoKey: 'stat-card-participants', dynamicStatus: `目前有 ${totalStudents} 位學生已完成本次診斷測驗並提交作答。` },
          { label: '作答完成率', value: `${completionRate}%`, sub: `${submittedCount} / ${totalStudentsAssign} 人已提交`,
            color: completionRate === 100 ? 'text-[#3D5A3E]' : completionRate >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
            bg: completionRate === 100 ? 'bg-[#C8EAAE]' : completionRate >= 60 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
            infoKey: 'stat-card-completion', dynamicStatus: `目前班級作答完成率為 ${completionRate}%（${submittedCount}/${totalStudentsAssign} 人已提交）。${completionRate < 80 ? '完成率偏低，建議補齊作答後再解讀診斷報告。' : '完成率良好，診斷結果具代表性。'}` },
          { label: '概念平均掌握率', value: `${avgPassRate}%`, sub: '全班各概念平均答對率',
            color: avgPassRate >= 70 ? 'text-[#3D5A3E]' : avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
            bg: avgPassRate >= 70 ? 'bg-[#C8EAAE]' : avgPassRate >= 50 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
            infoKey: 'stat-card-mastery', dynamicStatus: `目前班級 5 個知識節點的平均答對率為 ${avgPassRate}%。${avgPassRate >= 70 ? '整體表現良好。' : avgPassRate >= 50 ? '整體表現中等，建議針對低答對率節點進行補強。' : '整體掌握不足，建議安排系統性補救教學。'}` },
          { label: '最高風險迷思', value: topMisconEntry ? `${topMisconEntry.pct}%` : '—', sub: topMisconLabel ?? '無高頻迷思',
            color: topMisconEntry && topMisconEntry.pct >= 30 ? 'text-[#E74C5E]' : 'text-[#3D5A3E]',
            bg: topMisconEntry && topMisconEntry.pct >= 30 ? 'bg-[#FAC8CC]' : 'bg-[#C8EAAE]',
            infoKey: 'stat-card-top-misconception',
            dynamicStatus: topMisconEntry
              ? `目前持有率最高的迷思為「${topMisconLabel}」，持有率 ${topMisconEntry.pct}%（${Math.round(topMisconEntry.pct / 100 * totalStudents)} 位學生）。${topMisconEntry.pct >= 30 ? '已達高頻迷思門檻，建議優先安排補救。' : '持有率低於 30%，暫不需要緊急介入。'}`
              : '目前無偵測到任何迷思。' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-[#BDC3C7] p-4 ${s.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}>
            <div className="flex items-start justify-between mb-0.5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <InfoButton onClick={() => setStatInfoKey(s.infoKey)} />
            </div>
            <p className="text-sm font-semibold text-[#2D3436]">{s.label}</p>
            <p className="text-xs text-[#636E72] mt-0.5 leading-snug">{s.sub}</p>
          </div>
        ))}
      </div>
      <InfoDrawer isOpen={statInfoKey !== null} onClose={() => setStatInfoKey(null)}
        config={statInfoKey ? CHART_INFO[statInfoKey] : null}
        dynamicStatus={statInfoKey ? [
          { infoKey: 'stat-card-participants', dynamicStatus: `目前有 ${totalStudents} 位學生已完成本次診斷測驗並提交作答。` },
          { infoKey: 'stat-card-completion', dynamicStatus: `目前班級作答完成率為 ${completionRate}%（${submittedCount}/${totalStudentsAssign} 人已提交）。${completionRate < 80 ? '完成率偏低，建議補齊作答後再解讀診斷報告。' : '完成率良好，診斷結果具代表性。'}` },
          { infoKey: 'stat-card-mastery', dynamicStatus: `目前班級 5 個知識節點的平均答對率為 ${avgPassRate}%。${avgPassRate >= 70 ? '整體表現良好。' : avgPassRate >= 50 ? '整體表現中等，建議針對低答對率節點進行補強。' : '整體掌握不足，建議安排系統性補救教學。'}` },
          { infoKey: 'stat-card-top-misconception', dynamicStatus: topMisconEntry ? `目前持有率最高的迷思為「${topMisconLabel}」，持有率 ${topMisconEntry.pct}%。${topMisconEntry.pct >= 30 ? '已達高頻迷思門檻，建議優先安排補救。' : '持有率低於 30%，暫不需要緊急介入。'}` : '目前無偵測到任何迷思。' },
        ].find(item => item.infoKey === statInfoKey)?.dynamicStatus : undefined} />

      <RagflowSummaryPanel
        scope="class"
        payload={buildClassSummaryPayload(quizId, quizzes.find((q) => q.id === quizId)?.title ?? '本次考卷', cls)}
        title={`${cls.name} AI 診斷摘要（文獻引用版 · N2）`}
      />
      <AIDiagnosisSummary quizId={quizId} classId={classId} totalStudents={totalStudents} />
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <WeeklyActionChecklist quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <BreakdownChart quizId={quizId} classId={classId} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <MisconceptionDistribution quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <HeatmapView quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-base font-bold text-[#2D3436] mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          學生第二層追問對話完整紀錄
        </h3>
        <p className="text-xs text-[#636E72] mb-4">
          展開後可看到每位學生在追問階段與 AI 老師的完整對話，這是判斷迷思是否真實存在的最直接證據。
        </p>
        <FollowupConversations quizId={quizId} classId={classId} />
      </div>
    </div>
  );
}
