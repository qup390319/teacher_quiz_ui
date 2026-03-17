import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import TeacherLayout from '../../components/TeacherLayout';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { defaultQuestions, classAnswers, getQuestionStats, getMisconceptionStudents, getNodePassRates } from '../../data/quizData';

const CHART_BAR_COLOR = '#8FC87A';

const TOTAL_STUDENTS = classAnswers.length;

// ─── Heatmap ───────────────────────────────────────────────────────────────
function HeatmapView() {
  const rows = defaultQuestions.map((q, qIdx) => {
    const node = knowledgeNodes.find((n) => n.id === q.knowledgeNodeId);
    const stats = getQuestionStats(qIdx);
    return { q, node, stats };
  });

  return (
    <div>
      <h3 className="text-base font-bold text-[#2D3436] mb-1">班級迷思熱點矩陣</h3>
      <p className="text-sm text-[#636E72] mb-4">顏色越深代表越多學生持有該迷思，學生名單列於下方</p>
      <div className="overflow-x-auto rounded-2xl border border-[#BDC3C7]">
        <table className="w-full text-sm bg-white" style={{ minWidth: '700px' }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase">題目 / 知識節點</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 A</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 B</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 C</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {rows.map(({ q, node, stats }) => (
              <tr key={q.id}>
                <td className="px-4 py-4 align-top" style={{ maxWidth: 220 }}>
                  <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{node?.id}</p>
                  <p className="text-sm font-semibold text-[#2D3436] mb-1">{node?.name}</p>
                  <p className="text-xs text-[#636E72] leading-relaxed">{q.stem}</p>
                </td>
                {q.options.map((opt) => {
                  const count = stats[opt.tag] || 0;
                  const pct = Math.round((count / TOTAL_STUDENTS) * 100);
                  const isCorrect = opt.diagnosis === 'CORRECT';
                  const intensity = isCorrect ? 0 : pct;
                  const bgStyle = isCorrect
                    ? { backgroundColor: `rgba(167,214,150,${pct / 100 * 0.5 + 0.08})` }
                    : { backgroundColor: `rgba(242,139,149,${intensity / 100 * 0.6 + 0.05})` };
                  const misconLabel = isCorrect ? null : node?.misconceptions.find((m) => m.id === opt.diagnosis)?.label;
                  return (
                    <td key={opt.tag} className="px-3 py-4 text-center align-top" style={bgStyle}>
                      <div className="font-bold text-lg text-[#2D3436]">{count}</div>
                      <div className="text-xs text-[#636E72] mb-1">{pct}% 學生</div>
                      {isCorrect ? (
                        <span className="text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] px-2 py-0.5 rounded-full">正確答案</span>
                      ) : (
                        <span className="text-xs text-[#E74C5E] bg-[#FAC8CC] border border-[#F5B8BA] px-2 py-0.5 rounded-full leading-tight block mt-1">{misconLabel}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Student lists per misconception */}
      <div className="mt-6">
        <h4 className="text-sm font-bold text-[#2D3436] mb-3">各迷思學生名單（直接顯示，無需點擊）</h4>
        <div className="space-y-3">
          {Object.entries(getMisconceptionStudents()).map(([misconId, students]) => {
            const node = knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === misconId));
            const miscon = node?.misconceptions.find((m) => m.id === misconId);
            const pct = Math.round((students.length / TOTAL_STUDENTS) * 100);
            return (
              <div key={misconId} className="bg-white rounded-2xl border border-[#BDC3C7] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-[#BDC3C7] flex-shrink-0 bg-[#EEF5E6] text-[#636E72]">
                    {misconId}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2D3436]">{miscon?.label}</p>
                    <p className="text-xs text-[#636E72]">{node?.name} · {miscon?.detail}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-lg font-bold ${pct >= 50 ? 'text-[#E74C5E]' : pct >= 30 ? 'text-[#D4AC0D]' : 'text-[#B7950B]'}`}>{pct}%</span>
                    <p className="text-xs text-[#95A5A6]">{students.length}/{TOTAL_STUDENTS} 人</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {students.map((name) => (
                    <span key={name} className="text-xs bg-[#EEF5E6] border border-[#D5D8DC] text-[#636E72] px-2.5 py-1 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Breakdown Chart ────────────────────────────────────────────────────────
function BreakdownChart() {
  const passRates = getNodePassRates();
  const chartData = knowledgeNodes
    .filter((n) => passRates[n.id] !== undefined)
    .map((node) => ({
      name: node.name,
      id: node.id,
      passRate: passRates[node.id] || 0,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
          <p className="font-bold text-[#2D3436]">{d.name}</p>
          <p className="text-xs text-[#636E72] mb-1">{d.id}</p>
          <p className="font-semibold text-[#3D5A3E]">通過率：{d.passRate}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h3 className="text-base font-bold text-[#2D3436] mb-1">知識節點通過率斷層圖</h3>
      <p className="text-sm text-[#636E72] mb-4">依知識節點順序排列，可直接看出全班知識斷點位置</p>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#636E72' }} angle={-15} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="passRate" radius={[8, 8, 0, 0]} fill={CHART_BAR_COLOR} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Teaching Actions ───────────────────────────────────────────────────────
function TeachingActions() {
  const misconStudents = getMisconceptionStudents();
  const highFreqMiscons = Object.entries(misconStudents)
    .map(([id, students]) => ({ id, count: students.length, pct: Math.round((students.length / TOTAL_STUDENTS) * 100) }))
    .filter(({ pct }) => pct >= 30)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div>
      <h3 className="text-base font-bold text-[#2D3436] mb-1">教學行動建議</h3>
      <p className="text-sm text-[#636E72] mb-4">根據班級高頻迷思（≥30% 學生持有）自動產出具體教學策略建議</p>
      <div className="space-y-4">
        {highFreqMiscons.map(({ id, pct }) => {
          const node = knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === id));
          const miscon = node?.misconceptions.find((m) => m.id === id);
          if (!node || !miscon) return null;
          const urgency = pct >= 60
            ? { label: '急需補救', color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }
            : pct >= 45
            ? { label: '建議補救', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
            : { label: '留意觀察', color: 'bg-[#FCF0C2] text-[#D4AC0D] border-[#F5D669]' };

          const hasPrerequisites = node.prerequisites.length > 0;
          const prereqNames = node.prerequisites
            .map((pid) => knowledgeNodes.find((n) => n.id === pid)?.name)
            .filter(Boolean);

          return (
            <div key={id} className="bg-white rounded-2xl border border-[#BDC3C7] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-3 mb-3">
                <div className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${urgency.color}`}>
                  {urgency.label} {pct}%
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D3436]">{miscon.label}</p>
                  <p className="text-xs text-[#636E72]">{node.name} · {id}</p>
                </div>
              </div>
              <div className="bg-[#FCF0C2] border border-[#F5D669] rounded-xl p-3.5">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#D4AC0D] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 20.4a3.001 3.001 0 01-2.121-.872l-.347-.347z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-[#B7950B] mb-1">建議教學策略</p>
                    <p className="text-sm text-[#9A7D0A] leading-relaxed">{node.teachingStrategy}</p>
                  </div>
                </div>
              </div>
              {hasPrerequisites && (
                <div className="mt-3 bg-[#FCF0C2] border border-[#F5D669] rounded-xl p-3 flex items-start gap-2">
                  <svg className="w-4 h-4 text-[#D4AC0D] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-[#B7950B]">
                    此節點有先備知識（{prereqNames.join('、')}），建議先確認學生對先備概念已有正確理解，再進行補救教學。
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {highFreqMiscons.length === 0 && (
          <div className="bg-[#C8EAAE] rounded-2xl border border-[#BDC3C7] p-6 text-center">
            <p className="text-[#3D5A3E] font-semibold">班級表現良好，沒有高頻迷思需要優先補救！</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Report Page ───────────────────────────────────────────────────────
export default function TeacherReport() {
  return (
    <TeacherLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2D3436] mb-1">班級診斷報告</h1>
          <p className="text-[#636E72] text-sm">
            20 位學生已完成「溫度與熱」診斷測驗 · 測驗日期：2026/02/23
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: '參與學生', value: '20 人', sub: '全班皆已完成', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]' },
            { label: '診斷題目', value: '5 題', sub: '涵蓋 5 個知識節點', color: 'text-[#7D3C98]', bg: 'bg-[#F3E5F5]' },
            { label: '高頻迷思', value: `${Object.values(getMisconceptionStudents()).filter(s => s.length / TOTAL_STUDENTS >= 0.3).length} 個`, sub: '≥30% 學生持有', color: 'text-[#E74C5E]', bg: 'bg-[#FAC8CC]' },
            { label: '班級平均通過率', value: `${Math.round(Object.values(getNodePassRates()).reduce((s, v) => s + v, 0) / Object.values(getNodePassRates()).length)}%`, sub: '各節點通過率平均', color: 'text-[#2E86C1]', bg: 'bg-[#BADDF4]' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border border-[#BDC3C7] p-4 ${s.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}>
              <p className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</p>
              <p className="text-sm font-semibold text-[#2D3436]">{s.label}</p>
              <p className="text-xs text-[#636E72] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Main sections */}
        <div className="space-y-8">
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <HeatmapView />
          </div>
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <BreakdownChart />
          </div>
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <TeachingActions />
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
