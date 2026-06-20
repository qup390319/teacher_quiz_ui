/**
 * 發布前整卷檢查未通過時的提示 modal。
 * problems：[{ no, errors: string[] }]，no 為第幾題（1-based）。
 */
export default function PublishValidationModal({ problems = [], onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-md">
        <div className="px-6 py-5 border-b border-[#D5D8DC]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#FCF0C2] border border-[#F5D669] rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-[#B7950B]">checklist</span>
            </div>
            <div>
              <h3 className="font-bold text-[#2D3436]">還有 {problems.length} 題尚未完成</h3>
              <p className="text-sm text-[#636E72] mt-0.5">請修正以下項目後再發布</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-2">
          {problems.map((p) => (
            <div key={p.no} className="rounded-xl bg-[#FDECEC] border border-[#F5B8BA] px-3 py-2">
              <p className="text-sm font-bold text-[#C0392B] mb-0.5">第 {p.no} 題</p>
              <ul className="text-xs text-[#C0392B] list-disc list-inside space-y-0.5">
                {p.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-[#D5D8DC] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors"
          >
            知道了，回去修正
          </button>
        </div>
      </div>
    </div>
  );
}
