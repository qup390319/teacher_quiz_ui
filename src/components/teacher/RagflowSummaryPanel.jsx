import { ApiError } from '../../lib/api';
import {
  useGradeSummaryCache,
  useClassSummaryCache,
  useGradeSummary,
  useClassSummary,
} from '../../hooks/useSummary';

/**
 * 文獻引用版 AI 摘要面板（N1 / N2，spec-12 §8）
 *
 * 進頁面自動載入快取；若無快取則自動首次生成。
 * 教師可按「重新生成」強制重新呼叫 RAGFlow。
 */
export default function RagflowSummaryPanel({ scope, payload, title }) {
  const quizId = payload?.quizId;
  const classId = payload?.classId;

  const gradeCache = useGradeSummaryCache(scope === 'grade' ? quizId : null);
  const classCache = useClassSummaryCache(
    scope === 'class' ? quizId : null,
    scope === 'class' ? classId : null,
  );
  const cacheQuery = scope === 'grade' ? gradeCache : classCache;

  const gradeMut = useGradeSummary();
  const classMut = useClassSummary();
  const mut = scope === 'grade' ? gradeMut : classMut;

  const cacheData = cacheQuery.data;
  const cacheLoading = cacheQuery.isLoading;
  const cacheIs404 = cacheQuery.error instanceof ApiError && cacheQuery.error.status === 404;

  const data = mut.data ?? cacheData;
  const isGenerating = mut.isPending;

  const handleGenerate = async (force = false) => {
    try {
      await mut.mutateAsync({ payload, force });
    } catch (err) {
      console.error('[RagflowSummaryPanel]', err);
    }
  };

  const needsFirstGenerate = !cacheLoading && !cacheData && cacheIs404 && !mut.data && !mut.isPending;

  const error = mut.error;
  const errorMsg = error
    ? error instanceof ApiError && error.code === 'RAGFLOW_UNAVAILABLE'
      ? '文獻檢索服務暫時無法回應，請稍後再試。'
      : error instanceof ApiError && error.code === 'RAGFLOW_EMPTY'
        ? '文獻無法生成摘要，請更換題組或稍後再試。'
        : `請求失敗：${error.message ?? '未知錯誤'}`
    : '';

  const generatedAt = data?.generatedAt;
  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
    : null;

  return (
    <div className="bg-gradient-to-br from-[#FFFCF3] to-[#FBE9C7] border-2 border-[#D9C58E] rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📚</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#5A3E22]">{title}</h3>
          <p className="text-sm text-[#7A5232]">
            由 RAGFlow 從水溶液迷思概念研究文獻檢索並生成
            {formattedTime && (
              <span className="ml-2 text-[#95A5A6]">· 上次生成：{formattedTime}</span>
            )}
          </p>
        </div>
        {data && (
          <button
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="px-3 py-1.5 text-sm font-semibold text-[#7A5232] bg-white border border-[#D9C58E] rounded-lg hover:bg-[#FFF8E7] disabled:opacity-50"
          >
            {isGenerating ? '生成中…' : '重新生成'}
          </button>
        )}
      </div>

      {cacheLoading && (
        <div className="py-6 text-center text-sm text-[#7A5232]">
          <span className="inline-block animate-pulse">載入中…</span>
        </div>
      )}

      {needsFirstGenerate && (
        <div className="py-4 text-center">
          <p className="text-sm text-[#7A5232] mb-3">
            尚未生成過 AI 摘要，點擊下方按鈕首次生成。
          </p>
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#8B5E3C] rounded-xl hover:bg-[#7A5232] disabled:opacity-50 transition-colors"
          >
            {isGenerating ? '生成中…' : '以文獻檢索 AI 摘要'}
          </button>
        </div>
      )}

      {isGenerating && !data && (
        <div className="py-6 text-center text-sm text-[#7A5232]">
          <span className="inline-block animate-pulse">正在檢索文獻並組裝摘要…（約 5~30 秒）</span>
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {data && !isGenerating && (
        <div className="space-y-3">
          <div className="bg-white/70 border border-[#D9C58E] rounded-xl p-4">
            <p className="text-sm text-[#2D3436] leading-relaxed whitespace-pre-line">
              {data.summary}
            </p>
          </div>

          {data.actions?.length > 0 && (
            <div className="bg-white/70 border border-[#D9C58E] rounded-xl p-4">
              <p className="text-sm font-bold text-[#7A5232] uppercase tracking-wide mb-2">行動建議</p>
              <ul className="space-y-1.5">
                {data.actions.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#2D3436]">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#5A3E22] text-white text-[15px] flex items-center justify-center font-bold mt-0.5">
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
              <p className="text-sm font-bold text-[#7A5232] uppercase tracking-wide mb-2">參考文獻</p>
              <ul className="space-y-1">
                {data.citations.slice(0, 5).map((c, i) => (
                  <li key={i} className="text-sm text-[#7A5232] leading-snug">
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
