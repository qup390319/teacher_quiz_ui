import { useState } from 'react';
import { ApiError } from '../../lib/api';
import { useGradeSummary, useClassSummary } from '../../hooks/useSummary';

/**
 * 文獻引用版 AI 摘要面板（N1 / N2，spec-12 §8）
 *
 * 用 RAGFlow 從文獻檢索 + 生成班級 / 全年級的學習摘要 + 可採行動 + 引用。
 * 教師按「以文獻檢索 AI 摘要」才會發送 RAGFlow 請求（避免進頁面就燒額度）。
 *
 * Props:
 *   scope: 'grade' | 'class'
 *   payload: 對應 spec-12 §8.2 / §8.3 的 request body（preset 好讓 hook 直接 mutate）
 *   title: 卡片標題（'全年級 AI 診斷摘要' or '本班 AI 診斷摘要'）
 */
export default function RagflowSummaryPanel({ scope, payload, title }) {
  const gradeMut = useGradeSummary();
  const classMut = useClassSummary();
  const mut = scope === 'grade' ? gradeMut : classMut;
  const [showResult, setShowResult] = useState(false);

  const fetchSummary = async () => {
    setShowResult(true);
    try {
      await mut.mutateAsync(payload);
    } catch (err) {
      // shown via mut.error
      console.error('[RagflowSummaryPanel]', err);
    }
  };

  const data = mut.data;
  const error = mut.error;
  const errorMsg = error
    ? error instanceof ApiError && error.code === 'RAGFLOW_UNAVAILABLE'
      ? '文獻檢索服務暫時無法回應，請稍後再試。'
      : error instanceof ApiError && error.code === 'RAGFLOW_EMPTY'
        ? '文獻無法生成摘要，請更換考卷或稍後再試。'
        : `請求失敗：${error.message ?? '未知錯誤'}`
    : '';

  return (
    <div className="bg-gradient-to-br from-[#FFFCF3] to-[#FBE9C7] border-2 border-[#D9C58E] rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📚</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#5A3E22]">{title}</h3>
          <p className="text-xs text-[#7A5232]">
            由 RAGFlow 從水溶液迷思概念研究文獻檢索並生成（spec-12 §8）
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={mut.isPending}
          className="px-3 py-1.5 text-xs font-semibold text-[#7A5232] bg-white border border-[#D9C58E] rounded-lg hover:bg-[#FFF8E7] disabled:opacity-50"
        >
          {mut.isPending ? '檢索中…' : showResult ? '重新整理' : '以文獻檢索 AI 摘要'}
        </button>
      </div>

      {!showResult && (
        <p className="text-sm text-[#7A5232] py-2">
          點擊上方按鈕，會根據本{scope === 'grade' ? '年級' : '班'}的當前統計值呼叫 RAGFlow，回傳含「行動建議」與「文獻引用」的結構化摘要。
        </p>
      )}

      {showResult && mut.isPending && (
        <div className="py-6 text-center text-sm text-[#7A5232]">
          <span className="inline-block animate-pulse">正在檢索文獻並組裝摘要…（約 5~30 秒）</span>
        </div>
      )}

      {showResult && errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {showResult && data && !mut.isPending && (
        <div className="space-y-3">
          <div className="bg-white/70 border border-[#D9C58E] rounded-xl p-4">
            <p className="text-sm text-[#2D3436] leading-relaxed whitespace-pre-line">
              {data.summary}
            </p>
          </div>

          {data.actions?.length > 0 && (
            <div className="bg-white/70 border border-[#D9C58E] rounded-xl p-4">
              <p className="text-xs font-bold text-[#7A5232] uppercase tracking-wide mb-2">行動建議</p>
              <ul className="space-y-1.5">
                {data.actions.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#2D3436]">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#5A3E22] text-white text-[10px] flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.citations?.length > 0 && (
            <div className="bg-white/70 border border-[#D9C58E] rounded-xl p-4">
              <p className="text-xs font-bold text-[#7A5232] uppercase tracking-wide mb-2">參考文獻</p>
              <ul className="space-y-1">
                {data.citations.slice(0, 5).map((c, i) => (
                  <li key={i} className="text-xs text-[#7A5232] leading-snug">
                    <span className="font-semibold">{c.documentName}</span>
                    {c.snippet && <span className="text-[#95A5A6] ml-2">— {c.snippet}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
