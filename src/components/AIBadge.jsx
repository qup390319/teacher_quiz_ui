/**
 * AIBadge — 用於 sidebar 與功能入口，一眼標示「此功能用到 AI」
 *
 * Props:
 *  - description?: string  hover tooltip 顯示的一句話說明
 *  - size?: 'sm' | 'xs'    預設 'sm'；'xs' 用在密集列表
 *  - showPill?: boolean    是否顯示「AI」文字 pill；預設 true
 *
 * 統一視覺：紫色（避開既有藍/橘子主題色，符合業界 AI = 紫色慣例）
 */
export default function AIBadge({ description, size = 'sm', showPill = true }) {
  const iconSize = size === 'xs' ? 14 : 16;
  const pillClass = size === 'xs'
    ? 'text-[9px] px-1 py-px'
    : 'text-[15px] px-1.5 py-0.5';

  return (
    <span
      className="inline-flex items-center gap-1 flex-shrink-0"
      title={description || '此功能由 AI 協助'}
    >
      <span
        className="material-symbols-rounded text-[#7D3C98]"
        style={{ fontSize: iconSize, fontVariationSettings: '"FILL" 1' }}
      >
        auto_awesome
      </span>
      {showPill && (
        <span
          className={`inline-flex items-center font-bold tracking-wider rounded-full bg-[#F3E5F5] text-[#7D3C98] border border-[#D2B4DE] ${pillClass}`}
        >
          AI
        </span>
      )}
    </span>
  );
}
