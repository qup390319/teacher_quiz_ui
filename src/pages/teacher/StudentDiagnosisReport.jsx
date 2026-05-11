import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useDiagnosisLogs } from '../../hooks/useAnswers';
import { knowledgeNodes, getMisconceptionById } from '../../data/knowledgeGraph';
import { CAUSE_CATEGORIES, CAUSE_COLOR_THEMES } from '../../data/misconceptionCauses';

export default function StudentDiagnosisReport() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [quizFilter, setQuizFilter] = useState('all');
  const [expandedKey, setExpandedKey] = useState(null);

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
      return { code, node, miscon, relatedQs, causeIds };
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
              <label className="text-xs font-semibold text-[#636E72]">考卷篩選</label>
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
              >
                <option value="all">全部考卷</option>
                {quizOptions.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              <span className="ml-auto text-xs text-[#95A5A6]">共 {filtered.length} 筆</span>
            </div>

            {misconceptionAnalysis.length > 0 && (
              <MisconceptionSection items={misconceptionAnalysis} />
            )}

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

function MisconceptionSection({ items }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 bg-[#FAC8CC] border border-[#F5B8BA] text-[#E74C5E] rounded-full flex items-center justify-center text-xs font-bold">!</span>
        偵測到的迷思概念（{items.length} 個）
      </h2>
      <div className="space-y-3">
        {items.map(({ code, node, miscon, relatedQs, causeIds }) => (
          <div key={code} className="bg-white rounded-2xl border border-[#BDC3C7] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-[#95A5A6] bg-[#EEF5E6] px-2 py-0.5 rounded">{code}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EEF5E6] border border-[#D5D8DC] text-[#636E72]">{node.name}</span>
            </div>
            <div className="bg-[#FAC8CC] border border-[#F5B8BA] rounded-xl p-3 mb-2.5">
              <p className="text-xs font-semibold text-[#E74C5E] mb-1">學生的想法</p>
              <p className="text-sm font-medium text-[#2D3436] mb-1">「{miscon.label}」</p>
              <p className="text-xs text-[#636E72] leading-relaxed">{miscon.studentDetail || miscon.detail}</p>
            </div>
            {causeIds.length > 0 && (
              <div className="bg-[#F9FBF7] border border-[#D5D8DC] rounded-xl p-3 mb-2.5">
                <p className="text-xs font-semibold text-[#636E72] mb-2">AI 分析迷思成因</p>
                <div className="flex flex-wrap gap-1.5">
                  {causeIds.map((cid) => {
                    const cat = CAUSE_CATEGORIES.find((c) => c.id === cid);
                    if (!cat) return null;
                    const theme = CAUSE_COLOR_THEMES[cat.color] ?? CAUSE_COLOR_THEMES.gray;
                    return (
                      <span key={cid} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-transparent ${theme.badge}`}>
                        <span className="opacity-70">{cid}.</span>{cat.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="bg-[#BADDF4] border border-[#A3CCE9] rounded-xl p-3 mb-2.5">
              <p className="text-xs font-semibold text-[#2E86C1] mb-1">科學上正確的觀念</p>
              <p className="text-sm text-[#2471A3] leading-relaxed">{node.studentHint || node.teachingStrategy.split('。')[0] + '。'}</p>
            </div>
            {relatedQs.length > 0 && relatedQs[0].aiSummary && (
              <div className="bg-[#FFFBF0] border border-[#F5D669] rounded-xl p-3 mb-2.5">
                <p className="text-xs font-semibold text-[#B9770E] mb-1">AI 診斷摘要</p>
                <p className="text-sm text-[#7A5232] leading-relaxed">{relatedQs[0].aiSummary}</p>
              </div>
            )}
            <div className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3">
              <p className="text-xs font-semibold text-[#636E72] mb-1">教學建議</p>
              <p className="text-sm text-[#3D5A3E] leading-relaxed">{node.teachingStrategy}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeakReasoningSection({ rows }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#2D3436] mb-3 flex items-center gap-2">
        <span className="w-6 h-6 bg-[#FCF0C2] border border-[#F5D669] text-[#B9770E] rounded-full flex items-center justify-center text-xs font-bold">?</span>
        答對但推理薄弱（{rows.length} 題）
      </h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={`${r.quizId}-${r.questionId}`} className="bg-[#FFFBF0] border border-[#F5D669] rounded-xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[#636E72]">第 {r.questionId} 題</span>
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
        <span className="w-6 h-6 bg-[#BADDF4] border border-[#A3CCE9] text-[#2E86C1] rounded-full flex items-center justify-center text-xs font-bold">&rarr;</span>
        建議補強的知識節點
      </h2>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div key={node.id} className="bg-white rounded-xl border border-[#BDC3C7] p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-[#95A5A6]">{node.id}</span>
              <span className="text-sm font-bold text-[#2D3436]">{node.name}</span>
            </div>
            <p className="text-xs text-[#636E72] mb-2 leading-relaxed">{node.description}</p>
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
                <span className="text-xs font-medium text-[#3D5A3E]">{node.videoTitle}</span>
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
      <p className="text-xs font-medium mt-0.5" style={{ color }}>{label}</p>
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
      <p className="text-sm text-[#95A5A6] mt-1">完成診斷考卷的追問對話後，紀錄會自動出現在這裡</p>
    </div>
  );
}

function QuestionCard({ row: r, open, onToggle }) {
  const verdictColor =
    r.finalStatus === 'CORRECT'
      ? 'bg-[#C8EAAE] text-[#2F4A1A]'
      : r.finalStatus === 'MISCONCEPTION'
        ? 'bg-[#FAC8CC] text-[#E74C5E]'
        : 'bg-[#FCF0C2] text-[#7A5232]';
  const verdictLabel =
    r.finalStatus === 'CORRECT' ? '理解' : r.finalStatus === 'MISCONCEPTION' ? '持有迷思' : '不確定';

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#F9FBF7] transition"
      >
        <span className="text-sm font-mono text-[#636E72] w-16 shrink-0">第 {r.questionId} 題</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${verdictColor}`}>
          {verdictLabel}
        </span>
        {r.misc && (
          <span className="text-xs text-[#636E72] truncate">
            <span className="font-mono opacity-60">{r.misc.id}</span> {r.misc.label}
          </span>
        )}
        {r.reasoningQuality && <ReasoningBadge quality={r.reasoningQuality} />}
        <span className="ml-auto text-xs text-[#95A5A6]">
          {r.answeredAt ? new Date(r.answeredAt).toLocaleString('zh-TW') : ''}
        </span>
        <svg
          className={`w-4 h-4 text-[#95A5A6] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <div className="max-w-3xl space-y-3">
            {r.aiSummary && (
              <div className="text-xs text-[#7A5232] bg-[#FFFBF0] border border-[#F5D669] rounded-lg p-2.5">
                <span className="font-semibold">AI 摘要：</span>{r.aiSummary}
              </div>
            )}
            {r.misc && (
              <div className="text-xs bg-[#FAC8CC]/30 border border-[#F5B8BA] rounded-lg p-2.5">
                <span className="font-semibold text-[#E74C5E]">迷思概念：</span>
                <span className="text-[#2D3436]">{r.misc.label}</span>
                <p className="text-[#636E72] mt-1 leading-relaxed">{r.misc.studentDetail || r.misc.detail}</p>
              </div>
            )}
            {r.statusChange && r.statusChange.changeType && (
              <div className="text-xs text-[#636E72] bg-[#F9FBF7] border border-[#D5D8DC] rounded-lg p-2.5">
                <span className="font-semibold">狀態變化：</span>
                {r.statusChange.changeType === 'UPGRADED' ? '追問後判定為理解' : '追問後判定為迷思'}
                {r.statusChange.from && ` (${r.statusChange.from} → ${r.statusChange.to})`}
              </div>
            )}
            <ConversationLog messages={r.conversationLog} />
          </div>
        </div>
      )}
    </div>
  );
}

function ReasoningBadge({ quality }) {
  const map = {
    SOLID: { label: '推理扎實', cls: 'bg-[#D6EAF8] text-[#2E86C1]' },
    PARTIAL: { label: '部分理解', cls: 'bg-[#FCF0C2] text-[#B7950B]' },
    WEAK: { label: '推理薄弱', cls: 'bg-[#FDE2E4] text-[#E74C5E]' },
    GUESSING: { label: '猜測作答', cls: 'bg-[#F3E5F5] text-[#7D3C98]' },
  };
  const info = map[quality] ?? { label: quality, cls: 'bg-[#EEF5E6] text-[#636E72]' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${info.cls}`}>
      {info.label}
    </span>
  );
}

function ConversationLog({ messages }) {
  if (!messages || messages.length === 0) {
    return <p className="text-xs text-[#95A5A6] italic">（沒有對話紀錄）</p>;
  }
  return (
    <div className="space-y-2">
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            msg.role === 'student'
              ? 'bg-[#BADDF4] text-[#1F4E79] border border-[#5DADE2]'
              : 'bg-white text-[#2D3436] border border-[#D5D8DC]'
          }`}>
            <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">
              {msg.role === 'student' ? '學生' : 'AI 老師'}
            </p>
            <p className="whitespace-pre-wrap">{msg.content || msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
