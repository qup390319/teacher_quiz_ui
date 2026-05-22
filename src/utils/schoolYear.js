/**
 * 學年度 / 學期工具（前後端共用規則，後端見 backend/app/utils/school_year.py）。
 * spec-04 §2.3 / spec-05 §1.5.1：
 *   8/1 – 1/31  → 該年（或前一年）上學期
 *   2/1 – 7/31  → 前一年下學期
 * 114 學年度 == schoolYear 2025（即 2025-08-01 ~ 2026-07-31）。
 */

/** @param {Date} [date] 預設為今日 */
export function getCurrentSchoolYear(date = new Date()) {
  const month = date.getMonth() + 1; // 1–12
  if (month >= 8) return date.getFullYear();
  return date.getFullYear() - 1; // month <= 7
}

/** @returns {'first' | 'second'} */
export function getCurrentSemester(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 8 || month <= 1) return 'first';
  return 'second';
}

/** 西元年 2025 → "114 學年度" */
export function formatSchoolYearLabel(schoolYear) {
  return `${schoolYear - 1911} 學年度`;
}

/** 'first' → '上學期'，'second' → '下學期' */
export function formatSemesterLabel(semester) {
  return semester === 'first' ? '上學期' : '下學期';
}

/**
 * 回傳一組可選擇的學年度列表（含當前 + 過去 N 年），用於下拉選單。
 * @param {number} pastYears 預設 5 年
 */
export function getSchoolYearOptions(pastYears = 5) {
  const current = getCurrentSchoolYear();
  const list = [];
  for (let i = 0; i <= pastYears; i += 1) {
    list.push(current - i);
  }
  return list;
}
