/**
 * 學生個別診斷報告（StudentDiagnosisReport）的逐題卡片：
 * 折疊列 + 展開後的 AI 摘要 / 迷思說明 / 狀態變化 / 追問對話紀錄。
 * 自主頁抽出以符合 500 行檔案上限。
 */

export function ReasoningBadge({ quality }) {
  const map = {
    SOLID: { label: '推理扎實', cls: 'bg-[#D6EAF8] text-[#2E86C1]' },
    PARTIAL: { label: '部分理解', cls: 'bg-[#FCF0C2] text-[#B7950B]' },
    WEAK: { label: '推理薄弱', cls: 'bg-[#FDE2E4] text-[#E74C5E]' },
    GUESSING: { label: '猜測作答', cls: 'bg-[#F3E5F5] text-[#7D3C98]' },
  };
  const info = map[quality] ?? { label: quality, cls: 'bg-[#EEF5E6] text-[#636E72]' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[15px] font-semibold ${info.cls}`}>
      {info.label}
    </span>
  );
}

function ConversationLog({ messages }) {
  if (!messages || messages.length === 0) {
    return <p className="text-sm text-[#95A5A6] italic">（沒有對話紀錄）</p>;
  }
  return (
    <div className="space-y-2">
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            msg.role === 'student'
              ? 'bg-[#BADDF4] text-[#1F4E79] border border-[#5DADE2]'
              : 'bg-white text-[#2D3436] border border-[#D5D8DC]'
          }`}>
            <p className="text-[15px] font-bold uppercase opacity-60 mb-0.5">
              {msg.role === 'student' ? '學生' : 'AI 老師'}
            </p>
            <p className="whitespace-pre-wrap">{msg.content || msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuestionCard({ row: r, open, onToggle }) {
  const verdictColor =
    r.finalStatus === 'CORRECT'
      ? 'bg-[#C8EAAE] text-[#2F4A1A]'
      : r.finalStatus === 'MISCONCEPTION'
        ? 'bg-[#FAC8CC] text-[#E74C5E]'
        : 'bg-[#FCF0C2] text-[#7A5232]';
  const verdictLabel =
    r.finalStatus === 'CORRECT' ? '理解' : r.finalStatus === 'MISCONCEPTION' ? '持有迷思' : '不確定';

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#F9FBF7] transition"
      >
        <span className="text-sm font-mono text-[#636E72] w-16 shrink-0">第 {r.questionId} 題</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${verdictColor}`}>
          {verdictLabel}
        </span>
        {r.misc && (
          <span className="text-sm text-[#636E72] truncate">
            <span className="font-mono opacity-60">{r.misc.id}</span> {r.misc.label}
          </span>
        )}
        {r.reasoningQuality && <ReasoningBadge quality={r.reasoningQuality} />}
        <span className="ml-auto text-sm text-[#95A5A6]">
          {r.answeredAt ? new Date(r.answeredAt).toLocaleString('zh-TW') : ''}
        </span>
        <svg
          className={`w-4 h-4 text-[#95A5A6] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <div className="max-w-3xl space-y-3">
            {r.aiSummary && (
              <div className="text-sm text-[#7A5232] bg-[#FFFBF0] border border-[#F5D669] rounded-lg p-2.5">
                <span className="font-semibold">AI 摘要：</span>{r.aiSummary}
              </div>
            )}
            {r.misc && (
              <div className="text-sm bg-[#FAC8CC]/30 border border-[#F5B8BA] rounded-lg p-2.5">
                <span className="font-semibold text-[#E74C5E]">迷思概念：</span>
                <span className="text-[#2D3436]">{r.misc.label}</span>
                <p className="text-[#636E72] mt-1 leading-relaxed">{r.misc.studentDetail || r.misc.detail}</p>
              </div>
            )}
            {r.statusChange && r.statusChange.changeType && (
              <div className="text-sm text-[#636E72] bg-[#F9FBF7] border border-[#D5D8DC] rounded-lg p-2.5">
                <span className="font-semibold">狀態變化：</span>
                {r.statusChange.changeType === 'UPGRADED' ? '追問後判定為理解' : '追問後判定為迷思'}
                {r.statusChange.from && ` (${r.statusChange.from} → ${r.statusChange.to})`}
              </div>
            )}
            <ConversationLog messages={r.conversationLog} />
          </div>
        </div>
      )}
    </div>
  );
}
