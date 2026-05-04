import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import InfoButton from '../../../components/InfoButton';
import InfoDrawer from '../../../components/InfoDrawer';
import { CHART_INFO } from '../../../data/chartInfoConfig';
import SingleClassReport from './shared/SingleClassReport';

export default function ClassDetailPage() {
  const { quizId, assignments, quizzes, classes } = useOutletContext();
  const { setCurrentClassId, currentClassId } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [completionInfoOpen, setCompletionInfoOpen] = useState(false);

  const queryClassId = searchParams.get('classId');
  const validClassIds = classes.map(c => c.id);
  const effectiveClassId =
    (queryClassId && validClassIds.includes(queryClassId) ? queryClassId : null) ??
    (currentClassId && validClassIds.includes(currentClassId) ? currentClassId : null);

  useEffect(() => {
    if (effectiveClassId && effectiveClassId !== queryClassId) {
      const next = new URLSearchParams(searchParams);
      next.set('classId', effectiveClassId);
      setSearchParams(next, { replace: true });
    }
    if (effectiveClassId !== currentClassId) {
      setCurrentClassId(effectiveClassId);
    }
  }, [effectiveClassId, queryClassId, searchParams, setSearchParams, currentClassId, setCurrentClassId]);

  const selectedClass = classes.find(c => c.id === effectiveClassId) ?? null;

  const handleSelectClassWithQuiz = (classId, newQuizId) => {
    const next = new URLSearchParams(searchParams);
    next.set('classId', classId);
    if (newQuizId) next.set('quizId', newQuizId);
    setSearchParams(next, { replace: false });
  };

  const filteredAssignments = quizId
    ? assignments.filter(a => a.quizId === quizId)
    : assignments;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-base font-bold text-[#2D3436]">各班派題完成率</h3>
            <p className="text-sm text-[#636E72] mt-0.5">
              {selectedClass ? `目前查看：${selectedClass.name} · ` : '尚未選擇班級 · '}
              點擊下方任一班級可切換詳細報告
            </p>
          </div>
          <InfoButton onClick={() => setCompletionInfoOpen(true)} />
        </div>
        <div className="space-y-4 mt-4">
          {classes.map(cls => {
            const clsAssignments = filteredAssignments.filter(a => a.classId === cls.id);
            if (clsAssignments.length === 0) {
              return (
                <div key={cls.id} className="flex items-center gap-4 p-4 rounded-2xl border border-[#D5D8DC] bg-[#EEF5E6]">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2D3436]">{cls.name}</p>
                    <p className="text-xs text-[#95A5A6] mt-0.5">尚未派發此考卷</p>
                  </div>
                  <span className="text-xs text-[#95A5A6] border border-[#D5D8DC] px-2 py-1 rounded-full">未派題</span>
                </div>
              );
            }
            return clsAssignments.map(a => {
              const quiz = quizzes.find(q => q.id === a.quizId);
              // P3 過渡：assignment 不再帶 completion stats（P4 才從 DB 算）
              const completionRate = a.completionRate ?? 100;
              const submittedCount = a.submittedCount ?? cls.studentCount ?? 0;
              const totalStudents = a.totalStudents ?? cls.studentCount ?? 0;
              const barColor = completionRate === 100 ? '#8FC87A' : completionRate >= 50 ? '#F4D03F' : '#F28B95';
              const isActive = effectiveClassId === cls.id && quizId === a.quizId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelectClassWithQuiz(cls.id, a.quizId)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                    isActive
                      ? 'bg-[#EEF5E6] border-[#8FC87A]'
                      : 'bg-white border-[#D5D8DC] hover:bg-[#EEF5E6]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#2D3436]">{cls.name}</span>
                        <span className="text-xs text-[#95A5A6]">·</span>
                        <span className="text-xs text-[#636E72]">{quiz?.title ?? a.quizId}</span>
                      </div>
                      <p className="text-xs text-[#95A5A6] mt-0.5">派題日：{a.assignedAt} · 截止日：{a.dueDate}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-[#2D3436]">{completionRate}%</p>
                      <p className="text-xs text-[#95A5A6]">{submittedCount}/{totalStudents} 人</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#D5D8DC] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${completionRate}%`, backgroundColor: barColor }} />
                  </div>
                </button>
              );
            });
          })}
        </div>
        <InfoDrawer isOpen={completionInfoOpen} onClose={() => setCompletionInfoOpen(false)} config={CHART_INFO['all-classes-completion']} />
      </div>

      {selectedClass ? (
        <SingleClassReport
          cls={selectedClass}
          assignments={assignments}
          quizzes={quizzes}
          quizId={quizId}
        />
      ) : (
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
          <div className="w-16 h-16 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-[#636E72] font-medium mb-1">請從上方清單選擇班級</p>
          <p className="text-sm text-[#95A5A6]">選擇班級後即可查看該班的詳細診斷報告</p>
        </div>
      )}
    </div>
  );
}
