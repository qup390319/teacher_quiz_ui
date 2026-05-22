import { Link } from 'react-router-dom';

/**
 * EmptyStateGuide — 有教學意圖的空狀態頁
 *
 * 對應教授「未派題就讓老師看診斷結果會困惑」的回饋，
 * 用於：未啟用功能點進去時，告訴老師「接下來會看到什麼 + 該做哪一步」
 *
 * Props:
 *  - icon?: string                Material symbol 名稱（預設 'info'）
 *  - title: string                上方標題（簡短）
 *  - description: string          說明「為什麼這裡現在是空的」
 *  - preview?: string[]           bullet 列出「等資料齊全後這裡會看到什麼」
 *  - primaryAction?: { label, to } 主要 CTA（藍綠主色）— 通常是「跳回上一步」
 *  - secondaryAction?: { label, to | onClick } 次要 CTA（灰色框）— 通常是「先看示範資料」
 */
export default function EmptyStateGuide({
  icon = 'info',
  title,
  description,
  preview = [],
  primaryAction,
  secondaryAction,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E1E6E2] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-center max-w-2xl mx-auto my-8">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EEF5E6] mb-4">
        <span
          className="material-symbols-rounded text-[#5C8A2E]"
          style={{ fontSize: 32, fontVariationSettings: '"FILL" 1' }}
        >
          {icon}
        </span>
      </div>

      <h2 className="text-lg font-bold text-[#2D3436] mb-2">{title}</h2>
      <p className="text-sm text-[#636E72] leading-relaxed mb-5 whitespace-pre-line">{description}</p>

      {preview.length > 0 && (
        <div className="bg-[#F8FAF6] border border-[#E1E6E2] rounded-xl p-4 mb-5 text-left">
          <p className="text-sm font-bold text-[#5A6663] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-rounded text-[#8FC87A]" style={{ fontSize: 16 }}>visibility</span>
            完成後這裡會出現：
          </p>
          <ul className="space-y-1">
            {preview.map((line, i) => (
              <li key={i} className="text-sm text-[#2D3436] flex items-start gap-2">
                <span className="material-symbols-rounded text-[#8FC87A] mt-0.5 flex-shrink-0" style={{ fontSize: 14 }}>check_circle</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {primaryAction && (
          <Link
            to={primaryAction.to}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6FB55C] text-white text-sm font-semibold hover:bg-[#5C8A2E] transition-colors shadow-[0_2px_6px_rgba(111,181,92,0.35)]"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_forward</span>
            {primaryAction.label}
          </Link>
        )}
        {secondaryAction && (secondaryAction.to ? (
          <Link
            to={secondaryAction.to}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#5A6663] text-sm font-semibold border border-[#C8D6C9] hover:bg-[#F1F6EE] transition-colors"
          >
            {secondaryAction.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#5A6663] text-sm font-semibold border border-[#C8D6C9] hover:bg-[#F1F6EE] transition-colors"
          >
            {secondaryAction.label}
          </button>
        ))}
      </div>
    </div>
  );
}
