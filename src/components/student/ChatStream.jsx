import { Icon, WOOD_OUTER, WOOD_INNER_CREAM } from '../ui/woodKit';

/* 對話面板（含「查看情境」摺疊 + 對話氣泡列表 + 輸入框 / 下一題按鈕）
 * spec-07 §12.3 對話氣泡 */
export default function ChatStream({
  scenarioExpanded,
  onToggleScenario,
  currentQuestion,
  messages,
  isThinking,
  chatStreamRef,
  requiresRestatement,
  onZoomImage,
  inputValue,
  inputRef,
  isBetween,
  onInputChange,
  onKeyDown,
  onSend,
  onNextQuestionScenario,
}) {
  return (
    <div className="flex-1 flex flex-col px-3 sm:px-5">
      {/* 查看情境 摺疊 */}
      {currentQuestion && !isBetween && (
        <div className="shrink-0 mb-2 animate-fade-up">
          <button
            type="button"
            onClick={onToggleScenario}
            aria-expanded={scenarioExpanded}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-[#8B5E3C]
                       bg-white text-[#7A4A18] text-xs sm:text-sm font-game font-black
                       shadow-[0_2px_0_#8B5E3C] hover:translate-y-0.5 transition-all duration-200"
          >
            <Icon name={scenarioExpanded ? 'expand_less' : 'expand_more'} filled className="text-base" />
            {scenarioExpanded ? '收起情境' : '查看情境'}
          </button>
          {scenarioExpanded && (
            <div className={WOOD_OUTER + ' mt-2'}>
              <div className={WOOD_INNER_CREAM + ' px-4 py-3'}>
                <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-[#5A3E22] whitespace-pre-line">
                  {currentQuestion.scenarioText}
                </p>
                {currentQuestion.scenarioImages?.length > 0 && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    {currentQuestion.scenarioImages.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => onZoomImage?.(src)}
                        className="cursor-zoom-in"
                      >
                        <img
                          src={src}
                          alt="情境圖"
                          className="block w-full h-auto rounded-lg border border-[#C19A6B]
                                     max-w-[280px] sm:max-w-[340px]"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 對話氣泡列表 */}
      <section ref={chatStreamRef} className="flex-1 flex flex-col gap-3 pb-4 overflow-y-auto">
        {messages.map((m) => <Bubble key={m.id} role={m.role} text={m.text} />)}
        {isThinking && <ThinkingBubble />}
        {requiresRestatement && (
          <div className="self-center text-xs sm:text-sm text-[#D08B2E] font-bold bg-[#FFF1D8]
                          border-2 border-[#F0B962] rounded-full px-3 py-1 mt-1">
            試著重新說說你的看法吧！
          </div>
        )}
      </section>

      {/* 底部：輸入框 / 下一題 */}
      <div className="shrink-0 sticky bottom-0 -mx-3 sm:-mx-5 px-3 sm:px-5 py-3
                      bg-gradient-to-b from-[#FBE9C7]/0 to-[#FBE9C7]/80 backdrop-blur-sm">
        {isBetween ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onNextQuestionScenario}
              className="inline-flex items-center gap-1.5 px-7 py-3 rounded-full border-2
                         bg-gradient-to-b from-[#8AC0D8] to-[#5293B4] border-[#3A7397] text-white
                         font-game font-bold text-lg
                         shadow-[0_5px_0_#3A7397] hover:translate-y-0.5 hover:shadow-[0_3px_0_#3A7397]
                         transition-all duration-200"
            >
              <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">下一題</span>
              <Icon name="play_arrow" filled className="text-2xl" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-stretch max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="輸入你的想法..."
              rows={2}
              className="flex-1 min-w-0 resize-none rounded-2xl bg-white border-2 border-[#C19A6B]
                         px-4 py-3 text-[#5A3E22] leading-6 placeholder-[#B5A57F]
                         shadow-[inset_0_2px_0_rgba(193,154,107,0.15)]
                         focus:outline-none focus:ring-2 focus:ring-[#5C8A2E]/50"
              aria-label="輸入訊息"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!inputValue.trim()}
              className="shrink-0 self-stretch inline-flex items-center justify-center gap-1
                         rounded-2xl border-2 px-4 sm:px-5
                         bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E] border-[#3D5A1A] text-white
                         font-game font-black tracking-wider
                         shadow-[0_4px_0_#3D5A1A] hover:translate-y-0.5 hover:shadow-[0_2px_0_#3D5A1A]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              <span className="drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">送出</span>
              <Icon name="send" filled className="text-lg" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* 對話氣泡（AI = 米紙木邊 / 學生 = 教師綠，spec-07 §12.3） */
export function Bubble({ role, text }) {
  if (role === 'ai') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3
                        bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                        border-2 border-[#C19A6B] text-[#5A3E22]
                        shadow-[0_2px_0_-1px_#5A3E22]">
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-br-md px-4 py-3
                      bg-gradient-to-b from-[#B8DC83] to-[#7DB044]
                      border-2 border-[#5C8A2E] text-[#2F4A1A]
                      shadow-[0_2px_0_-1px_#3D5A1A]">
        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    </div>
  );
}

export function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md px-4 py-3
                      bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                      border-2 border-[#C19A6B]
                      shadow-[0_2px_0_-1px_#5A3E22]
                      flex items-center gap-2">
        <span className="text-sm text-[#7A5232] font-bold">思考中</span>
        <span className="flex items-center gap-1.5">
          {[0, 240, 480].map((d) => (
            <span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-[#7A5232] animate-[dot-pulse_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
