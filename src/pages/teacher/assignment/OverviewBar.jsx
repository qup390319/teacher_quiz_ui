import { Icon } from '../../../components/ui/woodKit';

/**
 * 派題管理全頁概覽列（spec-02 §2.6）
 * 顯示題組總數 / 班級數 / 派發紀錄分布
 */
export default function OverviewBar({ summary }) {
  const items = [
    { icon: 'edit_note', color: '#5C8A2E', label: '題組總數', value: summary.totalQuizzes,    unit: '份' },
    { icon: 'group',     color: '#1F7A8C', label: '班級數',   value: summary.totalClasses,    unit: '班' },
    { icon: 'pending',   color: '#B7950B', label: '進行中',   value: summary.inProgressCount, unit: '筆' },
    { icon: 'task_alt',  color: '#3D5A3E', label: '已完成',   value: summary.doneCount,       unit: '筆' },
  ];

  return (
    <div className="bg-white border border-[#BDC3C7] rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {items.map((item, idx) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span style={{ color: item.color }} className="flex-shrink-0">
              <Icon name={item.icon} className="text-xl" />
            </span>
            <div className="leading-tight">
              <div className="text-xs text-[#95A5A6]">{item.label}</div>
              <div className="text-base font-bold text-[#2D3436]">
                <span style={{ color: item.color }}>{item.value}</span>
                <span className="text-xs font-medium text-[#95A5A6] ml-0.5">{item.unit}</span>
              </div>
            </div>
            {idx < items.length - 1 && (
              <div className="hidden sm:block w-px h-8 bg-[#E5E7E8] ml-3" aria-hidden="true" />
            )}
          </div>
        ))}
        {summary.totalAssignments > 0 && (
          <div className="ml-auto text-xs text-[#95A5A6]">
            共 <span className="font-semibold text-[#2D3436]">{summary.totalAssignments}</span> 筆派發紀錄
          </div>
        )}
      </div>
    </div>
  );
}
