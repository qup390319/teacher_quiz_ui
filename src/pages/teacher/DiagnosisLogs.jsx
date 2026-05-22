import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import SchoolYearFilter from '../../components/SchoolYearFilter';
import { useDiagnosisLogs } from '../../hooks/useAnswers';
import { useClasses } from '../../hooks/useClasses';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useTour } from '../../context/TourContext';
import { Icon } from '../../components/ui/woodKit';

const CLASS_COLORS = {
  'class-A': { bg: '#C8EAAE', fg: '#3D5A3E' },
  'class-B': { bg: '#BADDF4', fg: '#2E86C1' },
  'class-C': { bg: '#FCF0C2', fg: '#B7950B' },
};

export default function DiagnosisLogs() {
  const { data: classes = [] } = useClasses();
  const { data: quizzes = [] } = useQuizzes();
  const { startTour } = useTour();
  const [classFilter, setClassFilter] = useState('all');
  const [quizFilter, setQuizFilter] = useState('all');

  const { data: logs = [], isLoading } = useDiagnosisLogs({
    classId: classFilter,
    quizId: quizFilter,
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
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div data-tour="logs-page-header" className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">診斷對話紀錄</h1>
            <button
              type="button"
              onClick={() => startTour('diagnosis-logs')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              title="瞭解功能"
            >
              <Icon name="tour" className="text-base" />
              操作導覽
            </button>
          </div>
          <p className="text-[#636E72] mt-1 text-sm">
            點擊學生查看完整的追問對話內容與診斷結果
          </p>
        </div>

        {/* 全域學年篩選器（spec-05 §1.5）*/}
        <div className="mb-4">
          <SchoolYearFilter />
        </div>

        <div data-tour="logs-filter-bar" className="bg-white rounded-2xl border border-[#BDC3C7] p-4 mb-4 flex flex-wrap items-center gap-3
                        shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#636E72]">班級</label>
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[#636E72]">診斷題組</label>
            <select
              value={quizFilter}
              onChange={(e) => setQuizFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
            >
              <option value="all">全部題組</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto text-sm text-[#95A5A6]">
            {isLoading ? '載入中…' : `共 ${students.length} 位學生`}
          </span>
        </div>

        {!isLoading && students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#BDC3C7] p-12 text-center">
            <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium">還沒有診斷對話紀錄</p>
            <p className="text-sm text-[#95A5A6] mt-1">當學生完成診斷題組的追問對話後，紀錄會自動出現在這裡</p>
          </div>
        ) : (
          <div data-tour="logs-table" className="bg-white rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-[#EEF5E6] text-sm text-[#636E72] uppercase tracking-wider">
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
    </TeacherLayout>
  );
}

function StudentRow({ student: s }) {
  return (
    <tr className="hover:bg-[#F9FBF7] transition group">
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold border"
          style={{ backgroundColor: s.classBg, color: s.classFg, borderColor: s.classFg }}
        >
          {s.className ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-mono text-[#636E72]">{s.seat ?? '—'}</td>
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
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-[#C8EAAE] text-[#2F4A1A]">
          {s.correct}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
          s.misconception > 0 ? 'bg-[#FAC8CC] text-[#E74C5E]' : 'bg-[#EEF5E6] text-[#95A5A6]'
        }`}>
          {s.misconception}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#95A5A6]">
        {s.latestAt ? s.latestAt.toLocaleString('zh-TW') : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/teacher/students/${s.studentId}/report`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg
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
