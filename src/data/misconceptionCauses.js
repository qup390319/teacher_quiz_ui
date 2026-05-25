export const CAUSE_CATEGORIES = [
  { id: 1, name: '學科知識不足或缺乏', color: 'blue' },
  { id: 2, name: '概念不清楚或混淆', color: 'pink' },
  { id: 3, name: '不正確的推論或運算過程', color: 'green' },
  { id: 4, name: '單憑個人直覺或關鍵字反應', color: 'yellow' },
  { id: 5, name: '來自日常的經驗和生活中的觀察', color: 'mint' },
  { id: 6, name: '日常生活用語與科學用語的混淆', color: 'purple' },
  { id: 7, name: '教師的教學過程不當', color: 'gray', conditional: true },
  { id: 8, name: '實驗操作不當', color: 'gray', conditional: true },
  { id: 9, name: '過度類推', color: 'orange' },
  { id: 10, name: '因果倒置', color: 'red' },
];

export const CAUSE_COLOR_THEMES = {
  blue:   { badge: 'bg-[#BADDF4] text-[#2E86C1]' },
  pink:   { badge: 'bg-[#FAC8CC] text-[#E74C5E]' },
  green:  { badge: 'bg-[#C8EAAE] text-[#3D5A3E]' },
  yellow: { badge: 'bg-[#FCF0C2] text-[#B7950B]' },
  mint:   { badge: 'bg-[#A8E6CF] text-[#1E8449]' },
  purple: { badge: 'bg-[#F3E5F5] text-[#7D3C98]' },
  orange: { badge: 'bg-[#FAD7A0] text-[#CA6F1E]' },
  red:    { badge: 'bg-[#FADBD8] text-[#C0392B]' },
  gray:   { badge: 'bg-[#E5E7EA] text-[#636E72]' },
};

export function getCauseById(id) {
  return CAUSE_CATEGORIES.find(c => c.id === id) ?? null;
}
