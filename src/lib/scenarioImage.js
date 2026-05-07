/**
 * 後端 scenarios.json 把情境圖檔記成純檔名（例：「2-1-2-sugar-saturation-chart.png」），
 * 但實際檔案放在 src/assets/scenarios/ 下，dev / build 時都需要 Vite 將它打包成
 * 帶 hash 的 asset URL。本模組透過 import.meta.glob 預先載入所有檔案，
 * 讓元件用檔名查表拿到正確 URL。
 */
const IMAGE_MAP = (() => {
  const modules = import.meta.glob(
    '../assets/scenarios/*.{png,jpg,jpeg,gif,webp,svg}',
    { eager: true, import: 'default' },
  );
  const out = new Map();
  for (const [path, url] of Object.entries(modules)) {
    const filename = path.split('/').pop();
    if (filename) out.set(filename, url);
  }
  return out;
})();

/** 把後端傳來的檔名（或可能已經是完整 URL）解析成可用的 src。 */
export function resolveScenarioImage(src) {
  if (!src) return src;
  // 已經是完整 URL（http、data、blob、絕對路徑）就直接回傳
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src;
  return IMAGE_MAP.get(src) ?? src;
}
