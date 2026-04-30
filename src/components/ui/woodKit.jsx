/* SciLens 木框收集冊風 共用元件
 * 詳細規範見 docs/spec-07-ui-design-system.md §3 木框元件規範
 *
 * 統一 export：所有需要木框風格的頁面從這裡 import，避免散落維護。
 */

/* ── Material Symbols Rounded 圖示包裝 ──────────────────────────── */
export const Icon = ({ name, className = '', filled = false }) => (
  <span className={`material-symbols-rounded${filled ? ' filled' : ''} ${className}`}>{name}</span>
);

/* ── 木框工具 class 常數（spec-07 §3.1）────────────────────────── */
export const WOOD_OUTER =
  'bg-gradient-to-b from-[#C19A6B] to-[#8B5E3C] p-[5px] rounded-[28px] ' +
  'shadow-[0_6px_0_-1px_#5A3E22,0_14px_24px_-6px_rgba(91,66,38,0.45)]';

export const WOOD_INNER_CREAM =
  'bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7] rounded-[22px] border-2 border-[#FFFFFF]/70';

/* ── 招牌（角色 / 章節題名牌）─────────────────────────────────── */
export const SignBoard = ({ children, color = 'green', className = '' }) => {
  const palette = color === 'green'
    ? 'bg-gradient-to-b from-[#B8DC83] to-[#7DB044] text-[#2F4A1A] border-[#5C8A2E]'
    : color === 'blue'
      ? 'bg-gradient-to-b from-[#86CEF5] to-[#4A9FD8] text-[#1A3A5C] border-[#2E6FA0]'
      : color === 'orange'
        ? 'bg-gradient-to-b from-[#F0B962] to-[#D08B2E] text-white border-[#9B5E18]'
        : 'bg-gradient-to-b from-[#D8C7A0] to-[#B8A076] text-[#5A3E22] border-[#8B5E3C]';
  return (
    <div className={`relative inline-flex items-center justify-center px-4 py-1 rounded-full border-2 ${palette}
                     shadow-[0_3px_0_-1px_rgba(0,0,0,0.25),0_5px_8px_-3px_rgba(0,0,0,0.3)]
                     font-game text-sm font-bold tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </div>
  );
};

/* ── 三星評等 ──────────────────────────────────────────────────── */
export const StarRating = ({ count = 0, max = 3, size = 'text-xl' }) => (
  <div className="inline-flex items-center gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Icon
        key={i}
        name="star"
        filled
        className={`${size} drop-shadow-[0_2px_0_rgba(180,120,30,0.5)] ${
          i < count ? 'text-[#F4C545]' : 'text-[#D8C7A0]'
        }`}
      />
    ))}
  </div>
);

/* ── 主要 GO 按鈕（角色色 variants）─────────────────────────────
 * spec-07 §4.3 — 一頁限 1~2 個，避免氾濫
 * 用法：<GoButton variant="student" onClick={...}>開始挑戰</GoButton>
 */
export const GoButton = ({
  children = 'GO',
  variant = 'student',
  icon = 'play_arrow',
  onClick,
  className = '',
  type = 'button',
  disabled = false,
}) => {
  const palette = variant === 'teacher'
    ? 'bg-gradient-to-b from-[#F0B962] to-[#D08B2E] border-[#9B5E18] shadow-[0_5px_0_#9B5E18,0_8px_14px_-3px_rgba(155,94,24,0.5)] hover:shadow-[0_3px_0_#9B5E18]'
    : 'bg-gradient-to-b from-[#8AC0D8] to-[#5293B4] border-[#3A7397] shadow-[0_5px_0_#3A7397,0_8px_14px_-3px_rgba(58,115,151,0.5)] hover:shadow-[0_3px_0_#3A7397]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full border-2
                  text-white font-game font-bold tracking-wider
                  hover:translate-y-0.5 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${palette} ${className}`}
    >
      <span className="text-xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{children}</span>
      {icon && (
        <Icon name={icon} filled className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] group-hover:translate-x-1 transition-transform" />
      )}
    </button>
  );
};

/* ── 圓木紐扣（次要互動：返回、設定、ⓘ 等）────────────────────── */
export const WoodIconButton = ({ icon, onClick, ariaLabel, size = 'md', filled = true, className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-base'
    : size === 'lg' ? 'w-12 h-12 text-2xl'
    : 'w-10 h-10 text-xl';
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${sizeClass} rounded-full
                 bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                 border-[3px] border-[#8B5E3C] text-[#7A4A18]
                 flex items-center justify-center flex-shrink-0
                 shadow-[0_3px_0_-1px_#5A3E22,0_5px_8px_-2px_rgba(0,0,0,0.3)]
                 hover:scale-110 hover:rotate-12 hover:bg-[#FFF4E0]
                 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${className}`}
    >
      <Icon name={icon} filled={filled} />
    </button>
  );
};
