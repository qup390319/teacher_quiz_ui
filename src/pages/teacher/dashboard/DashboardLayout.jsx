import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import { useApp } from '../../../context/AppContext';
import { useClasses } from '../../../hooks/useClasses';
import { useQuizzes } from '../../../hooks/useQuizzes';
import { useAssignments } from '../../../hooks/useAssignments';
import { computeOverviewForQuiz, getAllAssignedQuizzes } from './shared/helpers';

const TABS = [
  { to: 'overview',       label: '全年級總覽' },
  { to: 'classes',        label: '各班學習狀況' },
  { to: 'nodes',          label: '知識節點跨班比較' },
  { to: 'misconceptions', label: '跨班高頻迷思' },
  { to: 'class-detail',   label: '各班詳細報告' },
];

export default function DashboardLayout() {
  const { currentQuizId, setCurrentQuizId } = useApp();
  const { data: classes = [] } = useClasses();
  const { data: assignments = [] } = useAssignments();
  const { data: quizzes = [] } = useQuizzes();
  const [searchParams, setSearchParams] = useSearchParams();

  const availableQuizzes = useMemo(
    () => getAllAssignedQuizzes(assignments, quizzes),
    [assignments, quizzes]
  );

  const queryQuizId = searchParams.get('quizId');
  const effectiveQuizId =
    (queryQuizId && availableQuizzes.some(q => q.id === queryQuizId) ? queryQuizId : null) ??
    (currentQuizId && availableQuizzes.some(q => q.id === currentQuizId) ? currentQuizId : null) ??
    availableQuizzes[0]?.id ??
    null;

  useEffect(() => {
    if (!effectiveQuizId) return;
    if (effectiveQuizId !== queryQuizId) {
      const next = new URLSearchParams(searchParams);
      next.set('quizId', effectiveQuizId);
      setSearchParams(next, { replace: true });
    }
    if (effectiveQuizId !== currentQuizId) {
      setCurrentQuizId(effectiveQuizId);
    }
  }, [effectiveQuizId, queryQuizId, searchParams, setSearchParams, currentQuizId, setCurrentQuizId]);

  const handleQuizChange = (quizId) => {
    const next = new URLSearchParams(searchParams);
    if (quizId) next.set('quizId', quizId);
    else next.delete('quizId');
    next.delete('classId');
    setSearchParams(next, { replace: false });
  };

  const overviewData = effectiveQuizId
    ? computeOverviewForQuiz(effectiveQuizId, classes, assignments)
    : null;

  const selectedQuizTitle = quizzes.find(q => q.id === effectiveQuizId)?.title;

  const tabSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">診斷結果</h1>
            <p className="text-[#636E72] mt-1 text-sm">
              {selectedQuizTitle ? `全部班級 · ${selectedQuizTitle}` : '全部班級 · 派題完成率與診斷總覽'}
            </p>
          </div>

          {availableQuizzes.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-[#636E72] font-medium">查看考卷</span>
              <div className="relative">
                <select
                  value={effectiveQuizId ?? ''}
                  onChange={e => handleQuizChange(e.target.value)}
                  className="appearance-none bg-white border border-[#BDC3C7] rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer"
                >
                  {availableQuizzes.map(q => (<option key={q.id} value={q.id}>{q.title}</option>))}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#BDC3C7] p-1 mb-6 inline-flex gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex-wrap">
          {TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={`/teacher/dashboard/${tab.to}${tabSearch}`}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  isActive
                    ? 'bg-[#C8EAAE] text-[#2D3436] border-[#8FC87A]'
                    : 'text-[#636E72] hover:bg-[#EEF5E6] hover:text-[#2D3436] border-transparent'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        {availableQuizzes.length === 0 || !effectiveQuizId ? (
          <EmptyState
            title="目前尚無派題資料"
            subtitle="請先至「派題管理」將考卷派發給班級，這裡才會顯示診斷結果。" />
        ) : (
          <Outlet context={{ quizId: effectiveQuizId, overviewData, classes, assignments, quizzes }} />
        )}
      </div>
    </TeacherLayout>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
      <div className="w-16 h-16 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-[#636E72] font-medium mb-1">{title}</p>
      <p className="text-sm text-[#95A5A6]">{subtitle}</p>
    </div>
  );
}
