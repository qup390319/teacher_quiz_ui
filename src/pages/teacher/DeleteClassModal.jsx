import { useState } from 'react';

/**
 * 班級刪除確認 Modal（兩步驟：警告 → 輸入班名確認）。
 * 從 ClassManagement.jsx 抽出，避免單檔超過 500 行限制（CLAUDE.md）。
 */
export default function DeleteClassModal({ cls, assignmentCount, onConfirm, onClose, isPending }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');

  const canConfirm = confirmText.trim() === cls.name.trim();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
        <div className="p-6 border-b border-[#ECEFF1]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#FAC8CC] border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#E74C5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2D3436]">刪除班級</h2>
              <p className="text-sm text-[#636E72] mt-0.5">此操作無法復原</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <>
              <div className="bg-[#FDF2F2] border border-[#FAC8CC] rounded-xl p-4 mb-4">
                <p className="text-sm text-[#2D3436] font-medium mb-2">
                  即將刪除「<span className="font-bold">{cls.name}</span>」，包含：
                </p>
                <ul className="text-sm text-[#636E72] space-y-1 ml-4 list-disc">
                  <li>{cls.studentCount} 位學生帳號</li>
                  <li>{assignmentCount} 筆派題記錄</li>
                </ul>
              </div>
              <p className="text-sm text-[#95A5A6] mb-5">
                所有學生帳號、作答記錄與派題都會被永久刪除。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 text-sm font-semibold bg-[#FAC8CC] text-[#E74C5E] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors"
                >
                  繼續刪除
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[#2D3436] mb-3">
                請輸入班級名稱「<span className="font-bold">{cls.name}</span>」以確認刪除：
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={cls.name}
                className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#E74C5E] mb-5"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) onConfirm(); }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setConfirmText(''); }}
                  className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!canConfirm || isPending}
                  className="flex-1 py-2.5 text-sm font-semibold bg-[#E74C5E] text-white border border-[#BDC3C7] rounded-xl hover:bg-[#D63C4E] disabled:opacity-40 transition-colors"
                >
                  {isPending ? '刪除中…' : '確認刪除'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
