/* 木框風進度條（spec-07 §12.2）
 * 禁止使用 Duolingo 綠 #58CC02。改用木框 + 米色軌道 + 教師綠填充。
 *
 * Props:
 *   progress  : 0~100 數值
 *   stepInfo  : 顯示在右側的「師徒 6/7」「stage: 修正」等診斷資訊（選用）
 *   bumping   : 進度跳動時加 +N 浮字動畫（選用）
 *   bumpAmount: +N 數值
 */
export default function WoodenProgressBar({ progress = 0, stepInfo = null, bumping = false, bumpAmount = 1 }) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className={`flex-1 min-w-0 bg-gradient-to-b from-[#C19A6B] to-[#8B5E3C] p-[3px] rounded-full
                   shadow-[0_3px_0_-1px_#5A3E22,0_4px_8px_-2px_rgba(91,66,38,0.3)] relative
                   transition-transform duration-200 ${bumping ? 'scale-y-110' : 'scale-y-100'}`}
      >
        <div className="bg-[#FBE9C7] rounded-full overflow-hidden h-3 sm:h-3.5 relative">
          <div
            className="h-full bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E] transition-[width] duration-700 ease-out rounded-full"
            style={{ width: `${clamped}%` }}
          />
          {/* 米色軌道高光 */}
          <div className="absolute top-0.5 left-0 right-0 h-0.5 bg-white/40 rounded-full" aria-hidden />
        </div>
        {bumping && (
          <span
            className="absolute -top-5 font-game text-sm font-black text-[#5C8A2E]
                       drop-shadow-[0_2px_0_rgba(255,255,255,0.6)] whitespace-nowrap animate-fade-up"
            style={{ left: `${clamped}%`, transform: 'translateX(-50%)' }}
          >
            +{bumpAmount}
          </span>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end leading-tight min-w-[3.5rem]">
        <span className="font-game text-base sm:text-lg font-black text-[#5A3E22] tabular-nums">
          {clamped}%
        </span>
        {stepInfo && (
          <span className="text-[10px] sm:text-xs text-[#7A5232] font-bold">{stepInfo}</span>
        )}
      </div>
    </div>
  );
}
