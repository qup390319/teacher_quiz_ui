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
    <div className="flex flex-wrap items-center gap-y-2">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isAllowed = interactive && !isCurrent && allow(stepNum);

        const pillBase = 'flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all border';
        const pillColor = isCurrent
          ? 'bg-[#8FC87A] text-[#2D3436] border-[#8FC87A]'
          : isCompleted
          ? 'bg-[#C8EAAE] text-[#3D5A3E] border-[#BDC3C7]'
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
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
            isCurrent
              ? 'bg-white text-[#3D5A3E] border-[#BDC3C7]'
              : isCompleted
              ? 'bg-[#8FC87A] text-white border-[#8FC87A]'
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

        const inner = <>{numCircle}{step}</>;

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
              <div className={`h-0.5 w-4 sm:w-8 mx-1 ${isCompleted ? 'bg-[#8FC87A]' : 'bg-[#D5D8DC]'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
