import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTreatmentLogs } from '../../../../hooks/useTreatment';

const STATUS_COLORS = {
  completed: '#8FC87A',
  active: '#F4D03F',
  notStarted: '#D5D8DC',
};

export default function TreatmentEffectivenessPanel({ classId, scenarioQuizId, totalStudents }) {
  const [expanded, setExpanded] = useState(false);
  const { data: logs, isLoading } = useTreatmentLogs({
    classId,
    scenarioQuizId: scenarioQuizId || undefined,
  });

  const summary = useMemo(() => {
    if (!logs) return null;
    const classLogs = logs.filter(l => l.classId === classId);
    const completed = classLogs.filter(l => l.status === 'completed');
    const active = classLogs.filter(l => l.status === 'active');
    const completedCount = completed.length;
    const activeCount = active.length;
    const notStartedCount = Math.max(0, totalStudents - completedCount - activeCount);
    const completionRate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

    const pieData = [
      { name: '已完成', value: completedCount, color: STATUS_COLORS.completed },
      { name: '進行中', value: activeCount, color: STATUS_COLORS.active },
      { name: '未開始', value: notStartedCount, color: STATUS_COLORS.notStarted },
    ].filter(d => d.value > 0);

    const students = classLogs.map(l => ({
      studentId: l.studentId,
      studentName: l.studentName,
      status: l.status,
      progress: l.totalQuestions > 0
        ? Math.round((l.currentQuestionIndex / l.totalQuestions) * 100)
        : 0,
      totalQuestions: l.totalQuestions,
      currentIndex: l.currentQuestionIndex,
      completedAt: l.completedAt,
    }));

    return { completedCount, activeCount, notStartedCount, completionRate, pieData, students };
  }, [logs, classId, totalStudents]);

  if (isLoading) {
    return (
      <div className="text-center text-sm text-[#636E72] py-8">載入概念釐清資料中…</div>
    );
  }

  if (!summary || summary.students.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-bold text-[#2D3436]">概念釐清進度</h3>
        </div>
        <div className="bg-[#EEF5E6] rounded-2xl p-6 text-center">
          <p className="text-sm text-[#636E72]">尚無概念釐清學習紀錄</p>
          <p className="text-xs text-[#95A5A6] mt-1">學生開始概念釐清對話後，進度與成效資料會在此顯示</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">概念釐清進度</h3>
      </div>
      <p className="text-sm text-[#636E72] mb-4">
        追蹤各學生的概念釐清對話完成狀態
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-4 col-span-1">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie data={summary.pieData} dataKey="value" cx="50%" cy="50%"
                innerRadius={28} outerRadius={42} paddingAngle={2}>
                {summary.pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [`${val} 人`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-sm space-y-1">
            {[
              { label: '已完成', count: summary.completedCount, color: STATUS_COLORS.completed },
              { label: '進行中', count: summary.activeCount, color: STATUS_COLORS.active },
              { label: '未開始', count: summary.notStartedCount, color: STATUS_COLORS.notStarted },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[#636E72]">{s.label}</span>
                <span className="font-bold text-[#2D3436]">{s.count} 人</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-3 gap-3">
          {[
            { label: '完成率', value: `${summary.completionRate}%`,
              color: summary.completionRate >= 80 ? 'text-[#3D5A3E]' : summary.completionRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
              bg: summary.completionRate >= 80 ? 'bg-[#C8EAAE]' : summary.completionRate >= 50 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
              sub: `${summary.completedCount}/${totalStudents} 人已完成` },
            { label: '進行中', value: `${summary.activeCount} 人`,
              color: 'text-[#B7950B]', bg: 'bg-[#FCF0C2]',
              sub: '正在進行概念釐清對話' },
            { label: '待開始', value: `${summary.notStartedCount} 人`,
              color: summary.notStartedCount > 0 ? 'text-[#636E72]' : 'text-[#3D5A3E]',
              bg: summary.notStartedCount > 0 ? 'bg-[#F0F0F0]' : 'bg-[#C8EAAE]',
              sub: summary.notStartedCount > 0 ? '尚未開始概念釐清' : '全班皆已參與' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border border-[#BDC3C7] p-3 ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-semibold text-[#2D3436] mt-0.5">{s.label}</p>
              <p className="text-[10px] text-[#636E72] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {summary.students.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(p => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#636E72] hover:text-[#2D3436] transition-colors mb-2"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? '收合學生明細' : `查看學生明細（${summary.students.length} 人）`}
          </button>

          {expanded && (
            <div className="overflow-x-auto rounded-2xl border border-[#BDC3C7]">
              <table className="w-full text-sm bg-white">
                <thead>
                  <tr className="bg-[#EEF5E6] border-b border-[#BDC3C7]">
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-[#636E72]">學生</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-[#636E72]">狀態</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-[#636E72]">進度</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold text-[#636E72]">完成時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E8]">
                  {summary.students
                    .sort((a, b) => {
                      if (a.status === 'completed' && b.status !== 'completed') return -1;
                      if (a.status !== 'completed' && b.status === 'completed') return 1;
                      return a.studentName.localeCompare(b.studentName, 'zh-Hant');
                    })
                    .map(s => (
                      <tr key={s.studentId}>
                        <td className="px-4 py-2.5 text-sm font-medium text-[#2D3436]">{s.studentName}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            s.status === 'completed'
                              ? 'bg-[#C8EAAE] text-[#3D5A3E]'
                              : 'bg-[#FCF0C2] text-[#B7950B]'
                          }`}>
                            {s.status === 'completed' ? '已完成' : '進行中'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-[#D5D8DC] rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${s.status === 'completed' ? 100 : s.progress}%`,
                                  backgroundColor: s.status === 'completed' ? '#8FC87A' : '#F4D03F',
                                }} />
                            </div>
                            <span className="text-xs text-[#636E72]">
                              {s.status === 'completed' ? s.totalQuestions : s.currentIndex}/{s.totalQuestions}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-[#95A5A6]">
                          {s.completedAt ? new Date(s.completedAt).toLocaleDateString('zh-TW') : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
