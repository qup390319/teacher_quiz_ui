/**
 * StepIndicator
 *
 * Optional props for clickable steps:
 *   onStepClick(stepNum) — fires when a navigable step is clicked
 *   canNavigateTo(stepNum) — predicate; if returns false the step is rendered
 *                            non-interactive (cursor-not-allowed, no click)
 *
 * If `onStepClick` is omitted, the indicator behaves as a static visual
 * (backward-compatible).
 */
export default function StepIndicator({ currentStep, steps, onStepClick, canNavigateTo }) {
  const interactive = typeof onStepClick === 'function';
  const allow = (n) => (typeof canNavigateTo === 'function' ? canNavigateTo(n) : true);

  return (
    <div className="flex flex-wrap items-center gap-y-3">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isAllowed = interactive && !isCurrent && allow(stepNum);

        const pillBase = 'relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-sm sm:text-[15px] font-semibold transition-all border';
        // 當前步驟：深綠 + 白字 + 高對比；已完成：淺綠柔和；未到達：白底灰
        const pillColor = isCurrent
          ? 'bg-[#5C8A2E] text-white border-[#3D5A3E] shadow-[0_3px_8px_rgba(92,138,46,0.35)] ring-2 ring-[#8FC87A]/40 scale-[1.03]'
          : isCompleted
          ? 'bg-[#E2F4D8] text-[#3D5A3E] border-[#A7D696]'
          : 'bg-white text-[#95A5A6] border-[#D5D8DC]';
        const interactivity = interactive
          ? (isCurrent
              ? 'cursor-default'
              : isAllowed
                ? 'cursor-pointer hover:brightness-95 hover:ring-2 hover:ring-[#8FC87A]/40'
                : 'cursor-not-allowed opacity-60')
          : '';
        const pillClass = `${pillBase} ${pillColor} ${interactivity}`;

        const numCircle = (
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-sm sm:text-sm font-bold flex-shrink-0 border-2 ${
            isCurrent
              ? 'bg-white text-[#3D5A3E] border-white shadow-inner'
              : isCompleted
              ? 'bg-[#5C8A2E] text-white border-[#5C8A2E]'
              : 'bg-[#EEF5E6] text-[#95A5A6] border-[#BDC3C7]'
          }`}>
            {isCompleted
              ? <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              : stepNum
            }
          </span>
        );

        const inner = (
          <>
            {numCircle}
            {step}
            {/* 「目前位置」徽章：浮在當前步驟 pill 右上角 */}
            {isCurrent && (
              <span
                className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full text-[15px] font-bold text-white whitespace-nowrap"
                style={{
                  background: '#D08B2E',
                  boxShadow: '0 1px 4px rgba(208,139,46,0.4)',
                  letterSpacing: '0.5px',
                }}
              >
                目前位置
              </span>
            )}
          </>
        );

        return (
          <div key={stepNum} className="flex items-center">
            {interactive ? (
              <button
                type="button"
                disabled={!isAllowed && !isCurrent}
                onClick={() => isAllowed && onStepClick(stepNum)}
                className={pillClass}
                title={!isAllowed && !isCurrent ? '請先完成前一個步驟' : undefined}
              >
                {inner}
              </button>
            ) : (
              <div className={pillClass}>{inner}</div>
            )}
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 mx-1.5 rounded-full ${isCompleted ? 'bg-[#5C8A2E]' : 'bg-[#D5D8DC]'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
