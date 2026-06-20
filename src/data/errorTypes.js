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

/* 給 UI 解說用的一句話定義（教師端用：診斷報告 hover、總覽頁說明，保留專業措辭） */
export const ERROR_TYPE_DESCRIPTIONS = {
  EXPLANATION: '對現象的因果機制解釋錯誤；卡在「為什麼會這樣」',
  DEFINITION: '對科學名詞、概念分類或判準理解錯誤；卡在名詞定義',
  OBSERVATION: '對觀察到的現象或實驗結果描述、判讀失準',
};

/* 學生端專用：點擊分類章後彈窗顯示的「白話解釋」（解釋這個分類詞是什麼意思，
 * 平板友善——靠點擊而非 hover）。與教師用的 ERROR_TYPE_DESCRIPTIONS 分開，
 * 避免改一邊弄壞另一邊。第二人稱、溫和、不指責。 */
export const ERROR_TYPE_STUDENT_EXPLAIN = {
  EXPLANATION: '你知道發生了什麼事，但「為什麼會這樣」的想法，跟科學家想的有一點不一樣。',
  DEFINITION: '這個自然課的詞，它真正的意思，跟你本來以為的有一點點不一樣喔。',
  OBSERVATION: '你看到的沒有錯！只是「光用看的、嚐的」來下結論，有時候會被騙。',
};

/* 學生端專用：依錯誤類型「直接顯示在卡片上」的回饋（不是藏在彈窗裡）。
 * heading 取代藍框原本固定的「科學上是這樣的」，icon 為 Material Symbols 名稱，
 * guidance 為一句通用提醒（非逐節點），接在該節點正確說法（node.studentHint）之後。 */
export const ERROR_TYPE_FEEDBACK = {
  EXPLANATION: {
    heading: '為什麼會這樣',
    icon: 'auto_stories',
    guidance: '試著想想看：這件事真正的原因，是不是跟你原本想的不一樣？',
  },
  DEFINITION: {
    heading: '正確的意思是這樣',
    icon: 'menu_book',
    guidance: '記住這個詞在自然課真正的意思，下次就不會搞混了。',
  },
  OBSERVATION: {
    heading: '觀察的小提醒',
    icon: 'visibility',
    guidance: '光用看的、嚐的、聞的容易被騙，要用對的方法或工具來確認才準喔。',
  },
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
