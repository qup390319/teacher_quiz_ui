/**
 * 網站主題色彩常數（Pastel & Soft Aesthetic）
 * 主綠 #A7D696，搭配柔藍/柔粉/柔黃輔助色票。
 *
 * 語意色彩分層：
 *   primary  — 品牌/主題：主綠 #A7D696
 *   blue     — 正確/成功/學生端：柔藍 #D6EAF8 / #5DADE2
 *   yellow   — 教學建議/提示：柔黃 #FEF9E7 / #D4AC0D
 *   pink     — 迷思/警示：柔粉 #FDE2E4 / #E74C5E
 *   red      — 錯誤/刪除：柔粉紅語意色
 */

export const PRIMARY = {
  50:  '#F7FAF2',
  100: '#EDF6E3',
  200: '#E2F4D8',
  300: '#C4E5AA',
  400: '#A7D696',
  500: '#8FC87A',
  600: '#5A8A5C',
  700: '#3D5A3E',
  800: '#2D3436',
  900: '#1E2420',
};

/**
 * 知識節點視覺群組色彩（Pastel 版）
 */
export const NODE_GROUP_COLORS = {
  1:  { bg: 'bg-[#D6EAF8]', border: 'border-[#5DADE2]', badge: 'bg-[#D6EAF8] text-[#2E86C1] border-[#A9CCE3]', dot: 'bg-[#5DADE2]', accent: 'text-[#2E86C1]', bar: 'bg-[#5DADE2]' },
  2:  { bg: 'bg-[#FDE2E4]', border: 'border-[#F28B95]', badge: 'bg-[#FDE2E4] text-[#E74C5E] border-[#F5B8BA]', dot: 'bg-[#F28B95]', accent: 'text-[#E74C5E]', bar: 'bg-[#F28B95]' },
  3:  { bg: 'bg-[#E2F4D8]', border: 'border-[#A7D696]', badge: 'bg-[#E2F4D8] text-[#3D5A3E] border-[#C4E5AA]', dot: 'bg-[#A7D696]', accent: 'text-[#3D5A3E]', bar: 'bg-[#A7D696]' },
  4:  { bg: 'bg-[#FEF9E7]', border: 'border-[#F4D03F]', badge: 'bg-[#FEF9E7] text-[#B7950B] border-[#F7DC6F]', dot: 'bg-[#F4D03F]', accent: 'text-[#B7950B]', bar: 'bg-[#F4D03F]' },
  5:  { bg: 'bg-[#F3E5F5]', border: 'border-[#AF7AC5]', badge: 'bg-[#F3E5F5] text-[#7D3C98] border-[#D2B4DE]', dot: 'bg-[#AF7AC5]', accent: 'text-[#7D3C98]', bar: 'bg-[#AF7AC5]' },
  6:  { bg: 'bg-[#FDEBD0]', border: 'border-[#F5B041]', badge: 'bg-[#FDEBD0] text-[#B9770E] border-[#F8C471]', dot: 'bg-[#F5B041]', accent: 'text-[#B9770E]', bar: 'bg-[#F5B041]' },
  7:  { bg: 'bg-[#D1F2EB]', border: 'border-[#48C9B0]', badge: 'bg-[#D1F2EB] text-[#117864] border-[#7DCEA0]', dot: 'bg-[#48C9B0]', accent: 'text-[#117864]', bar: 'bg-[#48C9B0]' },
  8:  { bg: 'bg-[#FADBD8]', border: 'border-[#E59866]', badge: 'bg-[#FADBD8] text-[#A04000] border-[#EDBB99]', dot: 'bg-[#E59866]', accent: 'text-[#A04000]', bar: 'bg-[#E59866]' },
  9:  { bg: 'bg-[#D6DBDF]', border: 'border-[#85929E]', badge: 'bg-[#D6DBDF] text-[#34495E] border-[#AEB6BF]', dot: 'bg-[#85929E]', accent: 'text-[#34495E]', bar: 'bg-[#85929E]' },
  10: { bg: 'bg-[#E8DAEF]', border: 'border-[#A569BD]', badge: 'bg-[#E8DAEF] text-[#6C3483] border-[#BB8FCE]', dot: 'bg-[#A569BD]', accent: 'text-[#6C3483]', bar: 'bg-[#A569BD]' },
  11: { bg: 'bg-[#FCF3CF]', border: 'border-[#D4AC0D]', badge: 'bg-[#FCF3CF] text-[#7D6608] border-[#F1C40F]', dot: 'bg-[#D4AC0D]', accent: 'text-[#7D6608]', bar: 'bg-[#D4AC0D]' },
  12: { bg: 'bg-[#D4EFDF]', border: 'border-[#52BE80]', badge: 'bg-[#D4EFDF] text-[#1E8449] border-[#82E0AA]', dot: 'bg-[#52BE80]', accent: 'text-[#1E8449]', bar: 'bg-[#52BE80]' },
};

/**
 * 知識節點 ID → 色彩群組對應
 * 子主題 A（溶解）：INe-II-3-01 ~ 05 → 1~5
 * 子主題 B（酸鹼）：INe-Ⅲ-5-1 ~ 7 → 6~12
 */
const NODE_ID_TO_GROUP = {
  'INe-II-3-01': 1, 'INe-II-3-02': 2, 'INe-II-3-03': 3, 'INe-II-3-04': 4, 'INe-II-3-05': 5,
  'INe-Ⅲ-5-1':  6, 'INe-Ⅲ-5-2':  7, 'INe-Ⅲ-5-3':  8, 'INe-Ⅲ-5-4':  9,
  'INe-Ⅲ-5-5': 10, 'INe-Ⅲ-5-6': 11, 'INe-Ⅲ-5-7': 12,
};

export function getNodeColor(nodeId) {
  const group = NODE_ID_TO_GROUP[nodeId] ?? 1;
  return NODE_GROUP_COLORS[group];
}

/**
 * 知識路徑技能樹色票（深木紋夜晚地圖風 / Mockup J-1）
 * - A 子主題（溶解）：綠色系階段漸層（5 階段，由淺入深）
 * - B 子主題（酸鹼）：暖橘系階段漸層（6 階段，由淺入深）
 * - 同色系內由淺入深 = 學習進度感
 * - 不同色系（綠 vs 橘） = 子主題區分
 */
export const SKILL_TREE_A_GREEN = {
  fill:   ['#C4E5AA', '#A7D696', '#8FC87A', '#7DB044', '#5C8A2E'],
  stroke: ['#A7D696', '#8FC87A', '#7DB044', '#5C8A2E', '#3D5A3E'],
};

export const SKILL_TREE_B_AMBER = {
  fill:   ['#F8DCAE', '#F0B962', '#E8A042', '#D08B2E', '#B9770E', '#9B5E18'],
  stroke: ['#F0B962', '#E8A042', '#D08B2E', '#B9770E', '#9B5E18', '#7A3F0D'],
};

export const SKILL_TREE_DARK = {
  bgGradient: 'radial-gradient(ellipse at center, #5A3E22 0%, #2E1F10 100%)',
  border: '#8B5E3C',
  connector: '#C19A6B',
  guide: '#7A5232',
  gold: '#FFF3B0',
  goldStroke: '#F4C545',
  labelA: '#A7D696',
  labelB: '#F0B962',
  text: '#FBE9C7',
  textMuted: '#C19A6B',
};
