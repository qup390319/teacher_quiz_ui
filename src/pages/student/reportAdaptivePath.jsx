/**
 * 本次診斷的追蹤路徑（學生端報告・spec-07 木框風）。
 *
 * 呈現施測中「動態選題」的實際路徑：答對就往下、答錯就回頭看更基礎的概念。
 * 資料由後端重播適性引擎取得（useAdaptivePath → /api/adaptive/trace-path）。
 * 語氣溫和、不用「未通過／未精熟」等字眼（spec-05 §2.2、AI 對話語氣準則）。
 */
import { useAdaptivePath } from '../../hooks/useAdaptive';
import { buildTraceAnswered, summarizeAdaptivePath } from '../../utils/adaptivePath';
import { Icon } from '../../components/ui/woodKit';

function StepChip({ step, index }) {
  const ok = step.passed;
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FFF4E0] border-2 border-[#C19A6B]
                       font-game text-xs font-black text-[#7A4A18] flex items-center justify-center">
        {index + 1}
      </span>
      <div className={[
        'flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2',
        ok ? 'bg-[#EEF7E2] border-[#A7D696]' : 'bg-[#FFF1E6] border-[#F0C48A]',
      ].join(' ')}>
        <span className="font-game text-sm font-black text-[#5A3E22] leading-tight">
          {step.nodeName}
        </span>
        <span className={[
          'flex-shrink-0 inline-flex items-center gap-1 font-game text-xs font-black',
          ok ? 'text-[#3D5A3E]' : 'text-[#B9770E]',
        ].join(' ')}>
          <Icon name={ok ? 'check_circle' : 'psychology_alt'} filled className="text-base" />
          {ok ? '答對了' : '再想想'}
        </span>
      </div>
    </div>
  );
}

export default function ReportAdaptivePath({ quizId, resultItems }) {
  const answered = buildTraceAnswered(resultItems);
  const { data } = useAdaptivePath(quizId, answered);
  const summary = summarizeAdaptivePath(data || {});

  // 只在有可呈現的適性路徑、且真的發生過退回時才顯示——沒退回就沒有「追蹤」故事可講。
  if (!summary.showable || !summary.hasRetreat) return null;

  return (
    <div className="bg-white border-[3px] border-[#8B5E3C] rounded-[24px] p-4 sm:p-5
                    shadow-[0_4px_0_-1px_#5A3E22,0_6px_10px_-3px_rgba(91,66,38,0.3)]">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="route" filled className="text-2xl text-[#7A4A18]" />
        <h2 className="font-game text-lg font-black text-[#5A3E22]">本次診斷的追蹤路徑</h2>
      </div>
      <p className="text-xs sm:text-sm text-[#8B6B43] font-bold mb-4 leading-relaxed">
        當你有一題答錯時，我會帶你回頭看更基礎的概念，找出最早卡住的地方。
      </p>

      <div className="space-y-0">
        {data.steps.map((step, i) => (
          <div key={`${step.nodeId}-${i}`}>
            {i > 0 && (
              <div className="flex items-center gap-2 pl-8 py-1">
                <Icon
                  name={step.kind === 'retreat' ? 'subdirectory_arrow_left' : 'south'}
                  filled
                  className={`text-lg ${step.kind === 'retreat' ? 'text-[#B9770E]' : 'text-[#A38A5A]'}`}
                />
                {step.kind === 'retreat' && (
                  <span className="font-game text-xs font-black text-[#B9770E]">
                    回頭看更基礎的概念
                  </span>
                )}
              </div>
            )}
            <StepChip step={step} index={i} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 bg-[#FFFBF0] border-2 border-[#F5D669] rounded-xl p-3">
        <Icon name="tips_and_updates" filled className="text-lg text-[#B9770E] flex-shrink-0" />
        <p className="text-xs sm:text-sm text-[#7A5232] font-bold leading-relaxed">
          這次你答錯後，我帶你回頭確認了
          <span className="text-[#B9770E]"> {summary.retreatCount} </span>
          個更基礎的概念
          {summary.hasSkip && (
            <>，另外有 <span className="text-[#5C8A2E]">{summary.skippedCount}</span> 個基礎概念因為你已經掌握就跳過了</>
          )}
          。打穩這些基礎，後面的概念會學得更輕鬆喔！
        </p>
      </div>
    </div>
  );
}
