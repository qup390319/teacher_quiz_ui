import { useEffect } from 'react';

/* 圖片放大檢視（spec-08 §6 / spec-07 §12）
 * 用於情境敘述頁與對話中的查看情境面板。
 * 點背景或 Esc 關閉。 */
export default function ScenarioImageLightbox({ src, alt = '放大圖', onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="放大圖片"
    >
      <div
        className="relative flex max-h-full max-w-5xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute right-3 top-3 z-10 rounded-full bg-[#FFF8E7] border-2 border-[#8B5E3C]
                     text-[#5A3E22] px-3 py-1 text-sm font-bold
                     shadow-[0_2px_0_-1px_#5A3E22]
                     hover:scale-110 transition-transform duration-200"
        >
          關閉
        </button>
        <img
          src={src}
          alt={alt}
          className="max-h-[88vh] w-auto max-w-full rounded-2xl border-2 border-[#C19A6B] bg-white shadow-2xl"
        />
      </div>
    </div>
  );
}
