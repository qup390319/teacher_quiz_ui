import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import { useApp } from '../../../context/AppContext';
import { useTour } from '../../../context/TourContext';
import { Icon } from '../../../components/ui/woodKit';
import { useClasses } from '../../../hooks/useClasses';
import { useQuizzes } from '../../../hooks/useQuizzes';
import { useAssignments } from '../../../hooks/useAssignments';
import { useQuizStats } from '../../../hooks/useAnswers';
import { buildOverviewFromStats, getAllAssignedQuizzes } from './shared/helpers';
import EmptyStateGuide from '../../../components/EmptyStateGuide';
import SchoolYearFilter from '../../../components/SchoolYearFilter';

const TABS = [
  { to: 'overview',       label: '所有班級答題分布', icon: 'donut_large',    tour: 'dash-tab-overview' },
  { to: 'classes',        label: '各班級比較',   icon: 'groups',          tour: 'dash-tab-classes' },
  { to: 'nodes',          label: '知識節點答對率', icon: 'account_tree',   tour: 'dash-tab-nodes' },
  { to: 'misconceptions', label: '高頻迷思排行', icon: 'psychology_alt',  tour: 'dash-tab-misconceptions' },
  { to: 'students',       label: '個別學生報告', icon: 'person_search',   tour: 'dash-tab-students' },
];

export default function DashboardLayout() {
  const { currentQuizId, setCurrentQuizId } = useApp();
  const { startTour } = useTour();
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

  // P4：grade-wide stats 直接從後端拿，不再經過 mock
  const { data: gradeStats } = useQuizStats(effectiveQuizId);
  const overviewData = effectiveQuizId
    ? buildOverviewFromStats(gradeStats, classes, assignments, effectiveQuizId)
    : null;

  const tabSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* ── Header：純標題 + 操作導覽（不再夾入篩選器，2026-05-28 重構） ── */}
        <div className="mb-3 flex items-center gap-3 flex-wrap" data-tour="dash-header">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">診斷結果</h1>
          <button
            type="button"
            onClick={() => startTour('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            title="瞭解診斷結果功能"
          >
            <Icon name="tour" className="text-base" />
            操作導覽
          </button>
        </div>

        {/* ── Filter Row：主篩選（題組）│ 次篩選（時間軸 + 封存）── */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2" data-tour="dash-filters">
          {availableQuizzes.length > 0 && (
            <>
              {/* 主篩選器：題組（綠底凸顯，加 leading label「目前題組」） */}
              <div
                className="inline-flex items-center gap-2 bg-[#EEF5E6] border border-[#8FC87A] rounded-2xl pl-3 pr-1.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                data-tour="dash-quiz-selector"
              >
                <span className="material-symbols-rounded text-[#3D5A3E] flex-shrink-0" style={{ fontSize: 18 }}>quiz</span>
                <span className="text-xs font-bold text-[#3D5A3E] whitespace-nowrap uppercase tracking-wider">目前題組</span>
                <div className="relative">
                  <select
                    value={effectiveQuizId ?? ''}
                    onChange={e => handleQuizChange(e.target.value)}
                    className="appearance-none bg-white border border-[#C8D6C9] rounded-lg pl-2.5 pr-7 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer max-w-[260px] truncate"
                    aria-label="選擇題組"
                  >
                    {availableQuizzes.map(q => (<option key={q.id} value={q.id}>{q.title}</option>))}
                  </select>
                  <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* 主/次篩選分隔線 */}
              <div className="hidden sm:block w-px h-7 bg-[#D5D8DC] mx-1" aria-hidden="true" />
            </>
          )}

          {/* 次篩選器：學年 / 學期 / 含封存 */}
          <SchoolYearFilter />
        </div>

        {/* ── Tabs：分頁切換 ── */}
        <div className="mb-6 bg-white rounded-2xl border border-[#E1E6E2] p-1.5 inline-flex items-center gap-1 shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex-wrap" data-tour="dash-tabs">
          {TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={`/teacher/dashboard/${tab.to}${tabSearch}`}
              data-tour={tab.tour}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#6FB55C] text-white shadow-[0_2px_6px_rgba(111,181,92,0.35)]'
                    : 'text-[#5A6663] hover:bg-[#F1F6EE] hover:text-[#2D3436]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 18, fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0' }}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {availableQuizzes.length === 0 || !effectiveQuizId ? (
          quizzes.length === 0 ? (
            <EmptyStateGuide
              icon="edit_note"
              title="還沒有任何診斷題組"
              description={'要看診斷結果，請先完成前兩步：\n① 出診斷題  ②派題給班級'}
              preview={[
                '全班答題分布（全對 / 對一半 / 全錯）',
                '各知識節點答對率',
                '高頻迷思排行與涉及學生',
                '個別學生診斷報告',
              ]}
              primaryAction={{ label: '前往出題', to: '/teacher/quizzes' }}
            />
          ) : (
            <EmptyStateGuide
              icon="send"
              title="題組還沒派給班級"
              description={'已建立題組，但尚未派發。\n派題後學生作答完成，這裡會出現完整診斷結果。'}
              preview={[
                '全班答題分布（全對 / 對一半 / 全錯）',
                '各知識節點答對率',
                '高頻迷思排行與涉及學生',
                '個別學生診斷報告',
              ]}
              primaryAction={{ label: '前往派題', to: '/teacher/assignments/diagnosis' }}
              secondaryAction={{ label: '回題組編輯', to: '/teacher/quizzes' }}
            />
          )
        ) : (
          <Outlet context={{ quizId: effectiveQuizId, overviewData, classes, assignments, quizzes, gradeStats }} />
        )}
      </div>
    </TeacherLayout>
  );
}

