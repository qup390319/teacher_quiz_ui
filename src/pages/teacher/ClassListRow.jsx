/**
 * 班級管理頁的「列表」單列（Google Classroom 風）。
 *
 * 設計：
 * - 整列可點 → 進班級詳情頁
 * - 只顯示：色塊 + 班名 + 副標一行（學生數 · 學年）
 * - 不放任何 inline 操作按鈕；編輯/封存/刪除統一在詳情頁
 */

export default function ClassListRow({ cls, onOpen, isArchived }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#F7FAF5] focus:bg-[#F7FAF5] focus:outline-none transition-colors ${isArchived ? 'opacity-60 grayscale' : ''}`}
      title="點擊進入班級詳情"
    >
      {/* 色塊 */}
      <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />

      {/* 內容區 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-[#2D3436] truncate">{cls.name}</span>
          {isArchived && (
            <span className="text-xs font-semibold text-[#7A5A2A] bg-[#FFE0A3] border border-[#D5A45D] rounded-full px-2 py-0.5">
              已封存
            </span>
          )}
        </div>
        <p className="text-xs text-[#95A5A6] mt-0.5">
          {cls.studentCount} 位學生 · {cls.schoolYear - 1911} 學年{cls.semester === 'first' ? '上' : '下'}
        </p>
      </div>

      {/* 右側 chevron 暗示可進入 */}
      <svg className="w-4 h-4 text-[#BDC3C7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
