import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '../../../../lib/api';

const FUNNEL_STAGES = [
  { key: 'total',         label: '進入追問', color: '#5DADE2' },
  { key: 'misconception', label: '仍持有迷思', color: '#E74C5E' },
  { key: 'corrected',     label: '已澄清（轉為正解）', color: '#76B563' },
  { key: 'uncertain',     label: '不確定', color: '#B7950B' },
];

function aggregateFollowups(allRows) {
  const total = allRows.length;
  let correct = 0, miscon = 0, uncertain = 0;
  for (const r of allRows) {
    if (r.finalStatus === 'CORRECT') correct++;
    else if (r.finalStatus === 'MISCONCEPTION') miscon++;
    else uncertain++;
  }
  return { total, corrected: correct, misconception: miscon, uncertain };
}

export default function FollowupStatusFunnel({ overviewData, classes, quizId }) {
  const targetClasses = (overviewData?.classStats ?? []).map((c) =>
    classes.find((cl) => cl.id === c.id),
  ).filter(Boolean);

  const followupsQueries = useQueries({
    queries: targetClasses.map((c) => ({
      queryKey: ['followups', quizId, c.id],
      queryFn: () => api.get(`/quizzes/${quizId}/followups?classId=${encodeURIComponent(c.id)}`),
      enabled: !!quizId && !!c.id,
    })),
  });

  const { rowsAll, byClass, loading } = useMemo(() => {
    const isLoading = followupsQueries.some((q) => q.isLoading);
    const rows = [];
    const perClass = [];
    followupsQueries.forEach((q, i) => {
      const r = q.data?.rows ?? [];
      rows.push(...r);
      perClass.push({
        classId: targetClasses[i].id,
        className: targetClasses[i].name,
        ...aggregateFollowups(r),
      });
    });
    return { rowsAll: rows, byClass: perClass, loading: isLoading };
  }, [followupsQueries, targetClasses]);

  if (loading) {
    return <p className="text-sm text-[#95A5A6]">載入追問紀錄中…</p>;
  }

  if (rowsAll.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-2">追問後狀態變化</h3>
        <p className="text-sm text-[#95A5A6]">此題組尚無追問對話紀錄</p>
      </div>
    );
  }

  const agg = aggregateFollowups(rowsAll);
  const stageCounts = {
    total: agg.total,
    misconception: agg.misconception,
    corrected: agg.corrected,
    uncertain: agg.uncertain,
  };
  const maxVal = agg.total || 1;
  const correctedPct = agg.total ? Math.round((agg.corrected / agg.total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold text-[#2D3436]">追問後狀態變化</h3>
        <span className="text-sm text-[#95A5A6]">
          共 {agg.total} 筆 · 澄清率 <span className="font-bold text-[#3D5A3E]">{correctedPct}%</span>
        </span>
      </div>

      <div className="space-y-2">
        {FUNNEL_STAGES.map((s) => {
          const val = stageCounts[s.key];
          const pct = Math.round((val / maxVal) * 100);
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-28 sm:w-32 text-sm font-medium text-[#2D3436] flex-shrink-0">{s.label}</span>
              <div className="flex-1 h-7 bg-[#F4F6F8] rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all"
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-sm font-bold text-white drop-shadow-sm">
                  {val} 筆（{pct}%）
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEE]">
        <p className="text-sm font-semibold text-[#636E72] mb-2">各班澄清率</p>
        <div className="grid grid-cols-3 gap-2">
          {byClass.map((c) => {
            const pct = c.total ? Math.round((c.corrected / c.total) * 100) : 0;
            return (
              <div key={c.classId} className="text-center bg-[#FAFBFC] rounded-lg p-2">
                <p className="text-sm text-[#636E72]">{c.className}</p>
                <p className="text-lg font-bold text-[#3D5A3E]">{pct}%</p>
                <p className="text-[15px] text-[#95A5A6]">{c.corrected} / {c.total}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
