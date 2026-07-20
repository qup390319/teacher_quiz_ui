import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import MisconceptionRankingTable from './shared/MisconceptionRankingTable';
import MisconceptionCauseDonut from './shared/MisconceptionCauseDonut';
import FollowupStatusFunnel from './shared/FollowupStatusFunnel';

/**
 * 高頻迷思排行（D 階段方案 C 重組）
 *
 * 主視圖：MisconceptionRankingTable — 完整迷思排行（人次、佔比、涉及學生跳轉）
 * 進階面板（折疊）：迷思成因分類 / 追問後狀態變化
 * ClassMisconceptionHeatmap 已移除（資訊與 ClassesPage 每班高頻迷思 Top3 重複）
 */
export default function MisconceptionsPage() {
  const { overviewData, classes, quizId, gradeStats } = useOutletContext();
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此題組尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此題組派發給班級</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <MisconceptionRankingTable gradeStats={gradeStats} />
      </div>

      {/* 進階：成因分類 / 追問後狀態 — 折疊 */}
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-[#636E72]" style={{ fontSize: 22 }}>tune</span>
            <div className="text-left">
              <p className="font-bold text-[#2D3436]">進階：迷思成因 & 追問結果</p>
              <p className="text-sm text-[#95A5A6] mt-0.5">迷思成因 9 類分布 + 追問後學生狀態變化漏斗</p>
            </div>
          </div>
          <svg className={`w-5 h-5 text-[#636E72] transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div className="border-t border-[#EFF1F3] p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MisconceptionCauseDonut overviewData={overviewData} classes={classes} quizId={quizId} />
            <FollowupStatusFunnel overviewData={overviewData} classes={classes} quizId={quizId} />
          </div>
        )}
      </div>
    </div>
  );
}
