import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';
import { useClasses } from '../../hooks/useClasses';
import { useQuizzes } from '../../hooks/useQuizzes';
import {
  useAddAssignment,
  useAssignments,
  useRemoveAssignment,
  useUpdateAssignment,
} from '../../hooks/useAssignments';
import { useTour } from '../../context/TourContext';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../../components/ui/woodKit';

import OverviewBar from './assignment/OverviewBar';
import MatrixView from './assignment/MatrixView';
import { getGlobalSummary } from './assignment/assignmentStats';

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function AssignmentManagement() {
  const navigate = useNavigate();
  const { setCurrentClassId, setCurrentQuizId } = useApp();
  const { startTour } = useTour();
  const { toast } = useToast();
  const { data: assignments = [] } = useAssignments();
  const { data: quizzes = [] } = useQuizzes();
  const { data: classes = [] } = useClasses();
  const addAssignmentMut = useAddAssignment();
  const updateAssignmentMut = useUpdateAssignment();
  const removeAssignmentMut = useRemoveAssignment();

  const [popover, setPopover] = useState(null);
  const [managePopover, setManagePopover] = useState(null);
  const [sortBy, setSortBy] = useState('default');

  /* published 診斷題組 */
  const publishedQuizzesRaw = quizzes.filter((q) => q.status === 'published');

  /* 排序 */
  const assignCountByQuiz = (q) => assignments.filter(
    (a) => (a.type ?? 'diagnosis') === 'diagnosis' && a.quizId === q.id,
  ).length;

  const publishedQuizzes = [...publishedQuizzesRaw].sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':      return (a.title ?? '').localeCompare(b.title ?? '', 'zh-Hant');
      case 'title-desc':     return (b.title ?? '').localeCompare(a.title ?? '', 'zh-Hant');
      case 'assigned-desc':  return assignCountByQuiz(b) - assignCountByQuiz(a);
      case 'assigned-asc':   return assignCountByQuiz(a) - assignCountByQuiz(b);
      case 'newest':         return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      case 'oldest':         return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
      default:               return 0;
    }
  });


  // ── Assignment 操作 ──────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars -- mode will be used when backend supports dispatch_mode
  const handleConfirmDiagnosis = async (quizId, classId, dueDate, _mode) => {
    if (!dueDate) {
      toast.error('請選擇截止日期');
      return;
    }
    try {
      await addAssignmentMut.mutateAsync({
        type: 'diagnosis',
        quizId,
        classId,
        targetType: 'class',
        studentIds: [],
        dueDate,
        status: 'active',
      });
      setPopover(null);
      toast.success('題組已成功派發給班級！');
    } catch (err) {
      console.error('[AssignmentManagement] add failed', err);
      toast.error('派發失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleViewReport = (classId, quizId) => {
    setCurrentClassId(classId);
    setCurrentQuizId(quizId);
    navigate('/teacher/dashboard');
  };

  const handleUpdateDueDate = async (assignmentId, dueDate) => {
    try {
      await updateAssignmentMut.mutateAsync({ id: assignmentId, dueDate });
    } catch (err) {
      toast.error('更新失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleRemove = async (assignmentId) => {
    try {
      await removeAssignmentMut.mutateAsync(assignmentId);
      setManagePopover(null);
      toast.success('已取消派發');
    } catch (err) {
      toast.error('刪除失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  // Popover state handlers（共用給兩個 view）
  const handleOpenAssign = ({ quizId, classId }) => {
    setManagePopover(null);
    setPopover({ quizId, classId });
  };
  const handleOpenManage = ({ assignmentId, quizId, classId }) => {
    setPopover(null);
    setManagePopover({ assignmentId, quizId, classId });
  };

  // ── 全頁概覽 ────────────────────────────────────────────────────────────
  const globalSummary = getGlobalSummary(publishedQuizzes, classes, assignments);

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
        {/* ── 頁面標題 ── */}
        <div data-tour="assign-page-header">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">派題管理</h1>
            <button
              type="button"
              onClick={() => startTour('assignment')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              title="瞭解派題管理功能"
            >
              <Icon name="tour" className="text-base" />
              操作導覽
            </button>
          </div>
          <p className="text-[#636E72] mt-1 text-sm">
            每格代表一份題組對一個班級的派發狀態。空格點擊即可派發，已派格點擊可管理。
          </p>
        </div>

        {/* ── 全頁概覽 ── */}
        {publishedQuizzes.length > 0 && <OverviewBar summary={globalSummary} />}

        {/* ── 題組排序 ── */}
        {publishedQuizzes.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <Icon name="sort" className="text-base text-[#5A6663]" />
            <label htmlFor="assign-sort" className="text-sm font-semibold text-[#5A6663] whitespace-nowrap">
              題組排序
            </label>
            <select
              id="assign-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-[#C8D6C9] rounded-lg pl-2 pr-7 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer"
            >
              <option value="default">預設順序</option>
              <option value="title-asc">名稱 A→Z</option>
              <option value="title-desc">名稱 Z→A</option>
              <option value="assigned-desc">已派班數 多→少</option>
              <option value="assigned-asc">已派班數 少→多</option>
              <option value="newest">建立時間：新→舊</option>
              <option value="oldest">建立時間：舊→新</option>
            </select>
          </div>
        )}

        {/* ── 矩陣視圖 ── */}
        {publishedQuizzes.length === 0 ? (
          <EmptyState onGoToQuizzes={() => navigate('/teacher/quizzes')} />
        ) : (
          <MatrixView
            quizzes={publishedQuizzes}
            classes={classes}
            assignments={assignments}
            popover={popover}
            managePopover={managePopover}
            onOpenAssign={handleOpenAssign}
            onOpenManage={handleOpenManage}
            onAssignConfirm={handleConfirmDiagnosis}
            onAssignClose={() => setPopover(null)}
            onManageClose={() => setManagePopover(null)}
            onUpdateDueDate={handleUpdateDueDate}
            onRemove={handleRemove}
            onViewReport={handleViewReport}
          />
        )}
      </div>
    </TeacherLayout>
  );
}

// ─── 空狀態 ─────────────────────────────────────────────────────────────────
function EmptyState({ onGoToQuizzes }) {
  return (
    <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="w-14 h-14 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon name="description" className="text-3xl text-[#95A5A6]" />
      </div>
      <p className="text-[#636E72] font-medium mb-1">目前沒有已發佈的題組</p>
      <p className="text-sm text-[#95A5A6] mb-5">請先建立題組，再回來進行派發</p>
      <button
        onClick={onGoToQuizzes}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl text-sm font-semibold hover:bg-[#76B563] transition-colors"
      >
        前往出題管理
        <Icon name="arrow_forward" className="text-base" />
      </button>
    </div>
  );
}
