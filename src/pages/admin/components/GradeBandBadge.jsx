/* eslint-disable react-refresh/only-export-components -- 同檔內合併 detector 與 badge component，方便共用 */

/**
 * 依節點 code 顯示年段徽章：
 *   -II- 或 -Ⅱ- → 中年級（黃）
 *   -III- 或 -Ⅲ- → 高年級（藍）
 *   其他 → 不顯示（回傳 null）
 *
 * 對應使用者要求：merge 所有年段後，每個節點靠 code 區分中/高年級。
 */
export function detectGradeFromCode(code = '') {
  // 注意：先檢查 III 才 II，因為 III 字串包含 II
  if (/-Ⅲ-|-III-/.test(code)) return 'upper';
  if (/-Ⅱ-|-II-/.test(code)) return 'middle';
  return null;
}

const LABEL = {
  middle: '中年級',
  upper:  '高年級',
};

const CLS = {
  middle: 'bg-[#FEF3C7] text-[#B45309]',
  upper:  'bg-[#DBEAFE] text-[#1E40AF]',
};

export default function GradeBandBadge({ code, className = '' }) {
  const g = detectGradeFromCode(code);
  if (!g) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CLS[g]} ${className}`}
      title={`課綱代碼 ${g === 'middle' ? '含 II' : '含 III'}`}
    >
      {LABEL[g]}
    </span>
  );
}
