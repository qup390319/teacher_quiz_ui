import { useMemo } from 'react';
import { useClassFollowups } from '../../../../hooks/useAnswers';
import { CAUSE_CATEGORIES, CAUSE_COLOR_THEMES } from '../../../../data/misconceptionCauses';

/**
 * 成因類型統計（教師端診斷報告）。
 *
 * 把該班所有追問結果的 `causeIds`（迷思成因分類，1–9，由 AI 歸類）攤平加總。
 * 一筆追問可帶多個成因，故以「命中該成因的人次」計；百分比分母為「至少有一個
 * 成因的追問筆數」（denomRows），故各列百分比可不互斥、總和可 > 100%。
 * 依人次由多到少排序，只列出有命中的成因。資料來源同 ReasoningQualityBars。
 */
export default function CauseTypeDistribution({ quizId, classId }) {
  const { data: followups, isLoading } = useClassFollowups(quizId, classId);

  const { ranked, denomRows } = useMemo(() => {
    const rows = followups?.rows ?? [];
    const counts = new Map();
    let withCause = 0;
    rows.forEach((r) => {
      const ids = Array.isArray(r.causeIds) ? r.causeIds : [];
      if (ids.length > 0) withCause += 1;
      new Set(ids).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    });
    const list = CAUSE_CATEGORIES
      .map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
    return { ranked: list, denomRows: withCause };
  }, [followups]);

  if (isLoading) {
    return <p className="text-sm text-[#95A5A6]">載入成因統計資料中…</p>;
  }

  if (ranked.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-2">成因類型統計</h3>
        <p className="text-sm text-[#95A5A6]">尚無已歸類成因的追問結果可統計</p>
      </div>
    );
  }

  const maxCount = ranked[0].count;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-lg font-bold text-[#2D3436]">成因類型統計</h3>
        <span className="text-sm text-[#95A5A6]">迷思可能的來源，依人次排序（{denomRows} 筆有成因）</span>
      </div>
      <p className="text-sm text-[#95A5A6] mb-4">
        由 AI 依追問對話歸類；一位學生可能同時命中多個成因，故各列百分比不互斥、總和可能超過 100%。
      </p>

      <div className="space-y-2.5">
        {ranked.map((c) => {
          const theme = CAUSE_COLOR_THEMES[c.color] ?? CAUSE_COLOR_THEMES.gray;
          const widthPct = maxCount > 0 ? (c.count / maxCount) * 100 : 0;
          const sharePct = denomRows > 0 ? Math.round((c.count / denomRows) * 100) : 0;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-40 flex-shrink-0 text-sm text-[#2D3436] leading-tight">{c.name}</span>
              <div className="flex-1 h-6 rounded-md bg-[#F4F6F8] overflow-hidden">
                <div
                  className={`h-full rounded-md ${theme.badge}`}
                  style={{ width: `${Math.max(widthPct, 4)}%` }}
                  title={`${c.name}：${c.count} 人次`}
                />
              </div>
              <span className="w-24 flex-shrink-0 text-right text-sm text-[#636E72]">
                {c.count} 人次（{sharePct}%）
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
