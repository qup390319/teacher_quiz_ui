import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import CrossClassNodeChart from './shared/CrossClassNodeChart';
import OptionAttractionChart from './shared/OptionAttractionChart';

/**
 * 知識節點答對率（D 階段方案 C 重組）
 *
 * 主視圖：CrossClassNodeChart — 同一節點各班並排答對率長條圖
 * 次視圖：OptionAttractionChart（題目選項吸引力檢核）— 預設折疊，
 *         保留資料但不佔據主畫面，回應教授「不滾動可看完」需求
 */
export default function NodesPage() {
  const { overviewData, quizId, gradeStats } = useOutletContext();
  const [showOptionAttraction, setShowOptionAttraction] = useState(false);

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
        <CrossClassNodeChart overviewData={overviewData} />
      </div>

      {/* 進階：題目選項吸引力檢核 — 預設折疊 */}
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptionAttraction((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-[#636E72]" style={{ fontSize: 22 }}>tune</span>
            <div className="text-left">
              <p className="font-bold text-[#2D3436]">進階：題目選項吸引力檢核</p>
              <p className="text-sm text-[#95A5A6] mt-0.5">檢視各題 A/B/C/D 的選擇分布，評估干擾選項設計是否合理</p>
            </div>
          </div>
          <svg className={`w-5 h-5 text-[#636E72] transition-transform ${showOptionAttraction ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showOptionAttraction && (
          <div className="px-6 pb-6 border-t border-[#EFF1F3]">
            <OptionAttractionChart quizId={quizId} gradeStats={gradeStats} />
          </div>
        )}
      </div>
    </div>
  );
}
