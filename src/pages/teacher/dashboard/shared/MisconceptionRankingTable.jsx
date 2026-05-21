import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { knowledgeNodes } from '../../../../data/knowledgeGraph';
import NodeBadge from '../../../../components/NodeBadge';

/**
 * C2 — 所有班級高頻迷思完整排行表
 *
 * 從 gradeStats.perClass 重新聚合所有迷思（不只 Top 6），按持有總人次降序排列。
 * 每列：
 *  - 排名
 *  - 對應節點 NodeBadge
 *  - 迷思 label
 *  - 持有人次（合計）
 *  - 持有率 bar（佔所有作答學生比例）
 *  - 「查看涉及學生」按鈕：跳轉至「個別學生診斷報告」並透過 ?misconceptionId= 預過濾
 *
 * 閾值說明：
 *  - 顯示所有人次 ≥ 1 的迷思（避免噪音）
 *  - ≥45% 紅、30-44% 黃、<30% 灰
 */
export default function MisconceptionRankingTable({ gradeStats }) {
  const [searchParams] = useSearchParams();
  const [showAll, setShowAll] = useState(false);

  const ranking = useMemo(() => {
    if (!gradeStats?.perClass) return { items: [], totalStudents: 0 };

    // 合計各班學生數（已提交）作為母體
    let totalStudents = 0;
    gradeStats.perClass.forEach((c) => {
      totalStudents += c.studentCount ?? 0;
    });

    // 跨班合併同 id 的迷思人次
    const merged = {};
    gradeStats.perClass.forEach((c) => {
      (c.topMisconceptions ?? []).forEach((m) => {
        if (!merged[m.id]) {
          const node = knowledgeNodes.find((n) => n.misconceptions?.find((mm) => mm.id === m.id));
          merged[m.id] = {
            id: m.id,
            label: m.label,
            nodeId: node?.id,
            nodeName: node?.name,
            count: 0,
          };
        }
        merged[m.id].count += m.count ?? 0;
      });
    });

    const items = Object.values(merged)
      .map((m) => ({
        ...m,
        pct: totalStudents > 0 ? Math.round((m.count / totalStudents) * 100) : 0,
      }))
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count);

    return { items, totalStudents };
  }, [gradeStats]);

  if (ranking.items.length === 0) {
    return (
      <div className="bg-[#C8EAAE] rounded-2xl border-2 border-[#8FC87A] p-6 text-center">
        <p className="text-[#3D5A3E] font-semibold">所有班級無顯著高頻迷思</p>
      </div>
    );
  }

  const visible = showAll ? ranking.items : ranking.items.slice(0, 10);

  const getRowTint = (pct) => {
    if (pct >= 45) return { bg: 'bg-[#FAC8CC]', border: 'border-[#F5B8BA]', text: 'text-[#E74C5E]', barColor: '#E74C5E' };
    if (pct >= 30) return { bg: 'bg-[#FCF0C2]', border: 'border-[#F5D669]', text: 'text-[#B7950B]', barColor: '#D4A244' };
    return { bg: 'bg-white', border: 'border-[#D5D8DC]', text: 'text-[#636E72]', barColor: '#95A5A6' };
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">所有班級高頻迷思完整排行</h3>
        <span className="text-xs text-[#95A5A6]">
          共 {ranking.items.length} 條迷思 · 母體 {ranking.totalStudents} 位學生
        </span>
      </div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {[
          { color: '#E74C5E', label: '≥45% 急需年級補救' },
          { color: '#D4A244', label: '30–44% 建議關注' },
          { color: '#95A5A6', label: '<30% 低風險' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <ul className="space-y-1.5">
        {visible.map((m, idx) => {
          const tint = getRowTint(m.pct);
          const studentsHref = (() => {
            const next = new URLSearchParams(searchParams);
            next.set('misconceptionId', m.id);
            return `/teacher/dashboard/students?${next.toString()}`;
          })();
          return (
            <li key={m.id} className={`grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_minmax(8rem,1fr)_auto] items-center gap-3 px-3 py-2 rounded-xl border ${tint.bg} ${tint.border}`}>
              <span className="text-sm font-bold text-[#2D3436] font-mono">#{idx + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {m.nodeId && <NodeBadge nodeId={m.nodeId} name={m.nodeName} size="sm" />}
                  <span className="text-xs text-[#95A5A6] truncate">{m.nodeName}</span>
                </div>
                <p className="text-sm font-semibold text-[#2D3436] truncate" title={m.label}>{m.label}</p>
              </div>
              <span className={`text-sm font-bold ${tint.text} font-mono text-right`}>
                {m.count} 人
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-white rounded-full border border-[#D5D8DC] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: tint.barColor }} />
                </div>
                <span className={`text-xs font-bold ${tint.text} font-mono w-9 text-right`}>{m.pct}%</span>
              </div>
              <Link
                to={studentsHref}
                className="text-xs font-semibold text-[#3D5A3E] hover:text-[#2D3436] hover:underline whitespace-nowrap"
              >
                查看涉及學生 →
              </Link>
            </li>
          );
        })}
      </ul>
      {ranking.items.length > 10 && (
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-semibold text-[#3D5A3E] hover:text-[#2D3436] transition-colors"
          >
            {showAll ? '收合（只顯示前 10 條）' : `展開全部 ${ranking.items.length} 條 ▾`}
          </button>
        </div>
      )}
    </div>
  );
}
