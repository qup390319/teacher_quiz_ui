const STORAGE_KEY = 'scilens-font-size';

export const FONT_SIZE_OPTIONS = [
  { value: 'small',  label: '小', px: 14 },
  { value: 'medium', label: '中', px: 16 },
  { value: 'large',  label: '大', px: 18 },
];

export function getFontSize() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (FONT_SIZE_OPTIONS.some((o) => o.value === v)) return v;
  } catch { /* ignore */ }
  return 'medium';
}

export function applyFontSize(value = getFontSize()) {
  const opt = FONT_SIZE_OPTIONS.find((o) => o.value === value) ?? FONT_SIZE_OPTIONS[1];
  document.documentElement.style.fontSize = `${opt.px}px`;
}

export function setFontSize(value) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  applyFontSize(value);
}
