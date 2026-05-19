import { useMemo } from 'react';
import { useClassFollowups } from '../../../../hooks/useAnswers';
import { useQuiz } from '../../../../hooks/useQuizzes';

const QUALITY_LEVELS = [
  { key: 'SOLID',    label: '推理扎實', color: '#5DADE2' },
  { key: 'PARTIAL',  label: '部分理解', color: '#F4D03F' },
  { key: 'WEAK',     label: '推理薄弱', color: '#E74C5E' },
  { key: 'GUESSING', label: '猜測作答', color: '#A569BD' },
];

export default function ReasoningQualityBars({ quizId, classId }) {
  const { data: quiz } = useQuiz(quizId);
  const { data: followups, isLoading } = useClassFollowups(quizId, classId);

  const perQuestion = useMemo(() => {
    const rows = followups?.rows ?? [];
    const questions = quiz?.questions ?? [];
    const byQ = new Map();
    rows.forEach((r) => {
      if (!r.questionId) return;
      const bucket = byQ.get(r.questionId) ?? { SOLID: 0, PARTIAL: 0, WEAK: 0, GUESSING: 0, UNKNOWN: 0 };
      const key = QUALITY_LEVELS.find((q) => q.key === r.reasoningQuality)?.key;
      if (key) bucket[key]++;
      else bucket.UNKNOWN++;
      byQ.set(r.questionId, bucket);
    });
    return questions
      .map((q, idx) => {
        const b = byQ.get(q.id);
        if (!b) return null;
        const total = b.SOLID + b.PARTIAL + b.WEAK + b.GUESSING + b.UNKNOWN;
        return { qLabel: `Q${idx + 1}`, questionId: q.id, total, ...b };
      })
      .filter(Boolean);
  }, [followups, quiz]);

  if (isLoading) {
    return <p className="text-sm text-[#95A5A6]">載入推理品質資料中…</p>;
  }

  if (perQuestion.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-2">追問推理品質分布</h3>
        <p className="text-sm text-[#95A5A6]">尚無追問對話紀錄可分析推理品質</p>
      </div>
    );
  }

  const totals = QUALITY_LEVELS.reduce((acc, l) => {
    acc[l.key] = perQuestion.reduce((s, q) => s + (q[l.key] ?? 0), 0);
    return acc;
  }, {});
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold text-[#2D3436]">追問推理品質分布</h3>
        <span className="text-xs text-[#95A5A6]">每題進入追問的學生其推理深度，分四級</span>
      </div>

      <div className="space-y-2">
        {perQuestion.map((row) => (
          <div key={row.questionId} className="flex items-center gap-2">
            <span className="w-10 text-xs font-mono text-[#2D3436] flex-shrink-0">{row.qLabel}</span>
            <div className="flex-1 h-6 flex overflow-hidden rounded-md bg-[#F4F6F8]">
              {QUALITY_LEVELS.map((l) => {
                const v = row[l.key] ?? 0;
                if (!v) return null;
                const pct = (v / row.total) * 100;
                return (
                  <div
                    key={l.key}
                    title={`${l.label}：${v} 人`}
                    className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${pct}%`, backgroundColor: l.color }}
                  >
                    {pct >= 12 ? v : ''}
                  </div>
                );
              })}
            </div>
            <span className="w-10 text-xs text-[#636E72] text-right flex-shrink-0">{row.total} 人</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEE]">
        <p className="text-xs font-semibold text-[#636E72] mb-2">整體推理品質佔比（{grandTotal} 筆）</p>
        <div className="flex flex-wrap gap-3">
          {QUALITY_LEVELS.map((l) => {
            const v = totals[l.key] ?? 0;
            const pct = grandTotal ? Math.round((v / grandTotal) * 100) : 0;
            return (
              <span key={l.key} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[#2D3436]">{l.label}</span>
                <span className="text-[#636E72]">{v}（{pct}%）</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
