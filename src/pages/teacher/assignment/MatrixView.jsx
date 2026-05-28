import { Icon } from '../../../components/ui/woodKit';
import { AssignPopover, ManagePopover } from '../AssignmentMatrixParts';
import { getAssignmentProgress, getProgressBarColor } from './assignmentStats';

/**
 * 派題管理矩陣視圖
 * 行 = 已發布題組（左側 sticky 欄）
 * 列 = 班級（頂部 sticky 列）
 * 格 = 派發狀態 chip（空格 = 未派，點擊 → 派發/管理 popover）
 */
export default function MatrixView({
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
  if (quizzes.length === 0 || classes.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {/* 左上角標籤 */}
              <th
                scope="col"
                className="sticky left-0 z-20 bg-[#F4F7F3] px-4 py-3 border-b-2 border-r-2 border-[#D5D8DC] text-left min-w-[220px]"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#95A5A6]">
                  <Icon name="edit_note" className="text-sm" />
                  <span>題組</span>
                  <span className="mx-1 text-[#D5D8DC]">/</span>
                  <Icon name="group" className="text-sm" />
                  <span>班級</span>
                </div>
              </th>
              {classes.map((cls) => (
                <th
                  key={cls.id}
                  scope="col"
                  className="px-2 py-3 border-b-2 border-r border-[#D5D8DC] text-center min-w-[130px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: cls.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-[#2D3436] whitespace-nowrap">{cls.name}</span>
                    <span className="text-xs text-[#95A5A6]">{cls.studentCount} 人</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz, idx) => (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                classes={classes}
                assignments={assignments}
                isEven={idx % 2 === 0}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuizRow({
  quiz, classes, assignments, isEven,
  popover, managePopover,
  onOpenAssign, onOpenManage, onAssignConfirm, onAssignClose,
  onManageClose, onUpdateDueDate, onRemove, onViewReport,
}) {
  const rowBg = isEven ? 'bg-white' : 'bg-[#FAFBFA]';
  return (
    <tr className={`${rowBg} hover:bg-[#F4F7F3] transition-colors group`}>
      {/* 題組標籤（sticky 左側） */}
      <td
        className={`sticky left-0 z-10 ${rowBg} group-hover:bg-[#F4F7F3] transition-colors px-4 py-3 border-b border-r-2 border-[#D5D8DC]`}
      >
        <div className="max-w-[210px]">
          <p className="text-sm font-semibold text-[#2D3436] leading-snug line-clamp-2 mb-0.5">
            {quiz.title}
          </p>
          <p className="text-xs text-[#95A5A6]">
            {quiz.questionCount} 題 · {quiz.knowledgeNodeIds?.length ?? 0} 節點
          </p>
        </div>
      </td>
      {/* 格子 */}
      {classes.map((cls) => {
        const assignment = assignments.find(
          (a) =>
            (a.type ?? 'diagnosis') === 'diagnosis' &&
            a.quizId === quiz.id &&
            a.classId === cls.id,
        );
        const isAssigning = popover?.quizId === quiz.id && popover?.classId === cls.id;
        const isManaging = Boolean(assignment) && managePopover?.assignmentId === assignment?.id;
        return (
          <td key={cls.id} className="px-2 py-2 border-b border-r border-[#E5E7E8] align-middle">
            <div className="relative">
              {assignment ? (
                <AssignedCell
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
              ) : (
                <UnassignedCell
                  onClick={(e) =>
                    onOpenAssign({
                      quizId: quiz.id,
                      classId: cls.id,
                      anchor: e.currentTarget,
                    })
                  }
                />
              )}
              {isAssigning && (
                <AssignPopover
                  quiz={quiz}
                  cls={cls}
                  onConfirm={(dueDate, mode) => onAssignConfirm(quiz.id, cls.id, dueDate, mode)}
                  onClose={onAssignClose}
                />
              )}
              {isManaging && (
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
            </div>
          </td>
        );
      })}
    </tr>
  );
}

const STATUS_CFG = {
  done: {
    bg: 'bg-[#E8F5E0]',
    border: 'border-[#8FC87A]',
    text: 'text-[#3D5A3E]',
    label: '完成',
  },
  inProgress: {
    bg: 'bg-[#FEF9E7]',
    border: 'border-[#F5D669]',
    text: 'text-[#8B6914]',
    label: '進行中',
  },
  waiting: {
    bg: 'bg-[#F4F5F5]',
    border: 'border-[#D5D8DC]',
    text: 'text-[#636E72]',
    label: '待作答',
  },
};

function AssignedCell({ cls, assignment, onClickManage }) {
  const p = getAssignmentProgress(assignment, cls);
  const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.waiting;
  const barColor = getProgressBarColor(p.status);
  const dueShort = assignment.dueDate ? assignment.dueDate.slice(5).replace('-', '/') : '—';

  return (
    <button
      type="button"
      onClick={onClickManage}
      className={`w-full rounded-xl border-2 ${cfg.bg} ${cfg.border} px-2.5 py-2 text-left transition-all hover:brightness-95 hover:shadow-sm`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold leading-none ${cfg.text}`}>{cfg.label}</span>
        <span className={`text-xs font-bold leading-none ${cfg.text}`}>{p.percent}%</span>
      </div>
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${p.percent}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#95A5A6] leading-none">{p.completed}/{p.total} 人</span>
        <span className="text-[10px] text-[#95A5A6] leading-none">{dueShort}</span>
      </div>
    </button>
  );
}

function UnassignedCell({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[68px] rounded-xl border-2 border-dashed border-[#D5D8DC] bg-transparent flex flex-col items-center justify-center gap-1 text-[#BDC3C7] hover:border-[#5C8A2E] hover:text-[#5C8A2E] hover:bg-[#EEF5E6] transition-all"
    >
      <Icon name="add_circle" className="text-xl" />
      <span className="text-xs font-semibold">派發</span>
    </button>
  );
}
