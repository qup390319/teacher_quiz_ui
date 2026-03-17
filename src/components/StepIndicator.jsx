export default function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <div key={stepNum} className="flex items-center">
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              isCurrent
                ? 'bg-[#8FC87A] text-[#2D3436] border-[#8FC87A]'
                : isCompleted
                ? 'bg-[#C8EAAE] text-[#3D5A3E] border-[#BDC3C7]'
                : 'bg-white text-[#95A5A6] border-[#D5D8DC]'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                isCurrent
                  ? 'bg-white text-[#3D5A3E] border-[#BDC3C7]'
                  : isCompleted
                  ? 'bg-[#8FC87A] text-white border-[#8FC87A]'
                  : 'bg-[#EEF5E6] text-[#95A5A6] border-[#BDC3C7]'
              }`}>
                {isCompleted
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  : stepNum
                }
              </span>
              {step}
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-8 mx-1 ${isCompleted ? 'bg-[#8FC87A]' : 'bg-[#D5D8DC]'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
