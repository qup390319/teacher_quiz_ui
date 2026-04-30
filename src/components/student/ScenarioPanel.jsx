import { Icon, WOOD_OUTER, WOOD_INNER_CREAM } from '../ui/woodKit';

/* 情境敘述頁（題目開始前 / 換題時，spec-08 §6） */
export default function ScenarioPanel({
  question,
  indexLabel,
  onZoomImage,
  onConfirm,
  confirmLabel = '我已閱讀完成，開始挑戰',
}) {
  if (!question) return null;
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-12 pt-2 animate-fade-up">
      <div className="max-w-3xl mx-auto">
        <div className={WOOD_OUTER}>
          <div className={WOOD_INNER_CREAM + ' p-5 sm:p-7'}>
            <p className="text-xs sm:text-sm font-game font-black tracking-widest text-[#D08B2E] text-center mb-2">
              {indexLabel}
            </p>
            <h2 className="font-game text-2xl sm:text-3xl font-black text-[#5A3E22] text-center mb-4
                           drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
              論證情境
            </h2>
            <p className="text-sm sm:text-base leading-7 sm:leading-8 text-[#5A3E22] whitespace-pre-line">
              {question.scenarioText}
            </p>
            {question.scenarioImages?.length > 0 && (
              <div className="mt-5 flex flex-col items-center gap-3">
                {question.scenarioImages.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => onZoomImage?.(src)}
                    className="group relative cursor-zoom-in"
                  >
                    <img
                      src={src}
                      alt={`情境圖 ${idx + 1}`}
                      className="block w-full h-auto rounded-xl border-2 border-[#C19A6B]
                                 max-w-[420px] sm:max-w-[480px] shadow-[0_4px_0_-1px_#5A3E22]"
                    />
                    {question.scenarioImageZoomable !== false && (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl
                                       bg-black/45 px-3 py-1.5 text-xs text-white opacity-0
                                       group-hover:opacity-100 transition-opacity">
                        點擊放大
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-1.5 px-7 py-3.5 rounded-full border-2
                       bg-gradient-to-b from-[#8AC0D8] to-[#5293B4] border-[#3A7397] text-white
                       font-game font-bold tracking-wider text-lg
                       shadow-[0_5px_0_#3A7397,0_8px_14px_-3px_rgba(58,115,151,0.5)]
                       hover:translate-y-0.5 hover:shadow-[0_3px_0_#3A7397] transition-all duration-200"
          >
            <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{confirmLabel}</span>
            <Icon name="play_arrow" filled className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
