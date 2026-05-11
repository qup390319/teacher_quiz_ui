import { WOOD_OUTER, WOOD_INNER_CREAM } from '../ui/woodKit';
import { resolveScenarioImage } from '../../lib/scenarioImage';

/**
 * 學生對話頁的「情境側欄」（spec-08 §6.2 / spec-07 §12.5）
 * - md+ 螢幕：永遠展開、固定在左欄
 * - 行動裝置：常駐顯示在上方，max-h 35vh 可捲動
 */
export default function ScenarioSideCard({
  question,
  onZoomImage,
}) {
  if (!question) return null;
  return (
    <aside className="md:flex-1 md:overflow-y-auto px-2 md:pl-0 md:pr-2 pb-2 md:pb-6">
      <div className="block max-h-[35vh] md:max-h-none overflow-y-auto md:overflow-y-visible
                       [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <div className={WOOD_OUTER}>
          <div className={WOOD_INNER_CREAM + ' px-4 py-3 md:px-5 md:py-4'}>
            <h3 className="text-sm font-game font-black text-[#7A4A18] mb-2 tracking-widest">
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
