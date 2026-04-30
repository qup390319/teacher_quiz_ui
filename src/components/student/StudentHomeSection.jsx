import { Icon } from '../ui/woodKit';

/* StudentHome 用區塊容器
 *  - 非折疊（預設）：彩色豎條 tab marker（accentColor）+ 標題 + icon
 *  - 折疊型：完整的按鈕式標題列（白底 + 厚棕邊 + 圓形 chevron 鈕）
 */
export default function StudentHomeSection({
  title,
  subtitle,
  count,
  collapsible = false,
  open,
  onToggle,
  className = '',
  accentColor = '#D08B2E',
  icon,
  children,
}) {
  if (collapsible) {
    return (
      <section className={className}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group flex items-center gap-3 w-full text-left
                     bg-white border-[3px] border-[#8B5E3C] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3
                     shadow-[0_4px_0_-1px_#5A3E22,0_6px_10px_-3px_rgba(91,66,38,0.3)]
                     hover:translate-y-0.5 hover:shadow-[0_2px_0_-1px_#5A3E22]
                     transition-all duration-200"
        >
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full
                          bg-gradient-to-b from-[#A8D88E] to-[#7DB044] border-2 border-[#5C8A2E]
                          flex items-center justify-center
                          shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),0_2px_3px_rgba(91,66,38,0.2)]">
            <Icon name="check_circle" filled className="text-2xl sm:text-3xl text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
          </div>

          <div className="flex-1 leading-tight min-w-0">
            <h2 className="font-black text-base sm:text-lg text-[#5A3E22] flex items-center gap-2">
              {title}
              {count != null && (
                <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 h-6 rounded-full
                                bg-[#FFF4E0] border-2 border-[#8B5E3C] text-[#7A4A18] text-xs font-bold leading-none">
                  {count}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-[#7A5232] mt-0.5 font-medium">
              {open ? '點擊收合' : '點擊展開查看'}
            </p>
          </div>

          <div
            className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full
                       bg-gradient-to-b from-[#F4D58A] to-[#F0B962] border-[3px] border-[#9B5E18]
                       flex items-center justify-center
                       shadow-[0_3px_0_#9B5E18]
                       group-hover:shadow-[0_1px_0_#9B5E18]
                       transition-all duration-300
                       ${open ? 'rotate-180' : ''}`}
          >
            <Icon name="expand_more" filled className="text-xl sm:text-2xl text-[#7A4A18] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]" />
          </div>
        </button>

        {open && (
          <div className="mt-3 sm:mt-4 animate-fade-up">{children}</div>
        )}
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="flex items-start gap-2 mb-3">
        <span
          className="block w-1 sm:w-1.5 self-stretch min-h-[1.5rem] mt-1 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex-1 leading-tight">
          <h2 className="font-bold text-base sm:text-lg text-[#5A3E22] flex items-center gap-2">
            {icon && (
              <span
                className="material-symbols-rounded filled text-xl"
                style={{ color: accentColor }}
              >
                {icon}
              </span>
            )}
            {title}
            {count != null && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 h-6 rounded-full
                              bg-[#FFF4E0] border border-[#8B5E3C] text-[#7A4A18] text-xs font-bold leading-none">
                {count}
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#7A5232] mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
