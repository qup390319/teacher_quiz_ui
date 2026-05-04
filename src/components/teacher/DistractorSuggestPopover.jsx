import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';

/**
 * 干擾選項建議彈窗（spec-12 §7.4 / workflow.md N6）
 *
 * 教師在出題精靈步驟二編輯選項時，按「✨ 建議」開啟。
 * 後端會呼叫 RAGFlow agent 從文獻檢索 3 條真實學生說法。
 *
 * Props:
 *   nodeId, nodeName              ─ 當前題目對應的知識節點
 *   misconceptionId, misconceptionLabel, misconceptionDetail
 *                                ─ 該選項要對應的迷思（從 knowledgeGraph 取出）
 *   currentText                  ─ 教師目前已輸入的選項文字（可空）
 *   onAdopt(text)                ─ 教師點「採用」時呼叫，將文字填回選項
 *   onClose()                    ─ 關閉
 */
export default function DistractorSuggestPopover({
  nodeId, nodeName,
  misconceptionId, misconceptionLabel, misconceptionDetail,
  currentText = '',
  onAdopt, onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [citations, setCitations] = useState([]);
  const sessionIdRef = useRef(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/ai/distractor-suggest', {
        nodeId,
        nodeName,
        misconceptionId,
        misconceptionLabel,
        misconceptionDetail,
        currentText,
        ragflowSessionId: sessionIdRef.current,
      });
      sessionIdRef.current = data.ragflowSessionId ?? sessionIdRef.current;
      setSuggestions(data.suggestions || []);
      setCitations(data.citations || []);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'RAGFLOW_UNAVAILABLE') {
          setError('文獻檢索服務暫時無法回應，請稍後再試或手動輸入。');
        } else if (err.code === 'RAGFLOW_EMPTY') {
          setError('文獻中沒有對應的學生說法，請手動輸入。');
        } else if (err.status === 403) {
          setError('此功能僅限教師使用。');
        } else {
          setError(`請求失敗：${err.message}`);
        }
      } else {
        setError('連線錯誤，請稍後再試。');
      }
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // 初次開啟自動拉一次
  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misconceptionId]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-[#BDC3C7] rounded-[24px] sm:rounded-[28px] shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#FBE9C7] to-[#FCF0C2] border-b border-[#D9C58E] px-4 sm:px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[#5A3E22] truncate">
              干擾選項建議 · {misconceptionId}
            </h3>
            <p className="text-xs text-[#7A5232] truncate">
              依文獻檢索的真實學生說法（{misconceptionLabel}）
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A5232] hover:text-[#5A3E22] flex-shrink-0"
            aria-label="關閉"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {loading && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-[#636E72]">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                正在檢索文獻…
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="py-4">
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
                {error}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6]"
                >
                  關閉
                </button>
                <button
                  onClick={fetchSuggestions}
                  className="px-4 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563]"
                >
                  重試
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <p className="text-xs text-[#95A5A6] mb-3">
                點任一條「採用」可填入選項；不喜歡可按「再來 3 條」。
              </p>
              <ul className="space-y-2 mb-4">
                {suggestions.map((text, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 p-3 bg-[#FBE9C7]/30 border border-[#D9C58E] rounded-xl"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FBE9C7] border border-[#D9C58E] text-[#7A5232] text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-sm text-[#2D3436] leading-relaxed">{text}</p>
                    <button
                      onClick={() => onAdopt(text)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#8FC87A] rounded-lg hover:bg-[#8FC87A]"
                    >
                      採用
                    </button>
                  </li>
                ))}
              </ul>

              {citations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-[#636E72] mb-1.5">參考文獻</p>
                  <ul className="space-y-1">
                    {citations.slice(0, 5).map((c, i) => (
                      <li key={i} className="text-xs text-[#7A5232] leading-snug">
                        <span className="font-semibold">{c.documentName}</span>
                        {c.snippet && (
                          <span className="text-[#95A5A6] ml-2">— {c.snippet}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-[#D5D8DC]">
                <button
                  onClick={fetchSuggestions}
                  className="px-4 py-2 text-sm text-[#7A5232] border border-[#D9C58E] bg-[#FBE9C7] rounded-xl hover:bg-[#F4DDA8]"
                >
                  再來 3 條
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6]"
                >
                  關閉
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
