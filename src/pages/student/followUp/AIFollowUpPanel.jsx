import { Icon } from '../../../components/ui/woodKit';

/**
 * 第二層 AI 追問底部面板：題目回顧 + 輪次標示 + chip 快選 + 文字輸入框 + 送出鍵。
 *
 * Chip 快速回覆（spec-09 §followup）：
 *  - 由 LLM 在回應中附 chips 字串陣列
 *  - 點擊 chip = 直接以該文字呼叫 onSendText（學生不用打字）
 *  - 同時保留 textarea，學生想自由表達也可以
 *
 * 規格：spec-05 §2.2 第二階段、spec-07 §卡片/按鈕
 */
export default function AIFollowUpPanel({
  inputValue,
  onChange,
  onSend,
  onSendText,           // (text: string) => void；chip 點擊用，可 fallback 到 onSend
  disabled = false,
  round = 1,
  totalRounds = 3,
  questionRecap = null,
  chips = null,         // string[] | null
}) {
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !disabled) onSend();
    }
  };

  const handleChipClick = (text) => {
    if (disabled) return;
    if (typeof onSendText === 'function') {
      onSendText(text);
    } else {
      // fallback：填入輸入框讓家長可看（不自動送出）
      onChange(text);
    }
  };

  const safeChips = Array.isArray(chips)
    ? chips.filter((c) => typeof c === 'string' && c.trim().length > 0)
    : [];

  return (
    <>
      {questionRecap && (
        <div className="mb-2 sm:mb-3 px-3 py-2.5 rounded-xl border-2 border-[#C19A6B] bg-[#FFF8E7]">
          <p className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#7A4A18] font-bold mb-1.5">
            <Icon name="visibility" filled className="text-base" />
            剛才的題目
          </p>
          <p className="text-xs sm:text-sm leading-5 text-[#5A3E22] whitespace-pre-line">
            {questionRecap.stem}
          </p>
          <p className="mt-1.5 text-xs sm:text-sm text-[#7A4A18] font-bold">
            你選了：「{questionRecap.selectedContent}」
          </p>
        </div>
      )}

      <p className="text-xs sm:text-sm text-[#7A5232] mb-2 text-center font-bold">
        對話 {Math.min(round, totalRounds)}/{totalRounds}・說說你的想法
      </p>

      {safeChips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 justify-center">
          {safeChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={disabled}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full border-2
                         bg-white border-[#C19A6B] text-[#5A3E22] text-sm font-bold
                         shadow-[0_2px_0_#C19A6B] hover:translate-y-0.5 hover:shadow-[0_1px_0_#C19A6B]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
              aria-label={`快選：${chip}`}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-stretch">
        <textarea
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={safeChips.length > 0 ? '或者自己打字告訴我⋯' : '輸入你的想法⋯'}
          rows={2}
          disabled={disabled}
          className="flex-1 min-w-0 resize-none rounded-2xl bg-white border-2 border-[#C19A6B]
                     px-4 py-3 text-[#5A3E22] leading-6 placeholder-[#B5A57F]
                     shadow-[inset_0_2px_0_rgba(193,154,107,0.15)]
                     focus:outline-none focus:ring-2 focus:ring-[#5C8A2E]/50
                     disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="輸入訊息"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!inputValue.trim() || disabled}
          className="shrink-0 self-stretch inline-flex items-center justify-center gap-1
                     rounded-2xl border-2 px-4 sm:px-5
                     bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E] border-[#3D5A1A] text-white
                     font-game font-black tracking-wider
                     shadow-[0_4px_0_#3D5A1A] hover:translate-y-0.5 hover:shadow-[0_2px_0_#3D5A1A]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
          aria-label="送出"
        >
          <span className="drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">送出</span>
          <Icon name="send" filled className="text-lg" />
        </button>
      </div>
    </>
  );
}
