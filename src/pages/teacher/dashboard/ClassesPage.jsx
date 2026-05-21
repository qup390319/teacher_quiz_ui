import { useMemo } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { knowledgeNodes } from '../../../data/knowledgeGraph';
import { useQuiz } from '../../../hooks/useQuizzes';
import NodeBadge from '../../../components/NodeBadge';
import { getClassChartKey, getLatestQuizIdForClass } from './shared/helpers';

/**
 * B2 — 各班級成績比較（區塊化）
 *
 * 每個班級一張獨立 Card，顯示：
 *  - 班級色 header
 *  - 答題分布（全對 / 對一半 / 全錯 人數）
 *  - 最弱節點 Top2（NodeBadge）
 *  - 高頻迷思 Top3（NodeBadge + label + pct）
 *  - 「進入該班詳情」按鈕
 */
export default function ClassesPage() {
  const { overviewData, assignments, quizId, gradeStats } = useOutletContext();
  const { data: quiz } = useQuiz(quizId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const classStats = useMemo(() => overviewData?.classStats ?? [], [overviewData]);

  // 逐班拿 answers 以計算「全對 / 對一半 / 全錯」
  const answersQueries = useQueries({
    queries: classStats.map((c) => ({
      queryKey: ['answers', quizId, c.id],
      queryFn: () => api.get(`/quizzes/${quizId}/answers?classId=${encodeURIComponent(c.id)}`),
      enabled: !!quizId && !!c?.id,
    })),
  });

  const distributionByClass = useMemo(() => {
    const correctTagByQuestion = {};
    (quiz?.questions ?? []).forEach((q) => {
      const correct = q.options?.find((o) => o.diagnosis === 'CORRECT');
      if (correct) correctTagByQuestion[q.id] = correct.tag;
    });
    const totalQ = Object.keys(correctTagByQuestion).length;
    const result = {};
    classStats.forEach((c, idx) => {
      const rows = answersQueries[idx]?.data?.rows ?? [];
      if (totalQ === 0 || rows.length === 0) {
        result[c.id] = { fullCorrect: 0, partial: 0, allWrong: 0, total: 0 };
        return;
      }
      let fullCorrect = 0, partial = 0, allWrong = 0;
      rows.forEach((r) => {
        const correct = (r.answers ?? []).filter(
          (a) => correctTagByQuestion[a.questionId] && a.selectedTag === correctTagByQuestion[a.questionId],
        ).length;
        if (correct === totalQ) fullCorrect += 1;
        else if (correct === 0) allWrong += 1;
        else partial += 1;
      });
      result[c.id] = { fullCorrect, partial, allWrong, total: fullCorrect + partial + allWrong };
    });
    return result;
  }, [quiz, answersQueries, classStats]);

  // 每班的「最弱節點 Top2」
  const weakestNodesByClass = useMemo(() => {
    const result = {};
    classStats.forEach((c) => {
      const key = getClassChartKey(c.id);
      const arr = (overviewData?.nodePassRates ?? []).map((n) => ({
        id: n.id, name: n.name, pct: n[key] ?? 0,
      })).sort((a, b) => a.pct - b.pct).slice(0, 2);
      result[c.id] = arr;
    });
    return result;
  }, [overviewData, classStats]);

  // 每班的「高頻迷思 Top3」— 從 gradeStats.perClass 直接取
  const topMisconsByClass = useMemo(() => {
    const result = {};
    (gradeStats?.perClass ?? []).forEach((c) => {
      const total = c.studentCount ?? 0;
      const items = (c.topMisconceptions ?? []).slice(0, 3).map((m) => ({
        id: m.id,
        label: m.label,
        count: m.count,
        pct: total > 0 ? Math.round((m.count / total) * 100) : 0,
      }));
      result[c.classId] = items;
    });
    return result;
  }, [gradeStats]);

  if (!overviewData || classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此題組尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此題組派發給班級</p>
      </div>
    );
  }

  const handleSelectClass = (classId) => {
    const filtered = assignments.filter((a) => a.quizId === quizId);
    const latestQuizId = getLatestQuizIdForClass(filtered, classId) ?? quizId;
    const next = new URLSearchParams(searchParams);
    next.set('classId', classId);
    next.set('quizId', latestQuizId);
    navigate(`/teacher/dashboard/class-detail?${next.toString()}`);
  };

  return (
    <div className="space-y-6">
      {classStats.map((c) => (
        <ClassCard
          key={c.id}
          cls={c}
          distribution={distributionByClass[c.id]}
          weakestNodes={weakestNodesByClass[c.id] ?? []}
          topMiscons={topMisconsByClass[c.id] ?? []}
          onSelect={() => handleSelectClass(c.id)}
        />
      ))}
    </div>
  );
}

// ───────── 子元件 ─────────

function ClassCard({ cls, distribution, weakestNodes, topMiscons, onSelect }) {
  const passColor = cls.avgPassRate >= 70 ? 'text-[#3D5A3E]' : cls.avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]';

  return (
    <div className="bg-white rounded-[32px] border-2 border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: cls.color, color: '#fff' }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-white/80 flex-shrink-0" />
          <span className="text-lg font-bold">{cls.name}</span>
        </div>
        <span className="text-xs font-medium bg-white/30 px-2 py-1 rounded-full">
          完成率 {cls.completionRate}%
        </span>
      </div>

      {/* Content */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 答題分布 */}
        <div>
          <p className="text-sm font-bold text-[#2D3436] mb-3">答題分布</p>
          {distribution && distribution.total > 0 ? (
            <div className="space-y-2">
              <DistributionRow label="全對" count={distribution.fullCorrect} total={distribution.total} color="#5BA47A" />
              <DistributionRow label="對一半" count={distribution.partial} total={distribution.total} color="#D4A244" />
              <DistributionRow label="全錯" count={distribution.allWrong} total={distribution.total} color="#E74C5E" />
            </div>
          ) : (
            <p className="text-sm text-[#95A5A6]">尚無提交資料</p>
          )}
          <p className={`text-xs font-bold ${passColor} mt-3`}>
            平均答對率 {cls.avgPassRate}%
          </p>
        </div>

        {/* 2. 最弱節點 Top2 */}
        <div>
          <p className="text-sm font-bold text-[#2D3436] mb-3">最弱節點 Top2</p>
          {weakestNodes.length === 0 ? (
            <p className="text-sm text-[#95A5A6]">無資料</p>
          ) : (
            <ul className="space-y-2">
              {weakestNodes.map((n) => (
                <li key={n.id} className="flex items-start gap-2 px-2 py-1.5 bg-[#FAFBFC] rounded-lg">
                  <NodeBadge nodeId={n.id} name={n.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D3436] truncate">{n.name}</p>
                    <p className={`text-xs font-medium ${n.pct < 50 ? 'text-[#E74C5E]' : n.pct < 70 ? 'text-[#B7950B]' : 'text-[#3D5A3E]'}`}>
                      答對率 {n.pct}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 3. 高頻迷思 Top3 */}
        <div>
          <p className="text-sm font-bold text-[#2D3436] mb-3">高頻迷思 Top3</p>
          {topMiscons.length === 0 ? (
            <p className="text-sm text-[#95A5A6]">無高頻迷思</p>
          ) : (
            <ul className="space-y-2">
              {topMiscons.map((m) => {
                const node = knowledgeNodes.find((n) => n.misconceptions?.find((mm) => mm.id === m.id));
                const valueClass = m.pct >= 45 ? 'text-[#E74C5E]' : m.pct >= 30 ? 'text-[#B7950B]' : 'text-[#3D5A3E]';
                return (
                  <li key={m.id} className="flex items-start gap-2 px-2 py-1.5 bg-[#FAFBFC] rounded-lg">
                    {node && <NodeBadge nodeId={node.id} name={node.name} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#2D3436] truncate">{m.label}</p>
                      <p className={`text-xs font-medium ${valueClass}`}>
                        {m.count} 人持有 · {m.pct}%
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Footer 按鈕 */}
      <div className="px-6 pb-5">
        <button
          type="button"
          onClick={onSelect}
          className="w-full py-2.5 rounded-xl border-2 border-[#3F8B5E] bg-[#E0F0E8] text-[#2E6B47] font-semibold text-sm hover:bg-[#C8E6D8] transition-colors flex items-center justify-center gap-1"
        >
          進入該班詳情
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DistributionRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 flex-shrink-0 text-[#636E72]">{label}</span>
      <div className="flex-1 h-3 bg-white rounded-full border border-[#D5D8DC] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-14 text-right font-bold text-[#2D3436] font-mono">{count} 人</span>
    </div>
  );
}
