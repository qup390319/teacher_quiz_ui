/**
 * 班級分類視圖的「分類區段」。
 *
 * - header：分類名 + 班級數 + 改名 / 刪除（未分類區段不可改名/刪除）
 * - body：可放置（droppable）區，內含小卡片 grid
 */

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import ClassMiniCard from './ClassMiniCard';

export default function ClassCategorySection({
  category, // { id, name } or { id: null, name } for 未分類
  classes,
  onOpenClass,
  onRename,
  onDelete,
}) {
  const isUncategorized = category.id == null;
  const droppableId = category.id ?? '__uncategorized__';
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'category', categoryId: category.id },
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const submitRename = () => {
    const next = draft.trim();
    if (next && next !== category.name) {
      onRename?.(category.id, next);
    } else {
      setDraft(category.name);
    }
    setEditing(false);
  };

  return (
    <section className="bg-white rounded-2xl border border-[#E1E6E2] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#F7FAF5] border-b border-[#EEF1ED]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isUncategorized && (
            <span className="material-symbols-rounded text-[#95A5A6] text-base">inbox</span>
          )}
          {editing && !isUncategorized ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') { setDraft(category.name); setEditing(false); }
              }}
              className="text-sm font-semibold text-[#2D3436] bg-white border border-[#BDC3C7] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#8FC87A] min-w-0 flex-1"
            />
          ) : (
            <h2 className="text-sm font-semibold text-[#2D3436] truncate">
              {category.name}
              {confirmingDelete && (
                <span className="ml-2 text-xs font-normal text-[#E74C5E]">
                  確定要刪除？此分類下的 {classes.length} 個班級會回到「未分類」
                </span>
              )}
            </h2>
          )}
          {!confirmingDelete && (
            <span className="text-xs text-[#95A5A6] flex-shrink-0">{classes.length} 班</span>
          )}
        </div>

        {!isUncategorized && !editing && !confirmingDelete && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => { setDraft(category.name); setEditing(true); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#636E72] hover:bg-white hover:text-[#3D5A3E] transition-colors"
              title="重新命名分類"
            >
              <span className="material-symbols-rounded text-base">edit</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#E74C5E] hover:bg-[#FAC8CC] transition-colors"
              title="刪除分類"
            >
              <span className="material-symbols-rounded text-base">delete</span>
            </button>
          </div>
        )}

        {confirmingDelete && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onDelete?.(category.id);
                setConfirmingDelete(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E74C5E] text-white hover:bg-[#D63A4D] transition-colors"
            >
              確定刪除
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#BDC3C7] text-[#636E72] hover:bg-white transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* Droppable grid */}
      <div
        ref={setNodeRef}
        className={`p-3 transition-colors ${isOver ? 'bg-[#EEF5E6]' : 'bg-white'}`}
      >
        {classes.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[#95A5A6] border-2 border-dashed border-[#E1E6E2] rounded-xl">
            拖曳班級卡片到這裡
          </div>
        ) : (
          <SortableContext items={classes.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {classes.map((cls) => (
                <ClassMiniCard
                  key={cls.id}
                  cls={cls}
                  isArchived={cls.status === 'archived'}
                  onOpen={() => onOpenClass?.(cls)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  );
}
