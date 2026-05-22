/**
 * 學年度 / 學期 / 已封存班級篩選器。
 *
 * 對應 spec-02 §2.3.0 DashboardLayout / spec-05 §1.5（班級管理頁亦使用）。
 * 狀態存於 AppContext（currentSchoolYear / currentSemester / includeArchivedClasses），
 * persist 到 localStorage，跨頁共用同一份選擇。
 */
import { useApp } from '../context/AppContext';
import {
  formatSchoolYearLabel,
  formatSemesterLabel,
  getSchoolYearOptions,
} from '../utils/schoolYear';

export default function SchoolYearFilter({ className = '' }) {
  const {
    currentSchoolYear, setCurrentSchoolYear,
    currentSemester, setCurrentSemester,
    includeArchivedClasses, setIncludeArchivedClasses,
  } = useApp();

  const yearOptions = getSchoolYearOptions(5);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* 學年度 */}
      <div className="inline-flex items-center gap-2 bg-white border border-[#C8D6C9] rounded-2xl pl-3 pr-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <span className="material-symbols-rounded text-[#3D5A3E]" style={{ fontSize: 18 }}>school</span>
        <span className="text-sm font-bold text-[#3D5A3E] whitespace-nowrap">學年度</span>
        <div className="relative">
          <select
            value={currentSchoolYear}
            onChange={(e) => setCurrentSchoolYear(parseInt(e.target.value, 10))}
            className="appearance-none bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg pl-2.5 pr-7 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{formatSchoolYearLabel(y)}</option>
            ))}
          </select>
          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 學期 */}
      <div className="inline-flex items-center gap-2 bg-white border border-[#C8D6C9] rounded-2xl pl-3 pr-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <span className="text-sm font-bold text-[#3D5A3E] whitespace-nowrap">學期</span>
        <div className="relative">
          <select
            value={currentSemester}
            onChange={(e) => setCurrentSemester(e.target.value)}
            className="appearance-none bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg pl-2.5 pr-7 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer"
          >
            <option value="first">{formatSemesterLabel('first')}</option>
            <option value="second">{formatSemesterLabel('second')}</option>
          </select>
          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 包含已封存班級 */}
      <label
        className="inline-flex items-center gap-2 bg-white border border-[#C8D6C9] rounded-2xl px-3 py-1.5 cursor-pointer hover:bg-[#F1F6EE] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        title="顯示已封存的歷史班級"
      >
        <input
          type="checkbox"
          checked={includeArchivedClasses}
          onChange={(e) => setIncludeArchivedClasses(e.target.checked)}
          className="w-4 h-4 accent-[#6FB55C] cursor-pointer"
        />
        <span className="material-symbols-rounded text-[#636E72]" style={{ fontSize: 16 }}>inventory_2</span>
        <span className="text-sm font-semibold text-[#2D3436]">顯示已封存班級</span>
      </label>
    </div>
  );
}
