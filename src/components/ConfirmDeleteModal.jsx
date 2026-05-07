/**
 * 通用刪除確認 Modal（spec-03）。
 *
 * - title       — 標題（預設「確認刪除？」）
 * - message     — 主訊息（必填）
 * - itemLabel   — 要刪除的對象一行摘要（會以 box 強調）
 * - onConfirm   — 點「確認刪除」時的 callback；async 也可
 * - onClose     — 點取消 / 背景關閉
 * - isPending   — 處理中時禁用按鈕
 */
export default function ConfirmDeleteModal({
  title = '確認刪除？',
  message,
  itemLabel,
  onConfirm,
  onClose,
  isPending = false,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#FAC8CC] border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#E74C5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#2D3436]">{title}</h3>
            <p className="text-sm text-[#636E72] mt-0.5">{message}</p>
          </div>
        </div>
        {itemLabel && (
          <div className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3 mb-5">
            <p className="text-sm text-[#2D3436] break-words">{itemLabel}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-semibold bg-[#FAC8CC] text-[#E74C5E] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors disabled:opacity-50"
          >
            {isPending ? '刪除中…' : '確認刪除'}
          </button>
        </div>
      </div>
    </div>
  );
}
