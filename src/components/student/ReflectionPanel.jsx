import { Icon, WOOD_OUTER, WOOD_INNER_CREAM } from '../ui/woodKit';
import { Bubble } from './ChatStream';

/* 反思頁（雙欄米紙 panel，spec-07 §12.6 — 禁用書本翻頁造型） */
export default function ReflectionPanel({
  quiz,
  session,
  activeTab,
  onChangeTab,
  messages,
  inputValue,
  onInputChange,
  onSend,
  onExit,
}) {
  const tabs = quiz.questions.map((q) => ({ index: q.index, title: q.title }));
  const activeMessages = session?.perQuestion?.[activeTab]?.messages ?? [];

  return (
    <div className="flex-1 flex flex-col px-3 sm:px-5 pb-6 animate-fade-up min-h-0">
      <div className={WOOD_OUTER + ' flex-1 min-h-0'}>
        <div className={WOOD_INNER_CREAM + ' p-3 sm:p-4 md:p-5 h-full flex flex-col min-h-0'}>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
            {/* 左：回顧 */}
            <section className="flex flex-col min-h-0">
              <h3 className="font-game text-base sm:text-lg font-black text-[#5A3E22] mb-2 flex items-center gap-2">
                <Icon name="menu_book" filled className="text-xl text-[#D08B2E]" />
                回顧
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tabs.map((t) => (
                  <button
                    key={t.index}
                    type="button"
                    onClick={() => onChangeTab(t.index)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition
                               ${activeTab === t.index
                                 ? 'bg-[#D08B2E] border-[#9B5E18] text-white'
                                 : 'bg-white border-[#C19A6B] text-[#7A5232] hover:bg-[#FFF4E0]'}`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {activeMessages.length === 0 ? (
                  <p className="text-sm text-[#B5A57F] text-center mt-6">（沒有對話紀錄）</p>
                ) : (
                  activeMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl px-3 py-2 text-sm leading-relaxed border max-w-[92%]
                                  ${m.role === 'ai'
                                    ? 'self-start bg-[#FFF8E7] border-[#C19A6B]/60 text-[#7A5232]/90'
                                    : 'self-end bg-[#E8F4D8] border-[#A8D88E]/80 text-[#3D5A1A] ml-auto'}`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* 右：反思對話 */}
            <section className="flex flex-col min-h-0 border-t-2 md:border-t-0 md:border-l-2 border-[#C19A6B]/40 pt-3 md:pt-0 md:pl-4">
              <h3 className="font-game text-base sm:text-lg font-black text-[#5A3E22] mb-2 flex items-center gap-2">
                <Icon name="auto_awesome" filled className="text-xl text-[#5C8A2E]" />
                反思
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {messages.map((m) => <Bubble key={m.id} role={m.role} text={m.text} />)}
              </div>
              <div className="shrink-0 flex items-stretch gap-2 mt-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder="說說你的反思..."
                  className="flex-1 min-w-0 rounded-2xl bg-white border-2 border-[#C19A6B]
                             px-4 py-2.5 text-sm text-[#5A3E22] placeholder-[#B5A57F]
                             focus:outline-none focus:ring-2 focus:ring-[#5C8A2E]/50"
                />
                <button
                  type="button"
                  onClick={onSend}
                  disabled={!inputValue.trim()}
                  className="shrink-0 inline-flex items-center justify-center gap-1
                             rounded-2xl border-2 px-3 py-2 text-sm
                             bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E] border-[#3D5A1A] text-white
                             font-game font-black
                             shadow-[0_3px_0_#3D5A1A] hover:translate-y-0.5
                             disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  送出
                </button>
              </div>
            </section>
          </div>

          {/* 底：完成按鈕 */}
          <div className="shrink-0 mt-3 sm:mt-4 flex justify-center">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border-2
                         bg-gradient-to-b from-[#F0B962] to-[#D08B2E] border-[#9B5E18] text-white
                         font-game font-bold
                         shadow-[0_4px_0_#9B5E18] hover:translate-y-0.5 hover:shadow-[0_2px_0_#9B5E18]
                         transition-all duration-200"
            >
              <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">完成回到首頁</span>
              <Icon name="home" filled className="text-xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
