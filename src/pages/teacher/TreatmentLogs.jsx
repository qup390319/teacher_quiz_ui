import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useScenarios } from '../../hooks/useScenarios';
import { useClasses } from '../../hooks/useClasses';
import { useTreatmentLogs } from '../../hooks/useTreatment';
import { PHASE_LABEL, STAGE_LABEL } from '../../data/treatmentBot';

const CLASS_COLORS = {
  'class-A': { bg: '#C8EAAE', fg: '#3D5A3E' },
  'class-B': { bg: '#BADDF4', fg: '#2E86C1' },
  'class-C': { bg: '#FCF0C2', fg: '#B7950B' },
};

/* 治療對話紀錄總覽（spec-08 §5.4 / §3.4）
 * P4 起：直接從 /api/teachers/treatment-logs 拉取。
 */
export default function TreatmentLogs() {
  const navigate = useNavigate();
  const { data: scenarioQuizzes = [] } = useScenarios();
  const { data: classes = [] } = useClasses();
  const [classFilter, setClassFilter] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const { data: logs = [], isLoading } = useTreatmentLogs({
    classId: classFilter,
    scenarioQuizId: scenarioFilter,
  });

  const rows = useMemo(() => {
    return logs.map((l) => {
      const palette = CLASS_COLORS[l.classId ?? ''] ?? { bg: '#EEF5E6', fg: '#636E72' };
      return {
        sessionId: l.sessionId,
        scenarioQuizId: l.scenarioQuizId,
        scenarioTitle: l.scenarioTitle,
        classId: l.classId,
        className: l.className ?? '—',
        classColor: palette.bg,
        classTextColor: palette.fg,
        studentName: l.studentName,
        studentSeat: l.studentId,
        status: l.status,
        startedAt: l.startedAt,
        completedAt: l.completedAt,
        totalQuestions: l.totalQuestions,
        answeredQuestions: Math.max(l.currentQuestionIndex - 1, 0),
        lastPhase: null,  // backend doesn't aggregate; future enhancement
        lastStage: null,
        lastStep: 0,
      };
    });
  }, [logs]);

  const filtered = rows;

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">治療對話紀錄</h1>
          <p className="text-[#636E72] mt-1 text-sm">
            檢視學生與 AI 的治療對話內容，作為派發治療成效的判斷依據（spec-08 §5.4）
          </p>
        </div>

        {/* 篩選 */}
        <div className="bg-white rounded-2xl border border-[#BDC3C7] p-4 mb-4 flex flex-wrap items-center gap-3
                        shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#636E72]">班級</label>
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
            <label className="text-xs font-semibold text-[#636E72]">情境考卷</label>
            <select
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#BDC3C7] bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40"
            >
              <option value="all">全部情境</option>
              {scenarioQuizzes.map((sq) => (
                <option key={sq.id} value={sq.id}>{sq.title}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto text-xs text-[#95A5A6]">
            {isLoading ? '載入中…' : `共 ${filtered.length} 筆紀錄`}
          </span>
        </div>

        {/* 紀錄表 */}
        {!isLoading && filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#BDC3C7] p-12 text-center">
            <div className="w-14 h-14 bg-[#E0F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium">還沒有治療對話紀錄</p>
            <p className="text-sm text-[#95A5A6] mt-1">當學生開始情境治療對話後，紀錄會自動出現在這裡</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
           <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-[#EEF5E6] text-xs text-[#636E72] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">班級</th>
                  <th className="px-4 py-3 text-left font-semibold">學生</th>
                  <th className="px-4 py-3 text-left font-semibold">情境考卷</th>
                  <th className="px-4 py-3 text-left font-semibold">進度</th>
                  <th className="px-4 py-3 text-left font-semibold">最後階段</th>
                  <th className="px-4 py-3 text-left font-semibold">狀態</th>
                  <th className="px-4 py-3 text-left font-semibold">開始時間</th>
                  <th className="px-4 py-3 text-right font-semibold">動作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5E6]">
                {filtered.map((r) => (
                  <tr key={r.sessionId} className="hover:bg-[#F9FBF7] transition">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
                        style={{ backgroundColor: r.classColor, color: r.classTextColor, borderColor: r.classTextColor }}
                      >
                        {r.className}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#2D3436] font-medium">{r.studentName}</td>
                    <td className="px-4 py-3 text-[#636E72]">{r.scenarioTitle}</td>
                    <td className="px-4 py-3 text-[#636E72] font-mono text-xs">
                      {r.answeredQuestions} / {r.totalQuestions} 題
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.lastPhase ? (
                        <span className="text-[#3F8B5E] font-semibold">
                          {PHASE_LABEL[r.lastPhase] ?? r.lastPhase}・{STAGE_LABEL[r.lastStage] ?? r.lastStage}
                        </span>
                      ) : (
                        <span className="text-[#95A5A6]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                   ${r.status === 'completed'
                                     ? 'bg-[#C8EAAE] text-[#2F4A1A]'
                                     : 'bg-[#FCF0C2] text-[#7A5232]'}`}
                      >
                        {r.status === 'completed' ? '已完成' : '進行中'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#95A5A6]">
                      {r.startedAt ? new Date(r.startedAt).toLocaleString('zh-TW') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/teacher/treatment-logs/${encodeURIComponent(r.sessionId)}`)
                        }
                        className="px-3 py-1 text-xs font-semibold text-white bg-[#5BA47A] border border-[#3F8B5E]
                                   rounded-lg hover:bg-[#3F8B5E] transition"
                      >
                        查看對話
                      </button>
                    </td>
                  </tr>
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
