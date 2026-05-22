import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useScenarios } from '../../hooks/useScenarios';
import { useClasses } from '../../hooks/useClasses';
import { useTreatmentLogs, useTreatmentLog } from '../../hooks/useTreatment';
import {
  deriveSessionOutcome,
  deriveSessionTier,
  aggregateClassOutcomes,
  OUTCOME_META,
  TIER_CLASS,
  TIER_LABEL,
} from '../../lib/treatmentOutcomes';
import { useTour } from '../../context/TourContext';
import { Icon } from '../../components/ui/woodKit';

const CLASS_PALETTE = {
  'class-A': { bg: '#C8EAAE', fg: '#3D5A3E' },
  'class-B': { bg: '#BADDF4', fg: '#2E86C1' },
  'class-C': { bg: '#FCF0C2', fg: '#B7950B' },
};

/**
 * 教師端：概念釐清結果（spec-05 §3.5、spec-08 §5.5）
 *
 * 低認知負荷設計：
 *   - 三色階決策軸（綠 = 已釐清 / 黃 = 需引導 / 紅 = 未釐清），五階段 label 保留在 pill 內文字
 *   - 頂部圖例條，第一次閱讀者即可掌握配色意義
 *   - 表格 5 欄（不含動作 6 欄）：班級 / 學生 + 題組 / 整體結果 / 各題狀態 / 動作
 *   - 指標卡 3 個（避免 4 個資訊塊讓首次閱讀者分心）
 */
export default function TreatmentOutcomes() {
  const navigate = useNavigate();
  const { startTour } = useTour();
  const { data: scenarioQuizzes = [] } = useScenarios();
  const { data: classes = [] } = useClasses();
  const [classFilter, setClassFilter] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const { data: logs = [], isLoading } = useTreatmentLogs({
    classId: classFilter,
    scenarioQuizId: scenarioFilter,
  });

  const rows = useMemo(
    () =>
      logs.map((l) => ({
        sessionId: l.sessionId,
        scenarioQuizId: l.scenarioQuizId,
        scenarioTitle: l.scenarioTitle,
        classId: l.classId ?? '',
        className: l.className ?? '—',
        studentName: l.studentName,
        studentId: l.studentId,
        status: l.status,
        totalQuestions: l.totalQuestions ?? 0,
      })),
    [logs]
  );

  const [outcomeMap, setOutcomeMap] = useState({});
  const setRowOutcome = (sessionId, outcome) =>
    setOutcomeMap((prev) => (prev[sessionId] === outcome ? prev : { ...prev, [sessionId]: outcome }));

  const aggregate = useMemo(() => {
    const loaded = Object.values(outcomeMap).filter(Boolean);
    return aggregateClassOutcomes(loaded);
  }, [outcomeMap]);

  const allLoaded = Object.keys(outcomeMap).length === rows.length && rows.length > 0;

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="mb-3" data-tour="treatment-outcomes-header">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">概念釐清結果</h1>
            <button
              type="button"
              onClick={() => startTour('treatment-outcomes')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              title="瞭解功能"
            >
              <Icon name="tour" className="text-base" />操作導覽
            </button>
          </div>
          <p className="text-[#636E72] mt-1 text-sm">
            一頁掌握每位學生在概念釐清治療對話中的釐清狀況，協助你決定下一步教學。
          </p>
        </div>

        {/* 圖例條（首次閱讀就能理解三色階意義） */}
        <Legend />

        {/* 篩選列 */}
        <div className="bg-white rounded-2xl border border-[#BDC3C7] p-4 my-4 flex flex-wrap items-center gap-3
                        shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-tour="treatment-outcomes-filter">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#636E72]">班級</label>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setOutcomeMap({}); }}
              className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
            >
              <option value="all">全部班級</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#636E72]">概念釐清題組</label>
            <select
              value={scenarioFilter}
              onChange={(e) => { setScenarioFilter(e.target.value); setOutcomeMap({}); }}
              className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
            >
              <option value="all">全部概念釐清</option>
              {scenarioQuizzes.map((sq) => (
                <option key={sq.id} value={sq.id}>{sq.title}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto text-sm text-[#95A5A6]">
            {isLoading ? '載入中…' : `共 ${rows.length} 位學生`}
          </span>
        </div>

        {/* 三張指標卡：學生數 / 已釐清 / 需關注 */}
        <div data-tour="treatment-outcomes-summary">
          <SummaryCards aggregate={aggregate} allLoaded={allLoaded} total={rows.length} />
        </div>

        {/* 結果表格 */}
        {!isLoading && rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-tour="treatment-outcomes-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-[#EEF5E6] text-sm text-[#636E72] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">班級</th>
                    <th className="px-4 py-3 text-left font-semibold">學生</th>
                    <th className="px-4 py-3 text-left font-semibold">整體結果</th>
                    <th className="px-4 py-3 text-left font-semibold">各題狀態</th>
                    <th className="px-4 py-3 text-right font-semibold">動作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF5E6]">
                  {rows.map((r) => (
                    <OutcomeRow
                      key={r.sessionId}
                      row={r}
                      onOutcomeReady={(o) => setRowOutcome(r.sessionId, o)}
                      onView={() => navigate(`/teacher/treatment-logs/${encodeURIComponent(r.sessionId)}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

/* ---------------- 三色階圖例條 ---------------- */
function Legend() {
  const items = [
    { tier: 'ok',   text: '已釐清 — 學生大致掌握，免介入' },
    { tier: 'warn', text: '需引導 — 過程需要鷹架，建議補強' },
    { tier: 'bad',  text: '未釐清 — 對話未收斂，需要再教' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#636E72]">
      {items.map((it) => (
        <span key={it.tier} className="inline-flex items-center gap-1.5">
          <span
            className={`inline-block w-3 h-3 rounded-full border ${TIER_CLASS[it.tier]}`}
            aria-hidden
          />
          <span>{it.text}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------------- 三張指標卡 ---------------- */
function SummaryCards({ aggregate, allLoaded, total }) {
  const items = [
    {
      label: '已派發學生',
      value: total,
      suffix: '人',
      accent: 'text-[#2D3436]',
      hint: null,
    },
    {
      label: '已釐清',
      value: allLoaded ? `${aggregate.clearedCount} / ${total}` : '—',
      suffix: '人',
      accent: 'text-[#3D5A3E]',
      hint: '完整對話收斂、各題皆達標',
    },
    {
      label: '需關注',
      value: allLoaded ? aggregate.needsAttentionCount : '—',
      suffix: '人',
      accent: aggregate.needsAttentionCount > 0 ? 'text-[#E74C5E]' : 'text-[#95A5A6]',
      hint: '有題目需引導或未釐清，建議再教',
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="bg-white rounded-2xl border border-[#BDC3C7] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        >
          <p className="text-sm text-[#636E72] mb-1">{it.label}</p>
          <p className={`text-2xl font-bold ${it.accent}`}>
            {it.value}
            <span className="text-base text-[#95A5A6] ml-1 font-medium">{it.suffix}</span>
          </p>
          {it.hint && (
            <p className="text-sm text-[#95A5A6] mt-1">{it.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 單列：fetch session → derive outcome ---------------- */
function OutcomeRow({ row, onOutcomeReady, onView }) {
  const { data: session, isLoading } = useTreatmentLog(row.sessionId);

  const outcome = useMemo(() => {
    if (!session) return null;
    return deriveSessionOutcome(session, row.totalQuestions);
  }, [session, row.totalQuestions]);

  useEffect(() => {
    if (outcome && !isLoading) onOutcomeReady(outcome);
  }, [outcome, isLoading, onOutcomeReady]);

  const palette = CLASS_PALETTE[row.classId] ?? { bg: '#EEF5E6', fg: '#636E72' };
  const sessionTier = outcome ? deriveSessionTier(outcome.perQuestion) : null;

  return (
    <tr className="hover:bg-[#F9FBF7] transition align-top">
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold border"
          style={{ backgroundColor: palette.bg, color: palette.fg, borderColor: palette.fg }}
        >
          {row.className}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="text-[#2D3436] font-medium leading-tight">{row.studentName}</p>
        <p className="text-sm text-[#95A5A6] leading-tight mt-0.5">{row.scenarioTitle}</p>
      </td>
      <td className="px-4 py-3">
        {isLoading || !outcome ? (
          <span className="text-sm text-[#95A5A6]">計算中…</span>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border
                          ${TIER_CLASS[sessionTier]}`}
            >
              {TIER_LABEL[sessionTier]}
            </span>
            <StarRow value={outcome.starRating} />
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isLoading || !outcome ? (
          <span className="text-sm text-[#95A5A6]">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {outcome.perQuestion.map((q) => (
              <QuestionPill key={q.index} index={q.index} outcome={q.outcome} />
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onView}
          className="px-3 py-1 text-sm font-semibold text-[#3F8B5E] bg-white border border-[#5BA47A]
                     rounded-lg hover:bg-[#EEF5E6] transition whitespace-nowrap"
        >
          查看對話
        </button>
      </td>
    </tr>
  );
}

/* ---------------- 單題 pill：色階為 tier，文字仍寫 outcome label（hover 看細節） ---------------- */
function QuestionPill({ index, outcome }) {
  const meta = OUTCOME_META[outcome];
  const cls = TIER_CLASS[meta.tier];
  return (
    <span
      title={`第 ${index} 題：${meta.label}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm font-semibold border ${cls}`}
    >
      <span className="font-mono">Q{index}</span>
      <span>·</span>
      <span>{meta.label}</span>
    </span>
  );
}

/* ---------------- 星等 ---------------- */
function StarRow({ value }) {
  const stars = [1, 2, 3];
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} 顆星`}>
      {stars.map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= value ? 'text-[#F4D03F]' : 'text-[#D5D8DC]'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

/* ---------------- 空狀態 ---------------- */
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#BDC3C7] p-12 text-center">
      <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4M7 21h10a2 2 0 002-2V7l-5-5H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-[#636E72] font-medium">尚無概念釐清結果</p>
      <p className="text-sm text-[#95A5A6] mt-1">學生完成概念釐清治療後，成效彙整會出現在這裡</p>
    </div>
  );
}
