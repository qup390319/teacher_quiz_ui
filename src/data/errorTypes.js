/**
 * 學生答錯方向三類型常數
 *
 * 用於 FollowUpDiagnosis.errorType（spec-04 §2.7.1 / spec-09 §12.4）。
 * 由 LLM 在追問結束時依學生對話判斷答錯的主導方向；若無法判讀回 null。
 *
 * 三類互斥、必填一項（或 null = 未分類）。
 */

export const ERROR_TYPES = ['EXPLANATION', 'DEFINITION', 'OBSERVATION'];

export const ERROR_TYPE_LABELS = {
  EXPLANATION: '解釋型',
  DEFINITION: '定義型',
  OBSERVATION: '觀察型',
};

/* 給 UI 解說用的一句話定義 */
export const ERROR_TYPE_DESCRIPTIONS = {
  EXPLANATION: '對現象的因果機制解釋錯誤；卡在「為什麼會這樣」',
  DEFINITION: '對科學名詞、概念分類或判準理解錯誤；卡在名詞定義',
  OBSERVATION: '對觀察到的現象或實驗結果描述、判讀失準',
};

/* spec-07 風格色票（教師/學生端共用） */
export const ERROR_TYPE_THEMES = {
  EXPLANATION: {
    bg: 'bg-[#E0F0E8]',
    border: 'border-[#A7D696]',
    text: 'text-[#3D5A3E]',
    bar: '#5BA47A',
    badge: 'bg-[#C8EAAE] border border-[#A7D696] text-[#3D5A3E]',
  },
  DEFINITION: {
    bg: 'bg-[#E0EBF5]',
    border: 'border-[#A3CCE9]',
    text: 'text-[#2E86C1]',
    bar: '#2E86C1',
    badge: 'bg-[#BADDF4] border border-[#A3CCE9] text-[#2E86C1]',
  },
  OBSERVATION: {
    bg: 'bg-[#FFF6E0]',
    border: 'border-[#F0CFA4]',
    text: 'text-[#B9770E]',
    bar: '#D4A244',
    badge: 'bg-[#FCF0C2] border border-[#F5D669] text-[#B9770E]',
  },
};

/* 未分類（null）的徽章樣式 */
export const ERROR_TYPE_UNCLASSIFIED_BADGE =
  'bg-[#EEF5E6] border border-[#D5D8DC] text-[#95A5A6]';

/**
 * 驗證 errorType 字串合法；非法或空回 null
 * @param {unknown} value
 * @returns {'EXPLANATION'|'DEFINITION'|'OBSERVATION'|null}
 */
export function normalizeErrorType(value) {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return ERROR_TYPES.includes(upper) ? upper : null;
}
