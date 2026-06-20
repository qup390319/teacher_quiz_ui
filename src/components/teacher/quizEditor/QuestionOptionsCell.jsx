import { getQuestionMode, getAnswerOptions, getReasonOptions } from '../../../data/twoTier';

/**
 * 出題表格「選項內容 / 對應迷思」儲存格。
 * single：一組選項，各標正解 / 迷思。
 * two-tier：第一層答案（標正解）+ 第二層理由（標正確理由 / 迷思）。
 */
function ReasonOrSingleRow({ opt, isCorrect, misconLabel, correctText, correctTheme, showAnswerTag }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center border ${isCorrect ? correctTheme : 'bg-[#EEF5E6] border-[#D5D8DC] text-[#636E72]'}`}>
        {opt.tag}
      </span>
      <div className="flex-1">
        <span className="text-sm text-[#2D3436]">{opt.content}</span>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {isCorrect ? (
            <span className={`inline-block text-sm font-semibold px-2 py-0.5 rounded-full border ${correctTheme}`}>{correctText}</span>
          ) : (
            <span className="inline-block text-sm font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#F5B8BA] px-2 py-0.5 rounded-full">
              迷思：{misconLabel}
            </span>
          )}
          {showAnswerTag && opt.answerTag && (
            <span className="inline-block text-xs font-semibold text-[#5A3E22] bg-[#FBE9C7] border border-[#D9C58E] px-2 py-0.5 rounded-full">
              對應答案 {opt.answerTag}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestionOptionsCell({ question, getMisconceptionLabel }) {
  if (getQuestionMode(question) === 'two-tier') {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold text-[#5C8A2E] mb-1">第一層 · 答案</p>
          <div className="space-y-1.5">
            {getAnswerOptions(question).map((opt) => (
              <div key={opt.tag} className="flex items-start gap-2">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center border ${opt.correct ? 'bg-[#C8EAAE] border-[#BDC3C7] text-[#3D5A3E]' : 'bg-[#EEF5E6] border-[#D5D8DC] text-[#636E72]'}`}>
                  {opt.tag}
                </span>
                <span className="flex-1 text-sm text-[#2D3436]">
                  {opt.content}
                  {opt.correct && <span className="ml-1.5 text-sm font-semibold text-[#3D5A3E]">✓ 正解</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-[#2E6FA6] mb-1">第二層 · 理由</p>
          <div className="space-y-1.5">
            {getReasonOptions(question).map((opt) => (
              <ReasonOrSingleRow
                key={opt.tag}
                opt={opt}
                isCorrect={opt.diagnosis === 'CORRECT'}
                misconLabel={getMisconceptionLabel(question.knowledgeNodeId, opt.diagnosis)}
                correctText="✓ 正確理由"
                correctTheme="bg-[#BFE0F5] border-[#8FB8DE] text-[#1E4E73]"
                showAnswerTag
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <ReasonOrSingleRow
          key={opt.tag}
          opt={opt}
          isCorrect={opt.diagnosis === 'CORRECT'}
          misconLabel={getMisconceptionLabel(question.knowledgeNodeId, opt.diagnosis)}
          correctText="✓ 正確答案"
          correctTheme="bg-[#C8EAAE] border-[#BDC3C7] text-[#3D5A3E]"
        />
      ))}
    </div>
  );
}
