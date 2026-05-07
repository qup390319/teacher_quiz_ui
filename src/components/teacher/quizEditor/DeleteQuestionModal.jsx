export default function DeleteQuestionModal({ question, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#FAC8CC] border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#E74C5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#2D3436]">確認刪除題目 #{question.id}？</h3>
            <p className="text-sm text-[#636E72] mt-0.5">此操作無法復原</p>
          </div>
        </div>
        <p className="text-sm text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3 mb-5 leading-relaxed">
          {question.stem}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold bg-[#FAC8CC] text-[#E74C5E] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors">
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}
