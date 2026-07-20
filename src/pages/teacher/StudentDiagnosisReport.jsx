import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useDiagnosisLogs } from '../../hooks/useAnswers';
import { knowledgeNodes, getMisconceptionById } from '../../data/knowledgeGraph';
import { CAUSE_CATEGORIES, CAUSE_COLOR_THEMES } from '../../data/misconceptionCauses';
import {
  ERROR_TYPES,
  ERROR_TYPE_LABELS,
  ERROR_TYPE_DESCRIPTIONS,
  ERROR_TYPE_THEMES,
  ERROR_TYPE_UNCLASSIFIED_BADGE,
  normalizeErrorType,
} from '../../data/errorTypes';
import NodeBadge from '../../components/NodeBadge';
import PrerequisiteTraceSection from './studentReport/PrerequisiteTraceSection';
import QuestionCard, { ReasoningBadge } from './studentReport/QuestionCard';

export default function StudentDiagnosisReport() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [quizFilter, setQuizFilter] = useState('all');
  const [expandedKey, setExpandedKey] = useState(null);
  // 教師對「答錯類型」的手動覆寫；session-only，key = misconception code
  // （後端 errorType 欄位待 option(b) DB 寫入後才永久保存）
  const [errorTypeOverrides, setErrorTypeOverrides] = useState({});
  const handleErrorTypeOverride = (code, value) => {
    setErrorTypeOverrides((prev) => ({ ...prev, [code]: normalizeErrorType(value) }));
  };

  const { data: logs = [], isLoading } = useDiagnosisLogs({ studentId });

  const studentInfo = useMemo(() => {
    if (logs.length === 0) return null;
    const first = logs[0];
    return { name: first.studentName, className: first.className, seat: first.seat };
  }, [logs]);

  const quizOptions = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => { if (!map.has(l.quizId)) map.set(l.quizId, l.quizTitle); });
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [logs]);

  const filtered = useMemo(() => {
    const base = quizFilter === 'all' ? logs : logs.filter((l) => l.quizId === quizFilter);
    return base.map((l) => ({
      ...l,
      misc: l.misconceptionCode ? getMisconceptionById(l.misconceptionCode) : null,
    }));
  }, [logs, quizFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const correct = filtered.filter((r) => r.finalStatus === 'CORRECT').length;
    const misconception = filtered.filter((r) => r.finalStatus === 'MISCONCEPTION').length;
    const uncertain = total - correct - misconception;
    return { total, correct, misconception, uncertain };
  }, [filtered]);

  const misconceptionAnalysis = useMemo(() => {
    const codes = new Set();
    filtered.forEach((r) => { if (r.finalStatus === 'MISCONCEPTION' && r.misconceptionCode) codes.add(r.misconceptionCode); });
    return [...codes].map((code) => {
      const node = knowledgeNodes.find((n) => n.misconceptions.some((m) => m.id === code));
      const miscon = node?.misconceptions.find((m) => m.id === code);
      if (!node || !miscon) return null;
      const relatedQs = filtered.filter((r) => r.misconceptionCode === code);
      const causeIdSet = new Set();
      relatedQs.forEach((r) => { (r.causeIds ?? []).forEach((id) => causeIdSet.add(id)); });
      const causeIds = [...causeIdSet].sort((a, b) => a - b);
      // LLM 建議的 errorType：取相關題目中第一個非空的（同一迷思一般一致）
      const llmErrorType = relatedQs.map((r) => normalizeErrorType(r.errorType)).find(Boolean) ?? null;
      return { code, node, miscon, relatedQs, causeIds, llmErrorType };
    }).filter(Boolean);
  }, [filtered]);

  const weakCorrectRows = useMemo(() =>
    filtered.filter((r) =>
      r.finalStatus === 'CORRECT' && (r.reasoningQuality === 'WEAK' || r.reasoningQuality === 'GUESSING')
    ), [filtered]);

  const remedialNodes = useMemo(() => {
    const nodeIds = new Set();
    misconceptionAnalysis.forEach(({ node }) => nodeIds.add(node.id));
    weakCorrectRows.forEach((r) => {
      const q = filtered.find((f) => f.questionId === r.questionId);
      if (q?.knowledgeNodeId) nodeIds.add(q.knowledgeNodeId);
    });
    return [...nodeIds]
      .map((id) => knowledgeNodes.find((n) => n.id === id))
      .filter(Boolean);
  }, [misconceptionAnalysis, weakCorrectRows, filtered]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      if (!map.has(r.quizId)) map.set(r.quizId, { title: r.quizTitle, rows: [] });
      map.get(r.quizId).rows.push(r);
    });
    return Array.from(map.values());
  }, [filtered]);

  const toggle = (key) => setExpandedKey((prev) => (prev === key ? null : key));

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#A7D696] border-t-transparent rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
        <div className="mb-4 sm:mb-6 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex items-center gap-1 text-sm text-[#5BA47A] hover:text-[#3F8B5E] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">
              {studentInfo ? `${studentInfo.name} 的診斷報告` : '學生診斷報告'}
            </h1>
            {studentInfo && (
              <p className="text-[#636E72] text-sm mt-0.5">
                {studentInfo.className}{studentInfo.seat != null ? ` · 座號 ${studentInfo.seat}` : ''}
              </p>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="作答題數" value={stats.total} bg="#EEF5E6" color="#3D5A3E" />
              <StatCard label="理解" value={stats.correct} bg="#C8EAAE" color="#2F4A1A" />
              <StatCard label="持有迷思" value={stats.misconception} bg="#FAC8CC" color="#E74C5E" />
              <StatCard label="不確定" value={stats.uncertain} bg="#FCF0C2" color="#7A5232" />
            </div>

            <div className="bg-white rounded-2xl border border-[#BDC3C7] p-3 mb-4 flex items-center gap-3
                            shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <label className="text-sm font-semibold text-[#636E72]">題組篩選</label>
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
              >
                <option value="all">全部題組</option>
                {quizOptions.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              <span className="ml-auto text-sm text-[#95A5A6]">共 {filtered.length} 筆</span>
            </div>

            {misconceptionAnalysis.length > 0 && (
              <MisconceptionSection
                items={misconceptionAnalysis}
                overrides={errorTypeOverrides}
                onOverride={handleErrorTypeOverride}
              />
            )}

            {/* 先備概念追溯：吃全部 logs（不受題組篩選影響），跨題組證據才完整 */}
            <PrerequisiteTraceSection logs={logs} />

            {weakCorrectRows.length > 0 && (
              <WeakReasoningSection rows={weakCorrectRows} />
            )}

            {remedialNodes.length > 0 && (
              <RemedialSection nodes={remedialNodes} />
            )}

            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#2D3436] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#636E72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                逐題對話紀錄
              </h2>
              {grouped.map((g) => (
                <div key={g.title} className="bg-white rounded-2xl border border-[#BDC3C7] overflow-hidden
                                              shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <div className="px-4 py-3 bg-[#EEF5E6] border-b border-[#D5D8DC]">
                    <h3 className="text-sm font-bold text-[#3D5A3E]">{g.title}</h3>
                  </div>
                  <div className="divide-y divide-[#EEF5E6]">
                    {g.rows.map((r) => {
                      const key = `${r.quizId}-${r.questionId}`;
                      return (
                        <QuestionCard key={key} row={r} open={expandedKey === key} onToggle={() => toggle(key)} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}

function MisconceptionSection({ items, overrides, onOverride }) {
  const [expandAll, setExpandAll] = useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-base font-bold text-[#2D3436] flex items-center gap-2">
          <span className="w-6 h-6 bg-[#FAC8CC] border border-[#F5B8BA] text-[#E74C5E] rounded-full flex items-center justify-center text-sm font-bold">!</span>
          偵測到的迷思概念（{items.length} 個）
        </h2>
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="text-xs font-semibold text-[#5BA47A] hover:text-[#3F8B5E] px-2 py-1 rounded-md hover:bg-[#EEF5E6] transition"
        >
          {expandAll ? '全部折疊' : '全部展開'}
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <MisconceptionCard
            key={item.code}
            item={item}
            forceExpand={expandAll}
            overrides={overrides}
            onOverride={onOverride}
          />
        ))}
      </div>
    </div>
  );
}

function MisconceptionCard({ item, forceExpand, overrides, onOverride }) {
  const { code, node, miscon, relatedQs, causeIds, llmErrorType } = item;
  const overrideValue = overrides?.[code];
  const hasOverride = overrideValue !== undefined;
  const effective = hasOverride ? overrideValue : llmErrorType;
  const effTheme = effective ? ERROR_TYPE_THEMES[effective] : null;
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceExpand || localOpen;
  return (
    <div className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* 折疊狀態：只顯示一行重點 — 節點 / code / 學生短標 / 類型徽章 / 展開箭頭 */}
      <button
        type="button"
        onClick={() => setLocalOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-[#FAFBFC] transition flex-wrap"
        aria-expanded={open}
      >
        <NodeBadge nodeId={node.id} name={node.name} size="sm" />
        <span className="text-sm font-mono font-semibold text-[#636E72]">{code}</span>
        <span className="text-sm text-[#95A5A6]">·</span>
        <span className="text-sm font-medium text-[#2D3436] truncate max-w-[260px]">{miscon.label}</span>
        <span
          className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
            effTheme ? effTheme.badge : ERROR_TYPE_UNCLASSIFIED_BADGE
          }`}
          title={effective ? ERROR_TYPE_DESCRIPTIONS[effective] : '尚未分類'}
        >
          {effective ? ERROR_TYPE_LABELS[effective] : '未分類'}
          {hasOverride && <span className="ml-1 opacity-60">·覆寫</span>}
        </span>
        <svg
          className={`w-4 h-4 text-[#95A5A6] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 展開狀態：完整細節 */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#EEF1F0]">
          {/* 學生想法 — 唯一彩色強調 */}
          <div className="border-l-4 border-[#E74C5E] bg-[#FFF5F6] rounded-r-lg pl-3 pr-3 py-2.5 mb-3 mt-3">
            <p className="text-[11px] font-bold text-[#E74C5E] uppercase tracking-wider mb-1">學生的想法</p>
            <p className="text-sm font-semibold text-[#2D3436] leading-relaxed">「{miscon.studentDetail || miscon.detail}」</p>
          </div>

          {/* 成因 tags — inline */}
          {causeIds.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-[11px] font-bold text-[#95A5A6] uppercase tracking-wider mr-1">可能成因</span>
              {causeIds.map((cid) => {
                const cat = CAUSE_CATEGORIES.find((c) => c.id === cid);
                if (!cat) return null;
                const theme = CAUSE_COLOR_THEMES[cat.color] ?? CAUSE_COLOR_THEMES.gray;
                return (
                  <span key={cid} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${theme.badge}`}>
                    {cat.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* AI 摘要 — 灰色註腳 */}
          {relatedQs.length > 0 && relatedQs[0].aiSummary && (
            <p className="text-sm text-[#636E72] leading-relaxed mb-3 px-3 py-2 bg-[#F9FBF7] rounded-lg border border-[#EEF1F0]">
              <span className="text-[11px] font-bold text-[#95A5A6] uppercase tracking-wider mr-2">AI 摘要</span>
              {relatedQs[0].aiSummary}
            </p>
          )}

          {/* 教師覆寫答錯類型 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[11px] font-bold text-[#95A5A6] uppercase tracking-wider">教師覆寫</span>
            <select
              id={`et-override-${code}`}
              value={hasOverride ? (overrideValue ?? '') : ''}
              onChange={(e) => onOverride(code, e.target.value || null)}
              className="text-xs px-2 py-1 rounded-md border border-[#D5D8DC] bg-white text-[#636E72]
                         focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/30"
              aria-label="教師覆寫答錯類型"
            >
              <option value="">沿用 LLM 建議{llmErrorType ? `（${ERROR_TYPE_LABELS[llmErrorType]}）` : '（未分類）'}</option>
              {ERROR_TYPES.map((t) => (
                <option key={t} value={t}>覆寫為：{ERROR_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* 教學區 — 正確觀念 + 教學建議 */}
          <div className="border-t border-[#EEF1F0] pt-3 space-y-3">
            <div>
              <p className="text-[11px] font-bold text-[#5BA47A] uppercase tracking-wider mb-1">正確觀念</p>
              <p className="text-sm text-[#2D3436] leading-relaxed">{node.studentHint || node.teachingStrategy.split('。')[0] + '。'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#5BA47A] uppercase tracking-wider mb-1">教學建議</p>
              <p className="text-sm text-[#2D3436] leading-relaxed">{node.teachingStrategy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeakReasoningSection({ rows }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 bg-[#FCF0C2] border border-[#F5D669] text-[#B9770E] rounded-full flex items-center justify-center text-sm font-bold">?</span>
        答對但推理薄弱（{rows.length} 題）
      </h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={`${r.quizId}-${r.questionId}`} className="bg-[#FFFBF0] border border-[#F5D669] rounded-xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-[#636E72]">第 {r.questionId} 題</span>
              <ReasoningBadge quality={r.reasoningQuality} />
            </div>
            <p className="text-sm text-[#7A5232] leading-relaxed">
              {r.aiSummary || '學生答對了，但解釋的推理過程不夠完整，建議進一步確認是否真正理解。'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RemedialSection({ nodes }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 bg-[#BADDF4] border border-[#A3CCE9] text-[#2E86C1] rounded-full flex items-center justify-center text-sm font-bold">&rarr;</span>
        建議補強的知識節點
      </h2>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div key={node.id} className="bg-white rounded-xl border border-[#BDC3C7] p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-mono text-[#95A5A6]">{node.id}</span>
              <span className="text-sm font-bold text-[#2D3436]">{node.name}</span>
            </div>
            <p className="text-sm text-[#636E72] mb-2 leading-relaxed">{node.description}</p>
            {node.videoUrl && (
              <a
                href={node.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#EEF5E6] border border-[#D5D8DC] rounded-lg px-3 py-2 hover:bg-[#D5EACB] transition text-sm"
              >
                <svg className="w-4 h-4 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-[#3D5A3E]">{node.videoTitle}</span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, bg, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: bg }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color }}>{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#BDC3C7] p-12 text-center">
      <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-[#636E72] font-medium">這位學生還沒有診斷紀錄</p>
      <p className="text-sm text-[#95A5A6] mt-1">完成診斷題組的追問對話後，紀錄會自動出現在這裡</p>
    </div>
  );
}

