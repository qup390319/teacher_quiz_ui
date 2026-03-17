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
  1: { bg: 'bg-[#D6EAF8]', border: 'border-[#D5D8DC]', badge: 'bg-[#D6EAF8] text-[#2E86C1]',  dot: 'bg-[#5DADE2]', accent: 'text-[#2E86C1]'  },
  2: { bg: 'bg-[#FDE2E4]', border: 'border-[#D5D8DC]', badge: 'bg-[#FDE2E4] text-[#E74C5E]',  dot: 'bg-[#F28B95]', accent: 'text-[#E74C5E]'  },
  3: { bg: 'bg-[#E2F4D8]', border: 'border-[#D5D8DC]', badge: 'bg-[#E2F4D8] text-[#3D5A3E]',  dot: 'bg-[#A7D696]', accent: 'text-[#3D5A3E]'  },
  4: { bg: 'bg-[#FEF9E7]', border: 'border-[#D5D8DC]', badge: 'bg-[#FEF9E7] text-[#B7950B]',  dot: 'bg-[#F4D03F]', accent: 'text-[#B7950B]'  },
  5: { bg: 'bg-[#F3E5F5]', border: 'border-[#D5D8DC]', badge: 'bg-[#F3E5F5] text-[#7D3C98]',  dot: 'bg-[#AF7AC5]', accent: 'text-[#7D3C98]'  },
};
