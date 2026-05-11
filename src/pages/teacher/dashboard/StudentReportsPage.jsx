import { useMemo } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { useDiagnosisLogs } from '../../../hooks/useAnswers';

const CLASS_COLORS = {
  'class-A': { bg: '#C8EAAE', fg: '#3D5A3E' },
  'class-B': { bg: '#BADDF4', fg: '#2E86C1' },
  'class-C': { bg: '#FCF0C2', fg: '#B7950B' },
};

export default function StudentReportsPage() {
  const { quizId, classes } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const classFilter = searchParams.get('classId') ?? 'all';

  const setClassFilter = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete('classId');
    else next.set('classId', val);
    setSearchParams(next, { replace: true });
  };

  const { data: logs = [], isLoading } = useDiagnosisLogs({
    classId: classFilter === 'all' ? undefined : classFilter,
    quizId,
  });

  const students = useMemo(() => {
    const map = new Map();
    for (const l of logs) {
      if (!map.has(l.studentId)) {
        const palette = CLASS_COLORS[l.classId ?? ''] ?? { bg: '#EEF5E6', fg: '#636E72' };
        map.set(l.studentId, {
          studentId: l.studentId,
          studentName: l.studentName,
          seat: l.seat,
          classId: l.classId,
          className: l.className,
          classBg: palette.bg,
          classFg: palette.fg,
          total: 0,
          correct: 0,
          misconception: 0,
          latestAt: null,
        });
      }
      const s = map.get(l.studentId);
      s.total += 1;
      if (l.finalStatus === 'CORRECT') s.correct += 1;
      else if (l.finalStatus === 'MISCONCEPTION') s.misconception += 1;
      const t = l.answeredAt ? new Date(l.answeredAt) : null;
      if (t && (!s.latestAt || t > s.latestAt)) s.latestAt = t;
    }
    return [...map.values()].sort((a, b) => {
      if (a.classId !== b.classId) return (a.classId ?? '').localeCompare(b.classId ?? '');
      return (a.seat ?? 0) - (b.seat ?? 0);
    });
  }, [logs]);

  return (
    <div>
      <div className="bg-white rounded-2xl border border-[#BDC3C7] p-4 mb-4 flex flex-wrap items-center gap-3
                      shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#636E72]">選擇班級</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
          >
            <option value="all">全部班級</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <span className="ml-auto text-xs text-[#95A5A6]">
          {isLoading ? '載入中…' : `共 ${students.length} 位學生`}
        </span>
      </div>

      {!isLoading && students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#BDC3C7] p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-[#636E72] font-medium">尚無學生診斷紀錄</p>
          <p className="text-sm text-[#95A5A6] mt-1">當學生完成診斷考卷的追問對話後，紀錄會自動出現在這裡</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-[#EEF5E6] text-xs text-[#636E72] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">班級</th>
                  <th className="px-4 py-3 text-left font-semibold">座號</th>
                  <th className="px-4 py-3 text-left font-semibold">學生</th>
                  <th className="px-4 py-3 text-center font-semibold">題數</th>
                  <th className="px-4 py-3 text-center font-semibold">理解</th>
                  <th className="px-4 py-3 text-center font-semibold">持有迷思</th>
                  <th className="px-4 py-3 text-left font-semibold">最近作答</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5E6]">
                {students.map((s) => (
                  <StudentRow key={s.studentId} student={s} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentRow({ student: s }) {
  return (
    <tr className="hover:bg-[#F9FBF7] transition group">
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
          style={{ backgroundColor: s.classBg, color: s.classFg, borderColor: s.classFg }}
        >
          {s.className ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-mono text-[#636E72]">{s.seat ?? '—'}</td>
      <td className="px-4 py-3">
        <Link
          to={`/teacher/students/${s.studentId}/report`}
          className="text-[#2D3436] font-medium hover:text-[#5BA47A] hover:underline transition"
        >
          {s.studentName}
        </Link>
      </td>
      <td className="px-4 py-3 text-center text-[#636E72]">{s.total}</td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#C8EAAE] text-[#2F4A1A]">
          {s.correct}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
          s.misconception > 0 ? 'bg-[#FAC8CC] text-[#E74C5E]' : 'bg-[#EEF5E6] text-[#95A5A6]'
        }`}>
          {s.misconception}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#95A5A6]">
        {s.latestAt ? s.latestAt.toLocaleString('zh-TW') : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/teacher/students/${s.studentId}/report`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg
                     text-white bg-[#5BA47A] border border-[#3F8B5E] hover:bg-[#3F8B5E] transition
                     opacity-70 group-hover:opacity-100"
        >
          查看報告
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </td>
    </tr>
  );
}
