import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';
import { PHASE_LABEL, STAGE_LABEL } from '../../data/treatmentBot';

/* 治療對話紀錄總覽（spec-08 §5.4 / §3.4）
 * 列出所有 student × scenarioQuiz 的 treatment sessions，可點進去看完整對話。
 */
export default function TreatmentLogs() {
  const navigate = useNavigate();
  const { treatmentSessions, scenarioQuizzes, classes } = useApp();
  const [classFilter, setClassFilter] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');

  /* 將 sessions 字典攤平成陣列，並補上學生資訊 */
  const rows = useMemo(() => {
    return Object.values(treatmentSessions).map((s) => {
      const sq = scenarioQuizzes.find((q) => q.id === s.scenarioQuizId);
      // 暫定：所有 session 都假設來自 class-A（因為原型只支援單一學生）
      const cls = classes.find((c) =>
        c.students.some((stu) => stu.seat === s.studentId)
      );
      const student =
        cls?.students.find((stu) => stu.seat === s.studentId) ?? {
          name: `學生 ${s.studentId}`,
        };
      const totalQuestions = sq?.questions?.length ?? 0;
      const answered = Object.keys(s.perQuestion ?? {}).length;
      // 取最後一題的最終 phase/stage 作為摘要
      const indices = Object.keys(s.perQuestion ?? {})
        .map(Number)
        .sort((a, b) => a - b);
      const lastIdx = indices[indices.length - 1];
      const lastState = s.perQuestion?.[lastIdx];
      return {
        sessionId: s.id,
        sessionKey: `${s.scenarioQuizId}__${s.studentId}`,
        scenarioQuizId: s.scenarioQuizId,
        scenarioTitle: sq?.title ?? s.scenarioQuizId,
        classId: cls?.id ?? '',
        className: cls?.name ?? '—',
        classColor: cls?.color ?? '#EEF5E6',
        classTextColor: cls?.textColor ?? '#636E72',
        studentName: student.name,
        studentSeat: s.studentId,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        totalQuestions,
        answeredQuestions: answered,
        lastPhase: lastState?.phase ?? null,
        lastStage: lastState?.stage ?? null,
        lastStep: lastState?.step ?? 0,
      };
    });
  }, [treatmentSessions, scenarioQuizzes, classes]);

  const filtered = rows.filter((r) => {
    if (classFilter !== 'all' && r.classId !== classFilter) return false;
    if (scenarioFilter !== 'all' && r.scenarioQuizId !== scenarioFilter) return false;
    return true;
  });

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* 頁首 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2D3436]">治療對話紀錄</h1>
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
          <span className="ml-auto text-xs text-[#95A5A6]">共 {filtered.length} 筆紀錄</span>
        </div>

        {/* 紀錄表 */}
        {filtered.length === 0 ? (
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
            <table className="w-full text-sm">
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
                  <tr key={r.sessionKey} className="hover:bg-[#F9FBF7] transition">
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
                          navigate(`/teacher/treatment-logs/${encodeURIComponent(r.sessionKey)}`)
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
        )}
      </div>
    </TeacherLayout>
  );
}
