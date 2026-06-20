import { QUADRANT_LABELS, QUADRANT_DESCRIPTIONS } from '../../../../data/twoTier';

/**
 * 雙層次（two-tier）四象限總覽。
 * 把 stats.quadrantStats（{questionId: {TT,TF,FT,FF}}）跨題加總成班級層級的
 * 真理解 / 假陽性 / 假陰性 / 真迷思 分佈。僅在 mode==='two-tier' 時呈現。
 */
const QUAD_THEME = {
  TT: { bar: 'bg-[#5C8A2E]', chip: 'bg-[#E8F3DA] text-[#3D5A3E] border-[#A7D696]' },
  TF: { bar: 'bg-[#D4A244]', chip: 'bg-[#FCF0C2] text-[#B9770E] border-[#F0CFA4]' },
  FT: { bar: 'bg-[#2E86C1]', chip: 'bg-[#E0EBF5] text-[#2E86C1] border-[#A3CCE9]' },
  FF: { bar: 'bg-[#E74C5E]', chip: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' },
};
const ORDER = ['TT', 'TF', 'FT', 'FF'];

export default function QuadrantSummary({ stats }) {
  const perQuestion = stats?.quadrantStats ?? {};
  const totals = { TT: 0, TF: 0, FT: 0, FF: 0 };
  Object.values(perQuestion).forEach((q) => {
    ORDER.forEach((k) => { totals[k] += q?.[k] ?? 0; });
  });
  const grand = ORDER.reduce((s, k) => s + totals[k], 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-rounded text-[#2E6FA6]" style={{ fontSize: 22 }}>stacked_bar_chart</span>
        <h3 className="font-bold text-[#2D3436]">雙層次四象限分佈</h3>
      </div>
      <p className="text-sm text-[#95A5A6] mb-4">
        以「答案 × 理由」交叉判定：真理解＝答對且理由對；假陽性＝答對但理由錯（可能猜對）；
        假陰性＝答錯但理由對；真迷思＝答錯且理由錯。
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ORDER.map((k) => {
          const pct = grand > 0 ? Math.round((totals[k] / grand) * 100) : 0;
          return (
            <div key={k} className={`rounded-2xl border p-4 ${QUAD_THEME[k].chip}`} title={QUADRANT_DESCRIPTIONS[k]}>
              <p className="text-2xl font-bold mb-0.5">{pct}%</p>
              <p className="text-sm font-semibold">{QUADRANT_LABELS[k]}</p>
              <p className="text-xs opacity-80 mt-0.5">{totals[k]} 人次（{k}）</p>
            </div>
          );
        })}
      </div>
      {/* 堆疊長條：四象限占比一目了然 */}
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full border border-[#D5D8DC]">
        {ORDER.map((k) => {
          const pct = grand > 0 ? (totals[k] / grand) * 100 : 0;
          if (pct === 0) return null;
          return <div key={k} className={QUAD_THEME[k].bar} style={{ width: `${pct}%` }} title={`${QUADRANT_LABELS[k]} ${Math.round(pct)}%`} />;
        })}
      </div>
    </div>
  );
}
