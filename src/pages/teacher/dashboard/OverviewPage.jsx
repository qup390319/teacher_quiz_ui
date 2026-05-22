import { useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { knowledgeNodes } from '../../../data/knowledgeGraph';
import { useAnswerDistribution } from '../../../hooks/useAnswerDistribution';
import NodeBadge from '../../../components/NodeBadge';
import RagflowSummaryPanel from '../../../components/teacher/RagflowSummaryPanel';
import { buildGradeSummaryPayload } from './shared/summaryPayload';
import { getClassChartKey } from './shared/helpers';

/**
 * B1 — 所有班級答題分布（一頁式快照）
 *
 * 結構（從上到下）：
 * 1. 4 個 KPI 卡：答題分布 / 平均答對率 / 平均完成率 / 涵蓋班級
 * 2. 3 個 Top3 縮圖卡：最弱班級 / 最弱節點 / 高頻迷思（各帶跳轉按鈕）
 * 3. AI 摘要（預設折疊收起）
 */
export default function OverviewPage() {
  const { overviewData, quizId, quizzes, classes } = useOutletContext();
  const [searchParams] = useSearchParams();
  const tabQs = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [showAISummary, setShowAISummary] = useState(false);

  const dist = useAnswerDistribution(quizId, overviewData?.classStats ?? []);

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此題組尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此題組派發給班級</p>
      </div>
    );
  }

  const { classStats, nodePassRates, topMisconceptions } = overviewData;
  const avgCompletion = Math.round(classStats.reduce((s, c) => s + c.completionRate, 0) / classStats.length);
  const avgPassRate   = Math.round(classStats.reduce((s, c) => s + c.avgPassRate,   0) / classStats.length);

  // Top3 最弱班級（按答對率升冪）
  const weakestClasses = [...classStats].sort((a, b) => a.avgPassRate - b.avgPassRate).slice(0, 3);

  // Top3 最弱節點（取各班 nodePassRates 平均，取最低 3 個）
  const nodeAvgPassRates = nodePassRates.map((n) => {
    const values = classStats.map((c) => n[getClassChartKey(c.id)] ?? 0);
    const avg = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
    return { id: n.id, name: n.name, avg };
  }).sort((a, b) => a.avg - b.avg).slice(0, 3);

  // Top3 高頻迷思
  const topMiscons = (topMisconceptions ?? []).slice(0, 3);

  const quizTitle = quizzes.find((q) => q.id === quizId)?.title ?? '本次題組';
  const ragflowPayload = buildGradeSummaryPayload(quizId, quizTitle, classes);

  return (
    <div className="space-y-6">
      {/* ─── 4 KPI 卡 ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="lg:col-span-2">
          <DistributionCard dist={dist} classCount={classStats.length} />
        </div>
        <KpiCard label="平均答對率" value={`${avgPassRate}%`}
          sub="答對題數 ÷ 總題數（各班平均）"
          color={avgPassRate >= 70 ? 'good' : avgPassRate >= 50 ? 'warn' : 'bad'} />
        <KpiCard label="平均完成率" value={`${avgCompletion}%`}
          sub="已提交 ÷ 應作答人數（各班平均）"
          color={avgCompletion >= 80 ? 'good' : avgCompletion >= 60 ? 'warn' : 'bad'} />
        <KpiCard label="涵蓋班級" value={`${classStats.length} 班`}
          sub="已派發此題組的班級數"
          color="good" />
      </div>

      {/* ─── 3 Top3 縮圖卡 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Top3Card
          title="最弱班級 Top3"
          subtitle="按平均答對率由低至高"
          linkTo={`/teacher/dashboard/classes${tabQs}`}
          linkLabel="進入各班級成績比較"
          items={weakestClasses.map((c) => ({
            primary: c.name,
            secondary: `答對率 ${c.avgPassRate}% · 完成率 ${c.completionRate}%`,
            valueClass: c.avgPassRate < 50 ? 'text-[#E74C5E]' : c.avgPassRate < 70 ? 'text-[#B7950B]' : 'text-[#3D5A3E]',
          }))} />

        <Top3Card
          title="最弱節點 Top3"
          subtitle="所有班級平均答對率最低的節點"
          linkTo={`/teacher/dashboard/nodes${tabQs}`}
          linkLabel="進入知識節點答對率"
          items={nodeAvgPassRates.map((n) => ({
            badge: <NodeBadge nodeId={n.id} name={n.name} size="sm" />,
            primary: n.name,
            secondary: `平均答對率 ${n.avg}%`,
            valueClass: n.avg < 50 ? 'text-[#E74C5E]' : n.avg < 70 ? 'text-[#B7950B]' : 'text-[#3D5A3E]',
          }))} />

        <Top3Card
          title="高頻迷思 Top3"
          subtitle="所有班級平均持有率最高的迷思"
          linkTo={`/teacher/dashboard/misconceptions${tabQs}`}
          linkLabel="進入高頻迷思排行"
          items={topMiscons.map((m) => {
            const node = knowledgeNodes.find((n) => n.misconceptions?.find((mm) => mm.id === m.id));
            return {
              badge: node ? <NodeBadge nodeId={node.id} name={node.name} size="sm" /> : null,
              primary: m.label || '—',
              secondary: `${m.node ? `${m.node} · ` : ''}持有率 ${m.avg}%`,
              valueClass: m.avg >= 45 ? 'text-[#E74C5E]' : m.avg >= 30 ? 'text-[#B7950B]' : 'text-[#3D5A3E]',
            };
          })} />
      </div>

      {/* ─── AI 摘要：預設折疊 ─── */}
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAISummary((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between gap-3 hover:bg-[#FAFBFC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-[#3D5A3E]" style={{ fontSize: 24 }}>auto_awesome</span>
            <span className="font-bold text-[#2D3436]">AI 文字診斷摘要</span>
            <span className="text-sm text-[#95A5A6]">（文獻引用版 · N1）</span>
          </div>
          <svg className={`w-5 h-5 text-[#636E72] transition-transform ${showAISummary ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAISummary && (
          <div className="px-6 pb-6 border-t border-[#EFF1F3]">
            <RagflowSummaryPanel
              scope="grade"
              payload={ragflowPayload}
              title="所有班級 AI 診斷摘要（文獻引用版 · N1）"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── 子元件 ─────────

function KpiCard({ label, value, sub, color = 'good' }) {
  const palette = {
    good: { text: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]' },
    warn: { text: 'text-[#B7950B]', bg: 'bg-[#FCF0C2]' },
    bad:  { text: 'text-[#E74C5E]', bg: 'bg-[#FAC8CC]' },
  }[color];

  return (
    <div
      className={`group relative rounded-2xl border-2 border-[#BDC3C7] p-3 sm:p-4 ${palette.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${sub ? 'cursor-help' : ''}`}
    >
      <p className={`text-2xl sm:text-3xl font-bold ${palette.text} mb-1 leading-tight`}>{value}</p>
      <p className="text-[15px] font-semibold text-[#2D3436]">{label}</p>
      {/* Hover 提示泡泡：取代原本擠在卡內的副說明 */}
      {sub && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 max-w-[85vw] opacity-0 group-hover:opacity-100 transition-opacity z-30"
          role="tooltip"
        >
          <div className="bg-[#2D3436] text-white text-[15px] font-medium leading-relaxed px-3 py-2 rounded-lg shadow-lg">
            {sub}
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #2D3436',
            }}
          />
        </div>
      )}
    </div>
  );
}

function DistributionCard({ dist, classCount = 0 }) {
  if (dist.loading) {
    return (
      <div className="rounded-2xl border-2 border-[#BDC3C7] p-3 sm:p-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <p className="text-[15px] font-semibold text-[#2D3436] mb-1">答題分布</p>
        <p className="text-[15px] text-[#95A5A6]">載入中…</p>
      </div>
    );
  }

  const { fullCorrect, partial, allWrong, total } = dist;
  const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0;

  return (
    <div className="rounded-2xl border-2 border-[#BDC3C7] p-3 sm:p-4 bg-[#EEF5E6] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <p className="text-[15px] font-semibold text-[#2D3436] mb-2">
        答題分布
        <span className="ml-1 text-[#5A6663] font-normal">
          （{total} 位學生{classCount > 0 ? ` · 共 ${classCount} 個班級` : ''}）
        </span>
      </p>
      <div className="space-y-1.5">
        <DistributionRow label="全對" count={fullCorrect} pct={pct(fullCorrect)} color="#5BA47A" />
        <DistributionRow label="對一半" count={partial} pct={pct(partial)} color="#D4A244" />
        <DistributionRow label="全錯" count={allWrong} pct={pct(allWrong)} color="#E74C5E" />
      </div>
    </div>
  );
}

function DistributionRow({ label, count, pct, color }) {
  return (
    <div className="flex items-center gap-2.5 text-[15px]">
      <span className="w-14 flex-shrink-0 text-[#636E72]">{label}</span>
      <div className="flex-1 h-3.5 bg-white rounded-full border border-[#D5D8DC] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-16 text-right font-bold text-[#2D3436] font-mono tabular-nums">{count} 人</span>
    </div>
  );
}

function Top3Card({ title, subtitle, linkTo, linkLabel, items }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#BDC3C7] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col">
      <div className="mb-4">
        <p className="text-lg font-bold text-[#2D3436]">{title}</p>
        <p className="text-[15px] text-[#95A5A6] mt-1">{subtitle}</p>
      </div>
      <ol className="space-y-2.5 flex-1">
        {items.length === 0 ? (
          <li className="text-[15px] text-[#95A5A6] py-4 text-center">無資料</li>
        ) : items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 px-3 py-2.5 bg-[#FAFBFC] rounded-lg">
            <span className="w-7 h-7 rounded-full bg-[#3D5A3E] text-white text-[15px] flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {item.badge}
                <span className="text-[15px] font-semibold text-[#2D3436] truncate">{item.primary}</span>
              </div>
              <p className={`text-[15px] font-medium mt-1 leading-relaxed ${item.valueClass ?? 'text-[#636E72]'}`}>{item.secondary}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to={linkTo} className="mt-4 text-[15px] font-semibold text-[#3D5A3E] hover:text-[#2D3436] transition-colors text-right flex items-center justify-end gap-1.5">
        {linkLabel}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
