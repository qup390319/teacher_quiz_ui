import { useState } from 'react';
import { knowledgeNodes, getNodeById } from '../../../data/knowledgeGraph';
import DistractorSuggestPopover from '../DistractorSuggestPopover';

export default function EditQuestionModal({ question, selectedNodeIds, onSave, onClose }) {
  const [stem, setStem] = useState(question.stem);
  const [nodeId, setNodeId] = useState(question.knowledgeNodeId);
  const [options, setOptions] = useState(question.options.map((o) => ({ ...o })));
  const [suggestForIdx, setSuggestForIdx] = useState(null);

  const currentNode = getNodeById(nodeId);
  const availableMisconceptions = currentNode ? currentNode.misconceptions : [];

  const updateOption = (idx, field, value) => {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const suggestTarget = suggestForIdx !== null ? options[suggestForIdx] : null;
  const suggestMisconception = suggestTarget && suggestTarget.diagnosis !== 'CORRECT'
    ? availableMisconceptions.find((m) => m.id === suggestTarget.diagnosis)
    : null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#D5D8DC] px-6 py-4 flex items-center justify-between rounded-t-[32px]">
          <h3 className="text-base font-bold text-[#2D3436]">編輯題目 #{question.id}</h3>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#2D3436] mb-2">題幹內容</label>
            <textarea
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={3}
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2D3436] mb-2">對應知識節點</label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            >
              {knowledgeNodes
                .filter((n) => selectedNodeIds.includes(n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>{n.id} · {n.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2D3436] mb-3">選項內容與答案判定</label>
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={opt.tag} className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#BDC3C7] text-[#636E72] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {opt.tag}
                    </span>
                    <input
                      value={opt.content}
                      onChange={(e) => updateOption(idx, 'content', e.target.value)}
                      className="flex-1 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                    />
                    <button
                      type="button"
                      onClick={() => setSuggestForIdx(idx)}
                      disabled={opt.diagnosis === 'CORRECT'}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold
                                 text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg
                                 hover:bg-[#F4DDA8] disabled:opacity-40 disabled:cursor-not-allowed"
                      title={opt.diagnosis === 'CORRECT' ? '正解選項不需建議' : '從文獻檢索 3 條學生真實說法（N6）'}
                    >
                      <span aria-hidden="true">✨</span>
                      建議
                    </button>
                  </div>
                  <div className="ml-9">
                    <label className="text-xs text-[#95A5A6] mb-1 block">答案判定</label>
                    <select
                      value={opt.diagnosis}
                      onChange={(e) => updateOption(idx, 'diagnosis', e.target.value)}
                      className={`w-full border border-[#BDC3C7] rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8FC87A] ${opt.diagnosis === 'CORRECT'
                          ? 'bg-[#C8EAAE] text-[#3D5A3E]'
                          : 'bg-[#FAC8CC] text-[#E74C5E]'
                        }`}
                    >
                      <option value="CORRECT">✓ 正確答案</option>
                      {availableMisconceptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.id}：{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#D5D8DC] px-6 py-4 flex gap-3 justify-end rounded-b-[32px]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors">
            取消
          </button>
          <button
            onClick={() => onSave({ ...question, stem, knowledgeNodeId: nodeId, options })}
            className="px-5 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors"
          >
            儲存變更
          </button>
        </div>
      </div>

      {suggestForIdx !== null && suggestMisconception && currentNode && (
        <DistractorSuggestPopover
          nodeId={currentNode.id}
          nodeName={currentNode.name}
          misconceptionId={suggestMisconception.id}
          misconceptionLabel={suggestMisconception.label}
          misconceptionDetail={suggestMisconception.detail}
          currentText={suggestTarget.content}
          onAdopt={(text) => {
            updateOption(suggestForIdx, 'content', text);
            setSuggestForIdx(null);
          }}
          onClose={() => setSuggestForIdx(null)}
        />
      )}
      {suggestForIdx !== null && !suggestMisconception && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSuggestForIdx(null)}
        >
          <div
            className="bg-white border border-[#BDC3C7] rounded-2xl p-6 max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[#636E72] mb-4">
              此選項目前對應「正確答案」，無法產生干擾選項建議。
              <br />請先把「答案判定」改為某條迷思後再試。
            </p>
            <button
              onClick={() => setSuggestForIdx(null)}
              className="px-4 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563]"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
