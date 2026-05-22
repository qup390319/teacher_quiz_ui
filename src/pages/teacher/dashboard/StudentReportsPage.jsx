import { useMemo, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // 套用查詢過濾（姓名、座號、班級名都納入比對）
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.studentName ?? '').toLowerCase();
      const className = (s.className ?? '').toLowerCase();
      const seatStr = String(s.seat ?? '');
      return name.includes(q) || className.includes(q) || seatStr.includes(q);
    });
  }, [students, searchQuery]);

  return (
    <div>
      <div className="bg-white rounded-2xl border border-[#E1E6E2] p-4 mb-4 flex flex-wrap items-center gap-3
                      shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {/* 班級篩選器 */}
        <div className="flex items-center gap-2 bg-[#EEF5E6] rounded-xl pl-3 pr-2 py-1.5">
          <span className="material-symbols-rounded text-[#3D5A3E]" style={{ fontSize: 20 }}>filter_alt</span>
          <label className="text-[15px] font-bold text-[#3D5A3E] whitespace-nowrap" htmlFor="student-class-filter">班級</label>
          <div className="relative">
            <select
              id="student-class-filter"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="appearance-none bg-white border border-[#C8D6C9] rounded-lg pl-2.5 pr-7 py-1 text-[15px] font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer"
            >
              <option value="all">全部班級</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 查詢輸入框：姓名 / 座號 / 班級 */}
        <div className="relative flex-1 min-w-[200px] max-w-[420px]">
          <span
            className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#95A5A6] pointer-events-none"
            style={{ fontSize: 20 }}
          >
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋學生姓名 / 座號 / 班級…"
            className="w-full pl-10 pr-9 py-2 text-[15px] bg-white border border-[#C8D6C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8FC87A] focus:border-[#8FC87A] text-[#2D3436] placeholder:text-[#95A5A6]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#EEF5E6] text-[#636E72]"
              title="清除查詢"
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>

        <span className="ml-auto text-[15px] text-[#636E72] whitespace-nowrap">
          {isLoading
            ? '載入中…'
            : searchQuery.trim()
              ? `找到 ${filteredStudents.length} / ${students.length} 位學生`
              : `共 ${students.length} 位學生`}
        </span>
      </div>

      {!isLoading && filteredStudents.length === 0 && searchQuery.trim() ? (
        <div className="bg-white rounded-2xl border border-[#BDC3C7] p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <span className="material-symbols-rounded text-[#95A5A6]" style={{ fontSize: 40 }}>search_off</span>
          <p className="text-[15px] text-[#636E72] font-medium mt-2">沒有符合「{searchQuery}」的學生</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF5E6] text-[#3D5A3E] text-[15px] font-semibold hover:bg-[#C8EAAE] transition"
          >
            清除查詢條件
          </button>
        </div>
      ) : !isLoading && students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#BDC3C7] p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-[#636E72] font-medium">尚無學生診斷紀錄</p>
          <p className="text-sm text-[#95A5A6] mt-1">當學生完成診斷題組的追問對話後，紀錄會自動出現在這裡</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px] min-w-[640px]">
              <thead className="bg-[#EEF5E6] text-[15px] text-[#3D5A3E] tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">班級</th>
                  <th className="px-4 py-3 text-left font-bold">座號</th>
                  <th className="px-4 py-3 text-left font-bold">學生</th>
                  <th className="px-4 py-3 text-center font-bold">題數</th>
                  <th className="px-4 py-3 text-center font-bold">理解</th>
                  <th className="px-4 py-3 text-center font-bold">持有迷思</th>
                  <th className="px-4 py-3 text-left font-bold">最近作答</th>
                  <th className="px-4 py-3 text-right font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5E6]">
                {filteredStudents.map((s) => (
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
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[15px] font-semibold border"
          style={{ backgroundColor: s.classBg, color: s.classFg, borderColor: s.classFg }}
        >
          {s.className ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-[15px] font-mono text-[#636E72] tabular-nums">{s.seat ?? '—'}</td>
      <td className="px-4 py-3">
        <Link
          to={`/teacher/students/${s.studentId}/report`}
          className="text-[15px] text-[#2D3436] font-medium hover:text-[#5BA47A] hover:underline transition"
        >
          {s.studentName}
        </Link>
      </td>
      <td className="px-4 py-3 text-center text-[15px] text-[#636E72]">{s.total}</td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[15px] font-bold bg-[#C8EAAE] text-[#2F4A1A]">
          {s.correct}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[15px] font-bold ${
          s.misconception > 0 ? 'bg-[#FAC8CC] text-[#E74C5E]' : 'bg-[#EEF5E6] text-[#95A5A6]'
        }`}>
          {s.misconception}
        </span>
      </td>
      <td className="px-4 py-3 text-[15px] text-[#636E72]">
        {s.latestAt ? s.latestAt.toLocaleString('zh-TW') : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/teacher/students/${s.studentId}/report`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[15px] font-semibold rounded-lg
                     text-white bg-[#5BA47A] border border-[#3F8B5E] hover:bg-[#3F8B5E] transition
                     opacity-80 group-hover:opacity-100"
        >
          查看報告
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </td>
    </tr>
  );
}
