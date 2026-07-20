import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { knowledgeNodes } from '../../../data/knowledgeGraph';
import { useQuiz } from '../../../hooks/useQuizzes';
import NodeBadge from '../../../components/NodeBadge';
import { getClassChartKey, getLatestQuizIdForClass } from './shared/helpers';

/**
 * B2 + D3 — 各班級成績比較（區塊化 + 規模化）
 *
 * D3：支援 30+ 班規模——
 *  - 搜尋班級名
 *  - 排序（答對率高低 / 完成率 / 名稱）
 *  - 兩種檢視模式：
 *      list   — 一行一班，最濃縮（預設）
 *      cards  — 大卡片，含答題分布 + 最弱節點 + 高頻迷思
 *  - 任一行可展開看細節（list 模式）
 */
export default function ClassesPage() {
  const { overviewData, assignments, quizId, gradeStats } = useOutletContext();
  const { data: quiz } = useQuiz(quizId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const classStats = useMemo(() => overviewData?.classStats ?? [], [overviewData]);

  // 預設顯示完整卡片（使用者偏好——資訊量更完整）
  const [viewMode, setViewMode] = useState('card');
  const [sortBy, setSortBy] = useState('default');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

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
        // `/quizzes/{id}/answers` 為每位在籍學生回傳一列；完全未作答者各題 selectedTag 為
        // null，必須排除，否則會被誤判為「全錯」，造成「作答人數 0 卻顯示全錯一整班」。
        const answered = (r.answers ?? []).filter((a) => a.selectedTag != null);
        if (answered.length === 0) return;
        const correct = answered.filter(
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

  // D3：filter + sort
  const visibleClasses = useMemo(() => {
    let list = classStats;
    const q = search.trim();
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
    }
    const sorted = [...list];
    switch (sortBy) {
      case 'pass-desc':       sorted.sort((a, b) => (b.avgPassRate ?? 0) - (a.avgPassRate ?? 0)); break;
      case 'pass-asc':        sorted.sort((a, b) => (a.avgPassRate ?? 0) - (b.avgPassRate ?? 0)); break;
      case 'completion-desc': sorted.sort((a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0)); break;
      case 'name':            sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')); break;
      default:                break;
    }
    return sorted;
  }, [classStats, search, sortBy]);

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

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      {/* D3 控制列：搜尋 / 排序 / 模式切換 */}
      <div className="bg-white rounded-2xl border border-[#E1E6E2] p-3 flex flex-wrap items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <span className="material-symbols-rounded text-[#5A6663]" style={{ fontSize: 18 }}>search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋班級名…"
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-[#2D3436] placeholder:text-[#95A5A6]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-rounded text-[#5A6663]" style={{ fontSize: 18 }}>sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none bg-white border border-[#C8D6C9] rounded-lg pl-2 pr-7 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer"
          >
            <option value="default">預設排序</option>
            <option value="pass-desc">答對率高→低</option>
            <option value="pass-asc">答對率低→高</option>
            <option value="completion-desc">完成率高→低</option>
            <option value="name">班級名稱</option>
          </select>
        </div>
        <div className="inline-flex items-center bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold transition-all ${
              viewMode === 'list' ? 'bg-white text-[#3D5A3E] shadow-sm' : 'text-[#5A6663] hover:text-[#2D3436]'
            }`}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>view_list</span>
            列表
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold transition-all ${
              viewMode === 'cards' ? 'bg-white text-[#3D5A3E] shadow-sm' : 'text-[#5A6663] hover:text-[#2D3436]'
            }`}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>dashboard</span>
            完整卡片
          </button>
        </div>
        <span className="text-sm text-[#95A5A6] ml-auto">共 {visibleClasses.length} / {classStats.length} 班</span>
      </div>

      {visibleClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E1E6E2] p-8 text-center text-sm text-[#95A5A6]">
          找不到符合「{search}」的班級
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-[#E1E6E2] shadow-[0_2px_8px_rgba(0,0,0,0.04)] divide-y divide-[#EEF1ED] overflow-hidden">
          {visibleClasses.map((c) => (
            <ClassRow
              key={c.id}
              cls={c}
              distribution={distributionByClass[c.id]}
              weakestNodes={weakestNodesByClass[c.id] ?? []}
              topMiscons={topMisconsByClass[c.id] ?? []}
              expanded={!!expanded[c.id]}
              onToggleExpand={() => toggleExpand(c.id)}
              onSelect={() => handleSelectClass(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {visibleClasses.map((c) => (
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
      )}
    </div>
  );
}

// ───────── List Row（D3 緊湊模式）─────────

function ClassRow({ cls, distribution, weakestNodes, topMiscons, expanded, onToggleExpand, onSelect }) {
  const passColor = cls.avgPassRate >= 70 ? '#3D5A3E' : cls.avgPassRate >= 50 ? '#B7950B' : '#E74C5E';
  const total = distribution?.total ?? 0;
  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="hover:bg-[#FAFBFA] transition-colors">
      <button type="button" onClick={onToggleExpand} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
        <span className="font-bold text-sm text-[#2D3436] min-w-[80px]">{cls.name}</span>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color: passColor }}>
          答對率 {cls.avgPassRate}%
        </span>
        <span className="text-sm text-[#95A5A6] whitespace-nowrap">完成率 {cls.completionRate}%</span>
        {total > 0 && (
          <div className="flex-1 max-w-[200px] flex h-2 rounded-full overflow-hidden bg-[#EEF1ED]">
            <div style={{ width: `${pct(distribution.fullCorrect)}%`, backgroundColor: '#5BA47A' }} title={`全對 ${distribution.fullCorrect}`} />
            <div style={{ width: `${pct(distribution.partial)}%`,     backgroundColor: '#D4A244' }} title={`對一半 ${distribution.partial}`} />
            <div style={{ width: `${pct(distribution.allWrong)}%`,    backgroundColor: '#E74C5E' }} title={`全錯 ${distribution.allWrong}`} />
          </div>
        )}
        <span className="ml-auto text-sm text-[#5A6663] font-semibold whitespace-nowrap">
          {expanded ? '收合' : '展開'}
        </span>
        <span className={`material-symbols-rounded text-[#95A5A6] transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ fontSize: 18 }}>
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="px-5 sm:px-6 pb-5 pt-3 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 border-t border-[#EEF1ED] md:divide-x md:divide-[#EEF1ED]">
          <div className="md:pr-5">
            <p className="text-[15px] font-bold text-[#3D5A3E] mb-3 pb-1.5 border-b border-[#EEF1ED]">答題分布</p>
            {total > 0 ? (
              <div className="space-y-2.5">
                <DistributionRow label="全對"   count={distribution.fullCorrect} total={total} color="#5BA47A" />
                <DistributionRow label="對一半" count={distribution.partial}     total={total} color="#D4A244" />
                <DistributionRow label="全錯"   count={distribution.allWrong}    total={total} color="#E74C5E" />
              </div>
            ) : (
              <p className="text-[15px] text-[#95A5A6]">尚無提交資料</p>
            )}
          </div>

          <div className="md:px-5">
            <p className="text-[15px] font-bold text-[#3D5A3E] mb-3 pb-1.5 border-b border-[#EEF1ED]">最弱節點 Top2</p>
            {weakestNodes.length === 0 ? (
              <p className="text-[15px] text-[#95A5A6]">無資料</p>
            ) : (
              <ul className="space-y-2.5">
                {weakestNodes.map((n) => (
                  <li key={n.id} className="flex items-center gap-2.5">
                    <NodeBadge nodeId={n.id} name={n.name} size="sm" />
                    <span className={`ml-auto text-[15px] font-bold tabular-nums whitespace-nowrap ${n.pct < 50 ? 'text-[#E74C5E]' : n.pct < 70 ? 'text-[#B7950B]' : 'text-[#3D5A3E]'}`}>{n.pct}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:pl-5">
            <p className="text-[15px] font-bold text-[#3D5A3E] mb-3 pb-1.5 border-b border-[#EEF1ED]">高頻迷思 Top3</p>
            {topMiscons.length === 0 ? (
              <p className="text-[15px] text-[#95A5A6]">無高頻迷思</p>
            ) : (
              <ul className="space-y-2.5">
                {topMiscons.map((m) => {
                  const node = knowledgeNodes.find((n) => n.misconceptions?.find((mm) => mm.id === m.id));
                  return (
                    <li key={m.id} className="flex items-center gap-2.5">
                      {node && <NodeBadge nodeId={node.id} name={node.name} size="sm" />}
                      <span className="text-[15px] text-[#2D3436] truncate flex-1 leading-snug" title={m.label}>{m.label}</span>
                      <span className="text-[15px] font-bold text-[#5A6663] tabular-nums whitespace-nowrap">{m.count} 人</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="md:col-span-3 flex justify-end pt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6FB55C] text-white text-[15px] font-semibold hover:bg-[#5C8A2E] transition-colors shadow-sm"
            >
              進入該班詳情
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Full Card（沿用）─────────

function ClassCard({ cls, distribution, weakestNodes, topMiscons, onSelect }) {
  const passColor = cls.avgPassRate >= 70 ? 'text-[#3D5A3E]' : cls.avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]';

  return (
    <div className="bg-white rounded-[32px] border-2 border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: cls.color, color: '#fff' }}>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-white/80 flex-shrink-0" />
          <span className="text-lg font-bold">{cls.name}</span>
        </div>
        <span className="text-sm font-medium bg-white/30 px-2 py-1 rounded-full">
          完成率 {cls.completionRate}%
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <p className={`text-sm font-bold ${passColor} mt-3`}>
            平均答對率 {cls.avgPassRate}%
          </p>
        </div>

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
                    <p className="text-sm font-semibold text-[#2D3436] truncate">{n.name}</p>
                    <p className={`text-sm font-medium ${n.pct < 50 ? 'text-[#E74C5E]' : n.pct < 70 ? 'text-[#B7950B]' : 'text-[#3D5A3E]'}`}>
                      答對率 {n.pct}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

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
                      <p className="text-sm font-semibold text-[#2D3436] truncate">{m.label}</p>
                      <p className={`text-sm font-medium ${valueClass}`}>
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
    <div className="flex items-center gap-2.5 text-[15px]">
      <span className="w-14 flex-shrink-0 text-[#636E72]">{label}</span>
      <div className="flex-1 h-3.5 bg-white rounded-full border border-[#D5D8DC] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-16 text-right font-bold text-[#2D3436] font-mono tabular-nums">{count} 人</span>
    </div>
  );
}
