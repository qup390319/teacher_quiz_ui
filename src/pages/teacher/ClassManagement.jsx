import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';

export default function ClassManagement() {
  const navigate = useNavigate();
  const { classes, assignments, quizzes } = useApp();

  const getLastAssignment = (classId) => {
    const clsAssignments = assignments.filter((a) => a.classId === classId);
    if (clsAssignments.length === 0) return null;
    return clsAssignments.reduce((latest, a) =>
      a.assignedAt > latest.assignedAt ? a : latest
    );
  };

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* 頁首 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3436]">班級管理</h1>
            <p className="text-[#636E72] mt-1 text-sm">管理各班級的學生名單與相關資訊</p>
          </div>
        </div>

        {/* 班級卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => {
            const lastAssignment = getLastAssignment(cls.id);
            const lastQuiz = lastAssignment ? quizzes.find((q) => q.id === lastAssignment.quizId) : null;

            return (
              <div
                key={cls.id}
                className="bg-white rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow"
              >
                {/* 色條 */}
                <div className="h-2" style={{ backgroundColor: cls.color }} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#2D3436]">{cls.name}</h3>
                      <p className="text-sm text-[#636E72] mt-0.5">{cls.grade} · {cls.subject}</p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cls.color }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ color: cls.textColor }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* 統計 */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-3 text-center">
                      <p className="text-xl font-bold text-[#2D3436]">{cls.students.length}</p>
                      <p className="text-xs text-[#636E72] mt-0.5">位學生</p>
                    </div>
                    <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-3 text-center">
                      <p className="text-xl font-bold text-[#2D3436]">
                        {assignments.filter((a) => a.classId === cls.id).length}
                      </p>
                      <p className="text-xs text-[#636E72] mt-0.5">筆派題</p>
                    </div>
                  </div>

                  {/* 最近派題 */}
                  <div className="mb-5">
                    {lastAssignment ? (
                      <div className="bg-[#EEF5E6] rounded-xl border border-[#D5D8DC] px-3 py-2.5">
                        <p className="text-xs text-[#95A5A6] mb-0.5">最近派題</p>
                        <p className="text-xs font-medium text-[#2D3436] truncate">{lastQuiz?.title ?? lastAssignment.quizId}</p>
                        <p className="text-xs text-[#636E72] mt-0.5">{lastAssignment.assignedAt} · 完成率 {lastAssignment.completionRate}%</p>
                      </div>
                    ) : (
                      <div className="bg-[#EEF5E6] rounded-xl border border-[#D5D8DC] px-3 py-2.5">
                        <p className="text-xs text-[#95A5A6]">尚未有派題記錄</p>
                      </div>
                    )}
                  </div>

                  {/* 操作 */}
                  <button
                    onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#2D3436] border border-[#BDC3C7] rounded-2xl hover:bg-[#EEF5E6] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    管理成員
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TeacherLayout>
  );
}
