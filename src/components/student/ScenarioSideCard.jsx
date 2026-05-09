import { WOOD_OUTER, WOOD_INNER_CREAM, Icon } from '../ui/woodKit';
import { resolveScenarioImage } from '../../lib/scenarioImage';

/**
 * 學生對話頁的「情境側欄」（spec-08 §6.2 / spec-07 §12.5）
 * - md+ 螢幕：永遠展開、固定在左欄，跟著對話一起捲動
 * - 行動裝置：可收合（節省空間），預設展開
 * Issue #3：對話頁切兩欄，情境永遠可見不需收合
 */
export default function ScenarioSideCard({
  question,
  onZoomImage,
  collapsibleOnMobile = true,
  expanded,
  onToggle,
}) {
  if (!question) return null;
  // md+：永遠顯示內容；mobile：依 expanded 狀態（用 CSS class 控制顯隱，避免 conditional render 把整段拿掉）
  const contentVisibilityClass = collapsibleOnMobile
    ? (expanded ? 'block' : 'hidden md:block')
    : 'block';
  return (
    <aside className="md:flex-1 md:overflow-y-auto px-2 md:pl-0 md:pr-2 pb-2 md:pb-6">
      {collapsibleOnMobile && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-full border-2 border-[#8B5E3C]
                     bg-white text-[#7A4A18] text-sm font-game font-black
                     shadow-[0_2px_0_#8B5E3C] hover:translate-y-0.5 transition-all duration-200"
        >
          <Icon name={expanded ? 'expand_less' : 'expand_more'} filled className="text-base" />
          {expanded ? '收起情境' : '查看情境'}
        </button>
      )}
      <div className={contentVisibilityClass}>
        <div className={WOOD_OUTER}>
          <div className={WOOD_INNER_CREAM + ' px-4 py-3 md:px-5 md:py-4'}>
            <h3 className="hidden md:block text-sm font-game font-black text-[#7A4A18] mb-2 tracking-widest">
              情境題目
            </h3>
            <p className="text-sm md:text-base leading-7 md:leading-8 text-[#5A3E22] whitespace-pre-line">
              {question.scenarioText}
            </p>
            {question.scenarioImages?.length > 0 && (
              <div className="mt-3 flex flex-col items-center gap-2">
                {question.scenarioImages.map((src) => {
                  const resolved = resolveScenarioImage(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => onZoomImage?.(resolved)}
                      className="cursor-zoom-in"
                    >
                      <img
                        src={resolved}
                        alt="情境圖"
                        className="block w-full h-auto rounded-lg border border-[#C19A6B]
                                   max-w-[420px] md:max-w-full"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
