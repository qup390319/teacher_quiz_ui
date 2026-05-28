import { Icon } from '../../../components/ui/woodKit';
import {
  AssignPopover,
  ManagePopover,
} from '../AssignmentMatrixParts';
import {
  getAssignmentProgress,
  getQuizSummary,
  getProgressBarColor,
} from './assignmentStats';

/**
 * 題組視角：每份題組一張卡片
 * - 卡 Header：題組標題 + meta + summary
 * - 卡 Body：已派班級進度列表 + 尚未派發 pill 群（點 pill 派發）
 *
 * spec-02 §2.6 / spec-07 既有色票
 */
export default function QuizCardView({
  quizzes,
  classes,
  assignments,
  popover,
  managePopover,
  onOpenAssign,
  onOpenManage,
  onAssignConfirm,
  onAssignClose,
  onManageClose,
  onUpdateDueDate,
  onRemove,
  onViewReport,
}) {
  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => (
        <QuizCard
          key={quiz.id}
          quiz={quiz}
          classes={classes}
          assignments={assignments}
          popover={popover}
          managePopover={managePopover}
          onOpenAssign={onOpenAssign}
          onOpenManage={onOpenManage}
          onAssignConfirm={onAssignConfirm}
          onAssignClose={onAssignClose}
          onManageClose={onManageClose}
          onUpdateDueDate={onUpdateDueDate}
          onRemove={onRemove}
          onViewReport={onViewReport}
        />
      ))}
    </div>
  );
}

function QuizCard({
  quiz,
  classes,
  assignments,
  popover,
  managePopover,
  onOpenAssign,
  onOpenManage,
  onAssignConfirm,
  onAssignClose,
  onManageClose,
  onUpdateDueDate,
  onRemove,
  onViewReport,
}) {
  const summary = getQuizSummary(quiz, classes, assignments);

  return (
    <div
      className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
      data-tour="assign-quiz-card"
    >
      {/* ── 卡片 Header ── */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#EEF5E6] to-white border-b border-[#D5D8DC]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C8EAAE] text-[#3D5A3E] border border-[#8FC87A]">
                已發佈
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#2D3436] leading-snug">{quiz.title}</h3>
            <p className="text-sm text-[#636E72] mt-0.5">
              {quiz.questionCount} 題 · {quiz.knowledgeNodeIds.length} 個知識節點
            </p>
          </div>
          <QuizSummaryStats summary={summary} totalClasses={classes.length} />
        </div>
      </div>

      {/* ── 已派發班級列表 ── */}
      <div className="px-5 py-4">
        {summary.assignedClasses.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[#95A5A6] mb-3">
            <Icon name="info" className="text-base" />
            <span>這份題組還沒派給任何班級</span>
          </div>
        ) : (
          <>
            <h4 className="text-sm font-semibold text-[#5A6663] mb-2">
              已派發班級（{summary.assignedClasses.length}）
            </h4>
            <ul className="space-y-2 mb-4">
              {summary.assignedClasses.map((cls) => {
                const assignment = summary.assignments.find((a) => a.classId === cls.id);
                if (!assignment) return null;
                const isManagingThis = managePopover?.assignmentId === assignment.id;
                return (
                  <li key={cls.id} className="relative">
                    <AssignmentProgressRow
                      cls={cls}
                      assignment={assignment}
                      onClickManage={(e) =>
                        onOpenManage({
                          assignmentId: assignment.id,
                          quizId: quiz.id,
                          classId: cls.id,
                          anchor: e.currentTarget,
                        })
                      }
                    />
                    {isManagingThis && (
                      <ManagePopover
                        assignment={assignment}
                        quiz={quiz}
                        cls={cls}
                        onViewReport={onViewReport}
                        onUpdateDueDate={onUpdateDueDate}
                        onRemove={onRemove}
                        onClose={onManageClose}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* ── 尚未派發班級 pill 群 ── */}
        {summary.unassignedClasses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#5A6663] mb-2 flex items-center gap-1.5">
              <Icon name="add_circle" className="text-base text-[#5C8A2E]" />
              派發給其他班級（{summary.unassignedClasses.length}）
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.unassignedClasses.map((cls) => {
                const isAssigningThis =
                  popover?.quizId === quiz.id && popover?.classId === cls.id;
                return (
                  <div key={cls.id} className="relative">
                    <UnassignedClassPill
                      cls={cls}
                      onClick={(e) =>
                        onOpenAssign({
                          quizId: quiz.id,
                          classId: cls.id,
                          anchor: e.currentTarget,
                        })
                      }
                    />
                    {isAssigningThis && (
                      <AssignPopover
                        quiz={quiz}
                        cls={cls}
                        onConfirm={(dueDate, mode) =>
                          onAssignConfirm(quiz.id, cls.id, dueDate, mode)
                        }
                        onClose={onAssignClose}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizSummaryStats({ summary, totalClasses }) {
  return (
    <div className="flex items-center gap-4 flex-shrink-0">
      <SummaryItem
        label="已派"
        value={`${summary.assignedClasses.length}/${totalClasses}`}
        sub="班"
      />
      <div className="w-px h-10 bg-[#D5D8DC]" aria-hidden="true" />
      <SummaryItem
        label="完成率"
        value={`${summary.overallPercent}%`}
        sub={`${summary.totalCompleted}/${summary.totalStudents} 人`}
      />
    </div>
  );
}

function SummaryItem({ label, value, sub }) {
  return (
    <div className="text-right leading-tight">
      <div className="text-xs text-[#95A5A6]">{label}</div>
      <div className="text-base font-bold text-[#2D3436]">{value}</div>
      <div className="text-[11px] text-[#95A5A6]">{sub}</div>
    </div>
  );
}

function AssignmentProgressRow({ cls, assignment, onClickManage }) {
  const p = getAssignmentProgress(assignment, cls);
  const barColor = getProgressBarColor(p.status);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7E8] bg-white hover:bg-[#FAFBFA] transition-colors">
      {/* 班色點 + 班名 */}
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: cls.color }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-[#2D3436] truncate">{cls.name}</span>
      </div>

      {/* 進度條 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: barColor }}>
            {p.percent}%
          </span>
          <span className="text-xs text-[#95A5A6]">
            {p.completed}/{p.total} 人完成
          </span>
        </div>
        <div className="h-1.5 bg-[#EEF1F0] rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${p.percent}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* 截止日 */}
      <div className="text-xs text-[#95A5A6] flex-shrink-0 hidden sm:block">
        截止 {assignment.dueDate ?? '—'}
      </div>

      {/* 管理按鈕 */}
      <button
        type="button"
        onClick={onClickManage}
        className="flex-shrink-0 p-1.5 rounded-lg text-[#5A6663] hover:bg-[#F4F5F5] transition-colors"
        aria-label={`管理${cls.name}的派發`}
      >
        <Icon name="more_vert" className="text-lg" />
      </button>
    </div>
  );
}

function UnassignedClassPill({ cls, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-[#BDC3C7] bg-white text-[#3D5A3E] text-sm font-semibold hover:border-[#5C8A2E] hover:bg-[#EEF5E6] transition-colors"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: cls.color }}
        aria-hidden="true"
      />
      <span>{cls.name}</span>
      <span className="text-xs text-[#95A5A6]">{cls.studentCount}人</span>
      <Icon name="add" className="text-base text-[#5C8A2E]" />
    </button>
  );
}
