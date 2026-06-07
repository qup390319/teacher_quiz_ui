/* 學生端「中途離開確認」對話框（spec-07 木框風 / spec-03）。
 * 測驗進行中按返回時跳出，提醒離開會丟失作答與對話。 */

export default function LeaveConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/40 animate-fade-up"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                   border-[3px] border-[#8B5E3C] rounded-[28px] p-5 sm:p-6
                   shadow-[0_8px_0_-1px_#5A3E22,0_16px_28px_-6px_rgba(91,66,38,0.5)]"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-12 h-12 rounded-full bg-[#FCE5E7] border-2 border-[#F5B8BA]
                           flex items-center justify-center">
            <span className="material-symbols-rounded text-2xl text-[#C0392B]">warning</span>
          </span>
          <h2 id="leave-confirm-title" className="font-game text-lg font-black text-[#5A3E22]">
            確定要離開嗎？
          </h2>
          <p className="text-sm text-[#7A5232] font-bold leading-relaxed">
            現在離開的話，前面的作答和對話都會不見，這次測驗會變成「未完成」喔。確定要離開嗎？
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border-[3px] border-[#5C8A2E] font-game font-black text-sm sm:text-base
                       bg-gradient-to-b from-[#B8DC83] to-[#7DB044] text-[#2F4A1A]
                       shadow-[0_4px_0_#5C8A2E] hover:translate-y-0.5 hover:shadow-[0_2px_0_#5C8A2E]
                       transition-all duration-150"
          >
            繼續作答
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl border-[3px] border-[#B23241] font-game font-black text-sm sm:text-base
                       bg-gradient-to-b from-[#EC6B79] to-[#E74C5E] text-white
                       shadow-[0_4px_0_#B23241] hover:translate-y-0.5 hover:shadow-[0_2px_0_#B23241]
                       transition-all duration-150"
          >
            確定離開
          </button>
        </div>
      </div>
    </div>
  );
}
