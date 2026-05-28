import { Icon } from '../../../components/ui/woodKit';
import {
  AssignPopover,
  ManagePopover,
} from '../AssignmentMatrixParts';
import {
  getAssignmentProgress,
  getClassSummary,
  getProgressBarColor,
} from './assignmentStats';

/**
 * 班級視角：每個班級一張卡片
 * - 卡 Header：班級色 + 班名 + 人數 + summary（已派幾份題組 / 進行中 / 已完成）
 * - 卡 Body：已派題組進度列表 + 尚未派題組 pill 群（點 pill 派發）
 *
 * spec-02 §2.6 / spec-07 既有色票
 */
export default function ClassCardView({
  classes,
  quizzes,
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
      {classes.map((cls) => (
        <ClassCard
          key={cls.id}
          cls={cls}
          quizzes={quizzes}
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

function ClassCard({
  cls,
  quizzes,
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
  const summary = getClassSummary(cls, quizzes, assignments);

  return (
    <div
      className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
      data-tour="assign-class-card"
    >
      {/* ── 卡片 Header ── */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#D4ECF1] to-white border-b border-[#D5D8DC]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: cls.color }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#2D3436] leading-snug">{cls.name}</h3>
              <p className="text-sm text-[#636E72] mt-0.5">{cls.studentCount} 人</p>
            </div>
          </div>
          <ClassSummaryStats summary={summary} totalQuizzes={quizzes.length} />
        </div>
      </div>

      {/* ── 已派題組列表 ── */}
      <div className="px-5 py-4">
        {summary.assignedQuizzes.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[#95A5A6] mb-3">
            <Icon name="info" className="text-base" />
            <span>這個班級還沒有派發任何題組</span>
          </div>
        ) : (
          <>
            <h4 className="text-sm font-semibold text-[#5A6663] mb-2">
              已派題組（{summary.assignedQuizzes.length}）
            </h4>
            <ul className="space-y-2 mb-4">
              {summary.assignedQuizzes.map((quiz) => {
                const assignment = summary.assignments.find((a) => a.quizId === quiz.id);
                if (!assignment) return null;
                const isManagingThis = managePopover?.assignmentId === assignment.id;
                return (
                  <li key={quiz.id} className="relative">
                    <AssignmentProgressRow
                      quiz={quiz}
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

        {/* ── 尚未派題組 pill 群 ── */}
        {summary.unassignedQuizzes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#5A6663] mb-2 flex items-center gap-1.5">
              <Icon name="add_circle" className="text-base text-[#1F7A8C]" />
              派發其他題組（{summary.unassignedQuizzes.length}）
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.unassignedQuizzes.map((quiz) => {
                const isAssigningThis =
                  popover?.quizId === quiz.id && popover?.classId === cls.id;
                return (
                  <div key={quiz.id} className="relative">
                    <UnassignedQuizPill
                      quiz={quiz}
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

function ClassSummaryStats({ summary, totalQuizzes }) {
  return (
    <div className="flex items-center gap-4 flex-shrink-0">
      <SummaryItem
        label="已派"
        value={`${summary.assignedQuizzes.length}/${totalQuizzes}`}
        sub="份題組"
      />
      <div className="w-px h-10 bg-[#D5D8DC]" aria-hidden="true" />
      <SummaryItem label="進行中" value={summary.inProgressCount} sub="筆" color="#B7950B" />
      <SummaryItem label="已完成" value={summary.doneCount} sub="筆" color="#3D5A3E" />
    </div>
  );
}

function SummaryItem({ label, value, sub, color = '#2D3436' }) {
  return (
    <div className="text-right leading-tight">
      <div className="text-xs text-[#95A5A6]">{label}</div>
      <div className="text-base font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[#95A5A6]">{sub}</div>
    </div>
  );
}

function AssignmentProgressRow({ quiz, cls, assignment, onClickManage }) {
  const p = getAssignmentProgress(assignment, cls);
  const barColor = getProgressBarColor(p.status);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7E8] bg-white hover:bg-[#FAFBFA] transition-colors">
      {/* 題組標題 */}
      <div className="w-48 flex-shrink-0 min-w-0">
        <p className="text-sm font-semibold text-[#2D3436] truncate">{quiz.title}</p>
        <p className="text-xs text-[#95A5A6]">
          {quiz.questionCount} 題 · {quiz.knowledgeNodeIds?.length ?? 0} 節點
        </p>
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
        aria-label={`管理${quiz.title}的派發`}
      >
        <Icon name="more_vert" className="text-lg" />
      </button>
    </div>
  );
}

function UnassignedQuizPill({ quiz, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-[#BDC3C7] bg-white text-[#0E3E47] text-sm font-semibold hover:border-[#1F7A8C] hover:bg-[#D4ECF1] transition-colors max-w-full"
    >
      <Icon name="edit_note" className="text-base text-[#5C8A2E] flex-shrink-0" />
      <span className="truncate">{quiz.title}</span>
      <Icon name="add" className="text-base text-[#1F7A8C] flex-shrink-0" />
    </button>
  );
}
