import { useState } from 'react';

export default function PreviewQuizModal({ questions, onClose }) {
  const [previewStep, setPreviewStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const currentQ = questions[previewStep];

  const handleSelect = (opt) => {
    setSelected(opt);
    setTimeout(() => {
      setSelected(null);
      if (previewStep < questions.length - 1) setPreviewStep((p) => p + 1);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D5D8DC]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#8FC87A] rounded-full"></div>
            <span className="text-sm font-semibold text-[#2D3436]">學生端預覽模式</span>
          </div>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 bg-[#EEF5E6] min-h-[400px] rounded-b-[32px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[#95A5A6]">題目 {previewStep + 1}/{questions.length}</span>
            <div className="flex-1 bg-[#D5D8DC] rounded-full h-1.5">
              <div className="bg-[#8FC87A] h-1.5 rounded-full transition-all" style={{ width: `${((previewStep) / questions.length) * 100}%` }}></div>
            </div>
          </div>
          {previewStep < questions.length ? (
            <>
              <div className="bg-white border border-[#BDC3C7] rounded-2xl p-4 mb-4 chat-bubble-in shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="text-sm text-[#636E72] mb-1">🤖 科學偵探系統</p>
                <p className="text-sm text-[#2D3436] leading-relaxed">{currentQ.stem}</p>
              </div>
              <div className="space-y-2">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.tag}
                    onClick={() => !selected && handleSelect(opt)}
                    className={`w-full text-left p-3 rounded-2xl text-sm transition-all border ${selected?.tag === opt.tag
                        ? opt.diagnosis === 'CORRECT'
                          ? 'bg-[#C8EAAE] border-[#8FC87A] text-[#3D5A3E]'
                          : 'bg-[#FAC8CC] border-[#F28B95] text-[#E74C5E]'
                        : 'bg-white border-[#BDC3C7] hover:bg-[#EEF5E6] text-[#2D3436]'
                      }`}
                  >
                    {opt.content}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-[#2D3436] mb-1">作答完成！</p>
              <p className="text-sm text-[#636E72]">學生將看到個人診斷書</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
