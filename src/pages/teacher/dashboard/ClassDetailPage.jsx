import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import InfoButton from '../../../components/InfoButton';
import InfoDrawer from '../../../components/InfoDrawer';
import { CHART_INFO } from '../../../data/chartInfoConfig';
import SingleClassReport from './shared/SingleClassReport';
import TreatmentEffectivenessPanel from './shared/TreatmentEffectivenessPanel';

export default function ClassDetailPage() {
  const { quizId, assignments, quizzes, classes } = useOutletContext();
  const { setCurrentClassId, currentClassId } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [completionInfoOpen, setCompletionInfoOpen] = useState(false);
  const [reportPhase, setReportPhase] = useState('diagnosis');

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

  const selectOptions = classes.flatMap(cls => {
    const clsAssignments = filteredAssignments.filter(a => a.classId === cls.id);
    if (clsAssignments.length === 0) return [{ classId: cls.id, quizId: null, label: `${cls.name} — 未派題`, disabled: true }];
    return clsAssignments.map(a => {
      const rate = a.completionRate ?? 100;
      const submitted = a.submittedCount ?? cls.studentCount ?? 0;
      const total = a.totalStudents ?? cls.studentCount ?? 0;
      return { classId: cls.id, quizId: a.quizId, label: `${cls.name} · ${rate}%（${submitted}/${total} 人）`, disabled: false, rate, submitted, total };
    });
  });
  const selectedOption = selectOptions.find(o => o.classId === effectiveClassId && o.quizId === quizId) ?? null;
  const selectedRate = selectedOption?.rate;
  const selectedBarColor = selectedRate === 100 ? '#8FC87A' : selectedRate >= 50 ? '#F4D03F' : '#F28B95';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-bold text-[#2D3436]">選擇班級</h3>
          <InfoButton onClick={() => setCompletionInfoOpen(true)} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={effectiveClassId && quizId ? `${effectiveClassId}|${quizId}` : ''}
            onChange={(e) => {
              const [cId, qId] = e.target.value.split('|');
              handleSelectClassWithQuiz(cId, qId);
            }}
            className="flex-1 min-w-[200px] max-w-xs px-3 py-2 rounded-xl border border-[#BDC3C7] bg-white text-sm font-semibold text-[#2D3436] focus:outline-none focus:border-[#8FC87A] focus:ring-1 focus:ring-[#8FC87A] cursor-pointer"
          >
            <option value="">請選擇班級</option>
            {selectOptions.map((o, i) => (
              <option key={`${o.classId}-${o.quizId ?? i}`} value={`${o.classId}|${o.quizId}`} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          {selectedOption && (
            <div className="flex items-center gap-2.5">
              <div className="w-24 bg-[#D5D8DC] rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${selectedRate}%`, backgroundColor: selectedBarColor }} />
              </div>
              <span className="text-sm font-bold text-[#2D3436]">{selectedRate}%</span>
              <span className="text-sm text-[#95A5A6]">{selectedOption.submitted}/{selectedOption.total} 人</span>
            </div>
          )}
        </div>
        <InfoDrawer isOpen={completionInfoOpen} onClose={() => setCompletionInfoOpen(false)} config={CHART_INFO['all-classes-completion']} />
      </div>

      {selectedClass ? (
        <>
          <div className="flex gap-2">
            {[
              { key: 'diagnosis', label: '迷思概念診斷報告', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { key: 'treatment', label: '概念釐清成效報告', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setReportPhase(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-colors ${
                  reportPhase === tab.key
                    ? tab.key === 'diagnosis'
                      ? 'bg-[#FFF1D8] border-[#F0B962] text-[#7A4A18]'
                      : 'bg-[#E0F0E8] border-[#3F8B5E] text-[#2E6B47]'
                    : 'bg-white border-[#BDC3C7] text-[#636E72] hover:bg-[#EEF5E6]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {reportPhase === 'diagnosis' ? (
            <SingleClassReport
              cls={selectedClass}
              assignments={assignments}
              quizzes={quizzes}
              quizId={quizId}
            />
          ) : (
            <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <TreatmentEffectivenessPanel
                classId={selectedClass.id}
                totalStudents={selectedClass.studentCount ?? selectedOption?.total ?? 0}
              />
            </div>
          )}
        </>
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
