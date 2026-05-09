import { useState } from 'react';
import { knowledgeNodes } from '../../data/knowledgeGraph';

/**
 * 新增自訂迷思 Modal
 * spec-04 §2.6：教師可在系統預設迷思之外，新增自己班級觀察到的迷思。
 * 此 Modal 只負責收集表單；送出後上層用 useCreateCustomMisconception 寫入後端。
 */
export default function AddCustomMisconceptionModal({
  initialNodeId = '',
  onSubmit,
  onClose,
  isPending,
}) {
  const [nodeId, setNodeId] = useState(initialNodeId || knowledgeNodes[0].id);
  const [label, setLabel] = useState('');
  const [detail, setDetail] = useState('');
  const [studentDetail, setStudentDetail] = useState('');
  const [confirmQuestion, setConfirmQuestion] = useState('');

  const valid =
    label.trim() && detail.trim() && studentDetail.trim() && confirmQuestion.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      nodeId,
      label: label.trim(),
      detail: detail.trim(),
      studentDetail: studentDetail.trim(),
      confirmQuestion: confirmQuestion.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#BDC3C7] rounded-[28px] shadow-[0_8px_40px_rgba(0,0,0,0.10)]
                   w-full max-w-xl max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-[#D5D8DC] px-6 py-4 flex items-center justify-between rounded-t-[28px]">
          <div>
            <h3 className="text-base font-bold text-[#2D3436]">新增自訂迷思</h3>
            <p className="text-xs text-[#95A5A6] mt-0.5">
              僅儲存在您的帳戶，其他老師看不到
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#95A5A6] hover:text-[#636E72]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="對應知識節點" required>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            >
              {knowledgeNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}・{n.name}</option>
              ))}
            </select>
          </Field>
          <Field label="迷思短標題" required hint="一句話描述（最多 30 字）">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={30}
              placeholder="例：糖加越多越甜"
              className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            />
          </Field>
          <Field label="詳細描述（教師參考）" required>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              placeholder="例：學生認為糖加得越多甜度就越強，忽略飽和量限制。"
              className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] text-sm leading-6 resize-none
                         focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            />
          </Field>
          <Field label="學生視角描述（治療對話用）" required>
            <textarea
              value={studentDetail}
              onChange={(e) => setStudentDetail(e.target.value)}
              rows={2}
              placeholder="例：也就是說，你可能會覺得糖加得越多，糖水就會越甜。"
              className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] text-sm leading-6 resize-none
                         focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            />
          </Field>
          <Field label="確認題（讓 AI 確認學生是否有此迷思）" required>
            <textarea
              value={confirmQuestion}
              onChange={(e) => setConfirmQuestion(e.target.value)}
              rows={2}
              placeholder="例：你是不是覺得，糖加得越多，糖水就會無限變甜呢？"
              className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] text-sm leading-6 resize-none
                         focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#D5D8DC] px-6 py-4 flex gap-3 justify-end rounded-b-[28px]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#636E72] border border-[#BDC3C7]
                       rounded-xl hover:bg-[#EEF5E6]"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!valid || isPending}
            className="px-5 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7]
                       rounded-xl hover:bg-[#76B563] disabled:opacity-50"
          >
            {isPending ? '新增中…' : '新增'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#2D3436] mb-1.5">
        {label}
        {required && <span className="text-[#E74C5E] ml-0.5">*</span>}
        {hint && <span className="ml-2 text-[#95A5A6] font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
