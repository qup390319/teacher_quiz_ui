/**
 * 班級分類視圖用的小卡片。
 *
 * - 大小介於 ClassListRow 與 ClassCardItem 之間，grid 排列
 * - 可拖曳（dnd-kit）跨分類移動
 * - 整張可點 → 進詳情；拖曳手把（左側色條 + 卡片本身）由 dnd-kit listeners 接管
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ClassMiniCard({ cls, isArchived, onOpen }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: cls.id, data: { type: 'class', classId: cls.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e) => {
    // 拖曳結束的 pointerup 也會觸發 click — 用 dataset 標記避免誤觸
    if (e.defaultPrevented) return;
    onOpen?.();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); } }}
      className={`relative bg-white rounded-2xl border border-[#E1E6E2] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-[#C8D6C9] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] transition-all cursor-grab active:cursor-grabbing ${isArchived ? 'opacity-60 grayscale' : ''}`}
      title="拖曳卡片可移動到其他分類；點擊進入詳情"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cls.color }} />

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-bold text-[#2D3436] truncate">{cls.name}</h3>
          {isArchived && (
            <span className="text-[10px] font-semibold text-[#7A5A2A] bg-[#FFE0A3] border border-[#D5A45D] rounded-full px-1.5 py-0.5">
              已封存
            </span>
          )}
        </div>
        <p className="text-xs text-[#95A5A6]">
          {cls.studentCount} 位學生 · {cls.schoolYear - 1911} 學年{cls.semester === 'first' ? '上' : '下'}
        </p>
      </div>
    </div>
  );
}
