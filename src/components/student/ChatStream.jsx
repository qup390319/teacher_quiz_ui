/* 對話氣泡元件（AI = 米紙木邊 / 學生 = 教師綠，spec-07 §12.3）
 * 用於診斷追問對話氣泡列表。 */

export function Bubble({ role, text }) {
  if (role === 'ai') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3
                        bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                        border-2 border-[#C19A6B] text-[#5A3E22]
                        shadow-[0_2px_0_-1px_#5A3E22]">
          <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line">{text}</p>
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
        <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line">{text}</p>
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
