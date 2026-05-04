import { Icon, WOOD_OUTER, WOOD_INNER_CREAM } from '../../components/ui/woodKit';

/* ── 底部 panel 包裝（米紙 + 木紋邊）─────────────── */
export function BottomPanel({ children }) {
  if (!children) return null;
  return (
    <div className="relative z-10 px-3 sm:px-5 pb-4 sm:pb-6 animate-fade-up">
      <div className="max-w-3xl mx-auto">
        <div className={WOOD_OUTER}>
          <div className={WOOD_INNER_CREAM + ' p-3 sm:p-4'}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ── 4 選 1 選項清單 ───────────────────────────── */
export function OptionsPanel({ options, onSelect }) {
  return (
    <>
      <p className="text-xs sm:text-sm text-[#7A5232] mb-2 sm:mb-3 text-center font-bold">
        請選擇你覺得最合理的答案
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <button
            key={opt.tag}
            type="button"
            onClick={() => onSelect(opt)}
            className="text-left flex items-start gap-2 px-4 py-3 rounded-2xl border-2 border-[#C19A6B]
                       bg-white hover:bg-[#FFF1D8] hover:border-[#D08B2E]
                       text-sm leading-relaxed text-[#5A3E22]
                       shadow-[0_2px_0_-1px_#8B5E3C] hover:translate-y-0.5
                       transition-all duration-200"
          >
            <span className="shrink-0 inline-flex w-6 h-6 rounded-full
                             bg-gradient-to-b from-[#F4D58A] to-[#F0B962]
                             border-2 border-[#9B5E18] text-[#7A4A18]
                             font-game font-black text-xs items-center justify-center
                             shadow-[0_2px_0_#9B5E18]">
              {opt.tag}
            </span>
            <span className="flex-1">{opt.content}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── 完成畫面 loading ──────────────────────────── */
export function DonePanel() {
  return (
    <div className="text-center py-3">
      <p className="text-sm font-bold text-[#5A3E22]">
        正在前往你的學習體檢表⋯
      </p>
      <div className="mt-2 flex justify-center">
        <Icon
          name="autorenew"
          filled
          className="text-2xl text-[#5C8A2E] animate-spin"
        />
      </div>
    </div>
  );
}
