/**
 * 管理員後台共用確認 Modal（spec-14 風格）。
 * 用於停用 / 啟用 / 重設密碼 等需要二次確認的操作。
 */
export default function AdminConfirmModal({
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = '取消',
  variant = 'primary', // 'primary' | 'danger'
  isPending = false,
  onConfirm,
  onClose,
}) {
  const confirmCls = variant === 'danger'
    ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
    : 'bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-lg p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#1F2937] mb-2">{title}</h3>
        <div className="text-sm text-[#4B5563] mb-6 leading-relaxed whitespace-pre-line">
          {message}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6]
                       text-[#1F2937] font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors ${confirmCls}
                       disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isPending ? '處理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
