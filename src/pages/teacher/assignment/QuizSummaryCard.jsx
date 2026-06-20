import { Icon } from '../../../components/ui/woodKit';
import { getQuizCardStats } from './assignmentStats';

/**
 * 題組摘要卡（派題管理新版主清單）。
 * 不逐班列出——只顯示派發摘要與堆疊進度條，因應班級數量很多。
 * 逐班派發/管理交給右側抽屜（AssignmentDrawer）。
 */
export default function QuizSummaryCard({ quiz, classes, assignments, onManage }) {
  const s = getQuizCardStats(quiz, classes, assignments);
  const isTwoTier = quiz.mode === 'two-tier';
  const pctOf = (n) => (s.total > 0 ? (n / s.total) * 100 : 0);

  // 堆疊段：完成（綠）→ 作答中（黃）→ 待作答（淺）；未派為空白軌道
  const segs = [
    { n: s.done, color: '#5C8A2E' },
    { n: s.inProgress, color: '#E6B800' },
    { n: s.waiting, color: '#C8D6C9' },
  ];

  return (
    <div className="bg-white border border-[#BDC3C7] rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-bold text-[#2D3436] leading-snug">{quiz.title}</h3>
            {isTwoTier && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E4E73] bg-[#BFE0F5] border border-[#8FB8DE] px-2 py-0.5 rounded-full flex-shrink-0">
                <Icon name="stacked_bar_chart" className="text-sm" />雙層次
              </span>
            )}
          </div>
          <p className="text-xs text-[#95A5A6] mt-0.5">
            {quiz.questionCount} 題 · {quiz.knowledgeNodeIds?.length ?? 0} 節點
          </p>
        </div>
        <button
          type="button"
          onClick={() => onManage(quiz.id)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] rounded-xl hover:bg-[#8FC87A] transition-colors"
        >
          <Icon name="tune" className="text-base" />
          管理派發
        </button>
      </div>

      {/* 堆疊進度條 + 已派 X/Y 班 */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden flex bg-[#EEF1EF]">
          {segs.map((seg, i) => seg.n > 0 && (
            <div key={i} style={{ width: `${pctOf(seg.n)}%`, backgroundColor: seg.color }} />
          ))}
        </div>
        <span className="text-xs text-[#636E72] whitespace-nowrap">
          已派 {s.assignedCount}/{s.total} 班 · 平均 {s.avgPercent}%
        </span>
      </div>

      {/* 小計 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
        <span className="text-[#95A5A6]"><span className="inline-block w-2 h-2 rounded-full bg-[#D5D8DC] mr-1 align-middle" />未派 {s.unassignedCount}</span>
        <span className="text-[#7A8A6E]"><span className="inline-block w-2 h-2 rounded-full bg-[#C8D6C9] mr-1 align-middle" />待作答 {s.waiting}</span>
        <span className="text-[#B7950B]"><span className="inline-block w-2 h-2 rounded-full bg-[#E6B800] mr-1 align-middle" />作答中 {s.inProgress}</span>
        <span className="text-[#3D5A3E]"><span className="inline-block w-2 h-2 rounded-full bg-[#5C8A2E] mr-1 align-middle" />完成 {s.done}</span>
      </div>
    </div>
  );
}
