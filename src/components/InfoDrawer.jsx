import { useEffect } from 'react';

// ─── 各 section 的視覺樣式設定 ────────────────────────────────────────────────
const SECTION_STYLES = {
  calculation: {
    iconPath: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 6h16M4 10h16M4 14h16M4 18h16',
    label: '數據計算方式',
    bg: 'bg-[#EBF5FB]',
    border: 'border-[#AED6F1]',
    titleColor: 'text-[#1A5276]',
    iconColor: 'text-[#2E86C1]',
  },
  diagnosis: {
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    label: '數據診斷與教學導引',
    bg: 'bg-[#FEF9E7]',
    border: 'border-[#F9E79F]',
    titleColor: 'text-[#7D6608]',
    iconColor: 'text-[#D4AC0D]',
  },
  currentStatus: {
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    label: '目前狀況說明',
    bg: 'bg-[#EAFAF1]',
    border: 'border-[#A9DFBF]',
    titleColor: 'text-[#1E8449]',
    iconColor: 'text-[#27AE60]',
  },
  theory: {
    iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    label: '理論背景',
    bg: 'bg-[#F5EEF8]',
    border: 'border-[#D7BDE2]',
    titleColor: 'text-[#6C3483]',
    iconColor: 'text-[#8E44AD]',
  },
  references: {
    iconPath: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    label: '學術參考來源',
    bg: 'bg-[#F2F3F4]',
    border: 'border-[#CCD1D1]',
    titleColor: 'text-[#2C3E50]',
    iconColor: 'text-[#636E72]',
  },
};

// ─── 資料可信度徽章設定 ────────────────────────────────────────────────────────
const RELIABILITY_BADGES = {
  real: {
    label: '真實計算數據',
    bg: 'bg-[#C8EAAE]',
    text: 'text-[#3D5A3E]',
    border: 'border-[#8FC87A]',
    showWarning: false,
  },
  mock: {
    label: '展示用模擬數據',
    bg: 'bg-[#FAC8CC]',
    text: 'text-[#C0392B]',
    border: 'border-[#F5B8BA]',
    showWarning: true,
  },
  partial: {
    label: '部分計算數據',
    bg: 'bg-[#FCF0C2]',
    text: 'text-[#B7950B]',
    border: 'border-[#F5D669]',
    showWarning: false,
  },
  rule: {
    label: '規則式診斷引擎',
    bg: 'bg-[#BADDF4]',
    text: 'text-[#1A5276]',
    border: 'border-[#AED6F1]',
    showWarning: false,
  },
};

// ─── 渲染單一 section ─────────────────────────────────────────────────────────
function Section({ section, dynamicStatus }) {
  const style = SECTION_STYLES[section.type] ?? SECTION_STYLES.calculation;

  const content =
    section.type === 'currentStatus' && dynamicStatus
      ? dynamicStatus
      : section.content;

  if (section.type === 'references') {
    return (
      <div className={`rounded-2xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <svg
            className={`w-4 h-4 ${style.iconColor} flex-shrink-0`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={style.iconPath}
            />
          </svg>
          <p className={`text-xs font-bold ${style.titleColor} uppercase tracking-wide`}>
            {section.title || style.label}
          </p>
        </div>
        <ul className="space-y-2">
          {section.items.map((ref, i) => (
            <li
              key={i}
              className="text-xs text-[#636E72] leading-relaxed pl-3 border-l-2 border-[#BDC3C7]"
            >
              {ref}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <svg
          className={`w-4 h-4 ${style.iconColor} flex-shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={style.iconPath}
          />
        </svg>
        <p className={`text-xs font-bold ${style.titleColor} uppercase tracking-wide`}>
          {section.title || style.label}
        </p>
      </div>
      <p className="text-sm text-[#2D3436] leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}

// ─── 主元件 ───────────────────────────────────────────────────────────────────
// Props:
//   isOpen        {boolean}  - 是否顯示 drawer
//   onClose       {function} - 關閉 drawer 的 callback
//   config        {object}   - 來自 chartInfoConfig.js 的 card 說明設定
//   dynamicStatus {string}   - （選填）由元件動態產生的「目前狀況說明」文字，
//                              若提供則覆寫 config 中的 currentStatus section
export default function InfoDrawer({ isOpen, onClose, config, dynamicStatus }) {
  // Escape 鍵關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!config) return null;

  const reliability = RELIABILITY_BADGES[config.dataReliability] ?? RELIABILITY_BADGES.real;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer 面板 */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] md:w-[460px] max-w-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`${config.title} 數據說明`}
      >
        {/* Header */}
        <div className="bg-[#3D5A3E] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#C8EAAE] font-medium mb-1 uppercase tracking-wide">
                數據說明
              </p>
              <h2 className="text-base font-bold text-white leading-snug">{config.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center flex-shrink-0 transition-colors mt-0.5"
              aria-label="關閉說明面板"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 資料可信度徽章 */}
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${reliability.bg} ${reliability.text} ${reliability.border}`}
            >
              {reliability.showWarning && (
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {reliability.label}
            </span>
          </div>
        </div>

        {/* 可捲動內容區 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {config.sections.map((section) => (
            <Section
              key={section.type}
              section={section}
              dynamicStatus={dynamicStatus}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#D5D8DC] px-5 py-3 bg-[#F9FBF7] flex-shrink-0">
          <p className="text-xs text-[#95A5A6] leading-relaxed">
            此說明文件為研究型系統設計的一部分，旨在提升數據透明度與可詮釋性。
            如有疑問或修改建議，請與研究團隊討論。
          </p>
        </div>
      </div>
    </>
  );
}
