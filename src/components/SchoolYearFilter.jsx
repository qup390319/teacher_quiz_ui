/**
 * 學年度 / 學期 / 已封存班級篩選器。
 *
 * 對應 spec-02 §2.3.0 DashboardLayout / spec-05 §1.5（班級管理頁亦使用）。
 * 狀態存於 AppContext（currentSchoolYear / currentSemester / includeArchivedClasses），
 * persist 到 localStorage，跨頁共用同一份選擇。
 *
 * 設計（2026-05-28 精簡）：
 * - 每個 chip 內部移除中文標籤（「學年度」「學期」），因為 select option 本身已包含完整字
 *   （例：「114 學年度」「上學期」），label 變成視覺冗餘
 * - 「顯示已封存班級」label 縮成「含封存」減少寬度
 * - 三個 chip 視覺一致（皆白底 + 灰邊），不混雜不同主題色
 */
import { useApp } from '../context/AppContext';
import {
  formatSchoolYearLabel,
  formatSemesterLabel,
  getSchoolYearOptions,
} from '../utils/schoolYear';

const CHIP =
  'inline-flex items-center gap-1.5 bg-white border border-[#C8D6C9] rounded-2xl pl-2.5 pr-1.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]';

const SELECT =
  'appearance-none bg-transparent rounded-lg pl-1 pr-6 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer';

const CARET_SVG = (
  <svg
    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#636E72] pointer-events-none"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function SchoolYearFilter({ className = '' }) {
  const {
    currentSchoolYear, setCurrentSchoolYear,
    currentSemester, setCurrentSemester,
    includeArchivedClasses, setIncludeArchivedClasses,
  } = useApp();

  const yearOptions = getSchoolYearOptions(5);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* 學年度 — icon-only label */}
      <div className={CHIP} title="學年度">
        <span className="material-symbols-rounded text-[#3D5A3E] flex-shrink-0" style={{ fontSize: 18 }}>
          school
        </span>
        <div className="relative">
          <select
            value={currentSchoolYear}
            onChange={(e) => setCurrentSchoolYear(parseInt(e.target.value, 10))}
            className={SELECT}
            aria-label="選擇學年度"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{formatSchoolYearLabel(y)}</option>
            ))}
          </select>
          {CARET_SVG}
        </div>
      </div>

      {/* 學期 — icon-only label */}
      <div className={CHIP} title="學期">
        <span className="material-symbols-rounded text-[#3D5A3E] flex-shrink-0" style={{ fontSize: 18 }}>
          calendar_month
        </span>
        <div className="relative">
          <select
            value={currentSemester}
            onChange={(e) => setCurrentSemester(e.target.value)}
            className={SELECT}
            aria-label="選擇學期"
          >
            <option value="first">{formatSemesterLabel('first')}</option>
            <option value="second">{formatSemesterLabel('second')}</option>
          </select>
          {CARET_SVG}
        </div>
      </div>

      {/* 含封存 — 縮短文字 + 變成 toggle 樣式 */}
      <label
        className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 cursor-pointer transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
          includeArchivedClasses
            ? 'bg-[#EEF5E6] border-[#8FC87A] text-[#3D5A3E]'
            : 'bg-white border-[#C8D6C9] text-[#5A6663] hover:bg-[#F1F6EE]'
        }`}
        title="顯示已封存的歷史班級"
      >
        <input
          type="checkbox"
          checked={includeArchivedClasses}
          onChange={(e) => setIncludeArchivedClasses(e.target.checked)}
          className="w-4 h-4 accent-[#6FB55C] cursor-pointer"
        />
        <span className="material-symbols-rounded flex-shrink-0" style={{ fontSize: 16 }}>
          inventory_2
        </span>
        <span className="text-sm font-semibold">含封存</span>
      </label>
    </div>
  );
}
