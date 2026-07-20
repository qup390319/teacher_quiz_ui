import { useMemo } from 'react';
import { useClassFollowups } from '../../../../hooks/useAnswers';
import {
  ERROR_TYPES,
  ERROR_TYPE_LABELS,
  ERROR_TYPE_DESCRIPTIONS,
  ERROR_TYPE_THEMES,
  normalizeErrorType,
} from '../../../../data/errorTypes';

/**
 * 問題類型分布（教師端診斷報告）。
 *
 * 把該班所有追問結果的 `errorType`（解釋型 / 定義型 / 觀察型，由 LLM 判讀）
 * 跨題加總成班級層級分布。百分比以「已分類人次」為分母（三類加總＝100%），
 * 未分類（null）以淡色註記另列，不灌水百分比。資料來源同 ReasoningQualityBars。
 */
export default function ErrorTypeDistribution({ quizId, classId }) {
  const { data: followups, isLoading } = useClassFollowups(quizId, classId);

  const { counts, classified, unclassified } = useMemo(() => {
    const rows = followups?.rows ?? [];
    const c = { EXPLANATION: 0, DEFINITION: 0, OBSERVATION: 0 };
    let unc = 0;
    rows.forEach((r) => {
      const t = normalizeErrorType(r.errorType);
      if (t) c[t] += 1;
      else unc += 1;
    });
    const total = ERROR_TYPES.reduce((s, k) => s + c[k], 0);
    return { counts: c, classified: total, unclassified: unc };
  }, [followups]);

  if (isLoading) {
    return <p className="text-sm text-[#95A5A6]">載入問題類型資料中…</p>;
  }

  if (classified === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-2">問題類型分布</h3>
        <p className="text-sm text-[#95A5A6]">
          尚無可分類的追問結果（學生作答方向多為正確，或對話不足以判讀類型）
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-lg font-bold text-[#2D3436]">問題類型分布</h3>
        <span className="text-sm text-[#95A5A6]">學生答錯的主導方向，分三類（共 {classified} 人次）</span>
      </div>
      <p className="text-sm text-[#95A5A6] mb-4">
        由 AI 依追問對話判讀：解釋型＝卡在「為什麼會這樣」；定義型＝卡在名詞意義；觀察型＝卡在現象判讀。
      </p>

      <div className="grid grid-cols-3 gap-3">
        {ERROR_TYPES.map((k) => {
          const pct = classified > 0 ? Math.round((counts[k] / classified) * 100) : 0;
          const theme = ERROR_TYPE_THEMES[k];
          return (
            <div key={k} className={`rounded-2xl border p-4 ${theme.bg} ${theme.border}`} title={ERROR_TYPE_DESCRIPTIONS[k]}>
              <p className={`text-2xl font-bold mb-0.5 ${theme.text}`}>{pct}%</p>
              <p className={`text-sm font-semibold ${theme.text}`}>{ERROR_TYPE_LABELS[k]}</p>
              <p className={`text-xs opacity-80 mt-0.5 ${theme.text}`}>{counts[k]} 人次</p>
            </div>
          );
        })}
      </div>

      {/* 堆疊長條：三類占比一目了然 */}
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full border border-[#D5D8DC]">
        {ERROR_TYPES.map((k) => {
          const pct = classified > 0 ? (counts[k] / classified) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={k}
              style={{ width: `${pct}%`, backgroundColor: ERROR_TYPE_THEMES[k].bar }}
              title={`${ERROR_TYPE_LABELS[k]} ${Math.round(pct)}%`}
            />
          );
        })}
      </div>

      {unclassified > 0 && (
        <p className="mt-3 text-xs text-[#95A5A6]">
          另有 {unclassified} 人次未分類（作答方向正確或對話不足以判讀），未計入上方百分比。
        </p>
      )}
    </div>
  );
}
