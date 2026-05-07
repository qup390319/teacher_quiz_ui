import { useMemo, useState } from 'react';
import { useClassFollowups } from '../../../../hooks/useAnswers';
import { getMisconceptionById } from '../../../../data/knowledgeGraph';

/**
 * 教師端：學生第二層追問對話完整紀錄。
 *
 * 過去這份資料只在 DB 裡（FollowupResult.conversation_log），
 * 無任何教師頁面顯示。本元件透過 useClassFollowups 撈出後，
 * 以「學生 → 題目」兩層摺疊，預設摺疊以節省版面。
 */
export default function FollowupConversations({ quizId, classId }) {
  const { data, isLoading, error } = useClassFollowups(quizId, classId);
  const [openKey, setOpenKey] = useState(null);

  const groups = useMemo(() => {
    const rows = data?.rows ?? [];
    const byStudent = new Map();
    for (const r of rows) {
      const arr = byStudent.get(r.studentId) ?? [];
      arr.push(r);
      byStudent.set(r.studentId, arr);
    }
    return [...byStudent.values()]
      .map((items) => ({
        studentId: items[0].studentId,
        studentName: items[0].studentName,
        seat: items[0].seat ?? 0,
        items: items.sort((a, b) => a.questionId - b.questionId),
      }))
      .sort((a, b) => a.seat - b.seat);
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-[#95A5A6]">載入追問對話紀錄中…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-[#E74C5E]">
        無法載入追問對話：{error?.message ?? '未知錯誤'}
      </p>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="text-sm text-[#95A5A6]">
        本班尚無學生進入第二層追問對話（學生答題後系統判定無需追問即不會產生紀錄）。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.studentId} className="border border-[#D5D8DC] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#EEF5E6] flex items-center gap-2">
            <span className="text-xs font-mono text-[#636E72]">座號 {g.seat}</span>
            <span className="text-sm font-bold text-[#2D3436]">{g.studentName}</span>
            <span className="text-xs text-[#95A5A6]">· {g.items.length} 題有追問對話</span>
          </div>
          <div className="divide-y divide-[#D5D8DC]">
            {g.items.map((row) => {
              const key = `${row.studentId}-${row.questionId}`;
              const open = openKey === key;
              const misc = row.misconceptionCode
                ? getMisconceptionById(row.misconceptionCode)
                : null;
              const verdictColor = row.finalStatus === 'CORRECT'
                ? 'text-[#3D5A3E] bg-[#C8EAAE] border-[#8FC87A]'
                : row.finalStatus === 'MISCONCEPTION'
                  ? 'text-[#E74C5E] bg-[#FAC8CC] border-[#F5B8BA]'
                  : 'text-[#B7950B] bg-[#FCF0C2] border-[#F5D669]';
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setOpenKey(open ? null : key)}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[#FAFBF8] transition-colors"
                  >
                    <span className="text-xs font-mono text-[#636E72] flex-shrink-0">第 {row.questionId} 題</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${verdictColor}`}>
                      {row.finalStatus === 'CORRECT' ? '✓ 最終判定理解' :
                        row.finalStatus === 'MISCONCEPTION' ? '✗ 持有迷思' : '? 不確定'}
                    </span>
                    {misc && (
                      <span className="text-xs text-[#636E72] truncate">
                        <span className="font-mono opacity-60">{misc.id}</span> {misc.label}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-[#95A5A6]">
                      {row.conversationLog.length} 句對話
                    </span>
                    <svg className={`w-4 h-4 text-[#95A5A6] transition-transform ${open ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {open && (
                    <div className="px-4 py-4 bg-[#FAFBF8] border-t border-[#D5D8DC] space-y-3">
                      {row.aiSummary && (
                        <div className="text-xs text-[#7A5232] bg-[#FFFBF0] border border-[#F5D669] rounded-lg p-2.5">
                          <span className="font-semibold">AI 摘要：</span>{row.aiSummary}
                        </div>
                      )}
                      <div className="space-y-2">
                        {row.conversationLog.length === 0 ? (
                          <p className="text-xs text-[#95A5A6] italic">（沒有對話紀錄）</p>
                        ) : (
                          row.conversationLog.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                  msg.role === 'student'
                                    ? 'bg-[#BADDF4] text-[#1F4E79] border border-[#5DADE2]'
                                    : 'bg-white text-[#2D3436] border border-[#D5D8DC]'
                                }`}
                              >
                                <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">
                                  {msg.role === 'student' ? '學生' : 'AI 老師'}
                                </p>
                                <p className="whitespace-pre-wrap">{msg.content || msg.text}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
