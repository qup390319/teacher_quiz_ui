/**
 * 班級管理頁的「卡片」單張（Google Classroom 風）。
 *
 * 設計：與 ClassListRow 同一套精簡語言，差別只在版面（卡片 vs 列）。
 * - 整張可點 → 進班級詳情頁
 * - 顯示：色塊（左側細條）+ 班名（大）+ 副標（學生數 · 學年）
 * - 不放任何 inline 操作按鈕；編輯/封存/刪除統一在詳情頁
 */

export default function ClassCardItem({ cls, onOpen, isArchived }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`relative bg-white rounded-3xl border border-[#E1E6E2] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-[#C8D6C9] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] transition-all cursor-pointer ${isArchived ? 'opacity-60 grayscale' : ''}`}
      title="點擊進入班級詳情"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cls.color }} />

      <div className="pl-5 pr-4 py-5">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-xl font-bold text-[#2D3436] truncate">{cls.name}</h3>
          {isArchived && (
            <span className="text-xs font-semibold text-[#7A5A2A] bg-[#FFE0A3] border border-[#D5A45D] rounded-full px-2 py-0.5">
              已封存
            </span>
          )}
        </div>
        <p className="text-sm text-[#95A5A6]">
          {cls.studentCount} 位學生 · {cls.schoolYear - 1911} 學年{cls.semester === 'first' ? '上' : '下'}
        </p>
      </div>
    </div>
  );
}
