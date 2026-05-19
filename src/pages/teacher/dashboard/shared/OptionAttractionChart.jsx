import { useMemo } from 'react';
import { useQuiz } from '../../../../hooks/useQuizzes';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';

const TAG_COLORS = ['#5DADE2', '#F4D03F', '#F28B95', '#A569BD'];

function aggregateGradeQuestionStats(gradeStats) {
  const merged = {};
  (gradeStats?.perClass ?? []).forEach((cls) => {
    const qs = cls.questionStats ?? {};
    Object.entries(qs).forEach(([qid, counts]) => {
      if (!merged[qid]) merged[qid] = { A: 0, B: 0, C: 0, D: 0 };
      ['A', 'B', 'C', 'D'].forEach((tag) => {
        merged[qid][tag] += counts[tag] ?? 0;
      });
    });
  });
  return merged;
}

export default function OptionAttractionChart({ quizId, gradeStats }) {
  const { data: quiz } = useQuiz(quizId);

  const rows = useMemo(() => {
    if (!quiz || !gradeStats) return [];
    const merged = aggregateGradeQuestionStats(gradeStats);
    return (quiz.questions ?? []).map((q, idx) => {
      const counts = merged[q.id] ?? { A: 0, B: 0, C: 0, D: 0 };
      const total = counts.A + counts.B + counts.C + counts.D;
      const correctTag = q.options.find((o) => o.diagnosis === 'CORRECT')?.tag;
      const options = q.options.map((o, i) => {
        const v = counts[o.tag] ?? 0;
        return {
          tag: o.tag,
          color: TAG_COLORS[i % TAG_COLORS.length],
          count: v,
          pct: total ? Math.round((v / total) * 100) : 0,
          isCorrect: o.tag === correctTag,
          diagnosis: o.diagnosis,
        };
      });
      const node = knowledgeNodes.find((n) => n.id === q.knowledgeNodeId);
      return {
        qLabel: `Q${idx + 1}`,
        questionId: q.id,
        stem: q.stem,
        nodeName: node?.name ?? q.knowledgeNodeId,
        total,
        options,
        correctTag,
      };
    }).filter((r) => r.total > 0);
  }, [quiz, gradeStats]);

  if (rows.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-2">選項吸引力分析</h3>
        <p className="text-sm text-[#95A5A6]">尚無作答資料可分析選項分布</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold text-[#2D3436]">選項吸引力分析</h3>
        <span className="text-xs text-[#95A5A6]">全年級每題的選項選擇分布，⭐ 標記為正解選項</span>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.questionId} className="bg-[#FAFBFC] rounded-xl p-3 border border-[#EEE]">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-[#2D3436]">{row.qLabel}</span>
              <span className="text-[10px] text-[#95A5A6]">{row.nodeName}</span>
              <span className="text-xs text-[#636E72] truncate flex-1" title={row.stem}>{row.stem}</span>
            </div>
            <div className="flex h-6 rounded-md overflow-hidden">
              {row.options.map((o) => (
                <div
                  key={o.tag}
                  title={`${o.tag}：${o.count} 人（${o.pct}%）${o.isCorrect ? ' ★ 正解' : ''}`}
                  className="h-full flex items-center justify-center text-[10px] font-bold text-white relative"
                  style={{ width: `${o.pct}%`, backgroundColor: o.color }}
                >
                  {o.pct >= 8 && (
                    <span>
                      {o.tag}{o.isCorrect ? '★' : ''} {o.pct}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#636E72]">
        {['A', 'B', 'C', 'D'].map((tag, i) => (
          <span key={tag} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TAG_COLORS[i] }} />
            選項 {tag}
          </span>
        ))}
        <span className="text-[#95A5A6]">★ = 正解選項</span>
      </div>
    </div>
  );
}
