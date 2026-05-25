// 三種「問題類型」分類 — 用於描述學生在迷思診斷對話中暴露出的核心困難層次。
//
// 與 misconceptionCauses（成因類型）的關係：
//   - 成因類型回答「為什麼學生會這樣想」（共 10 類）
//   - 問題類型回答「學生卡在哪個認知層次」（共 3 類）
// 兩者是雙軸：同一條迷思可同時歸成因類型 #5（日常經驗）+ 問題類型 observation。

export const PROBLEM_TYPES = [
  {
    id: 'observation',
    label: '觀察型問題',
    shortLabel: '觀察型',
    icon: 'visibility',
    color: 'blue',
    description: '學生在「看到什麼、怎麼測量、怎麼描述現象與數據」上出現困難或偏差。',
    coreJudgment: '核心困難是「看到／量到／描述什麼」本身就不正確。',
    diagnosticCriteria: [
      '描述現象錯誤（看錯、記錯、忽略整體趨勢）',
      '解讀數據或圖表錯誤（如把上升看成下降）',
      '把主觀感覺當成客觀觀察',
      '忽略重要觀察條件（刻度、時間、距離等）',
      '紀錄不精確、不一致，導致後續推論錯誤',
    ],
    followUpFocus: '追問聚焦於「你是怎麼觀察到的？」「你看到了什麼？」引導學生重新檢視自己的觀察過程。',
    teachingDirection: '安排實際觀察或測量活動，讓學生練習科學記錄方法。',
  },
  {
    id: 'definition',
    label: '定義型問題',
    shortLabel: '定義型',
    icon: 'menu_book',
    color: 'yellow',
    description: '學生在「科學名詞的意義、概念的範圍與分類」上出現混淆。',
    coreJudgment: '核心困難是「名詞定義、概念的分類與邊界」。',
    diagnosticCriteria: [
      '將日常語言意義套用到科學名詞',
      '混淆兩個概念（如熱 vs 溫度、溶解 vs 融化）',
      '概念邊界錯誤，定義過窄或過寬',
      '分類錯誤源自概念誤解，而非觀察錯誤',
    ],
    followUpFocus: '追問聚焦於「你覺得○○是什麼意思？」「○○和△△有什麼不同？」引導學生釐清自己對名詞的理解。',
    teachingDirection: '製作概念比較表，用對比方式釐清易混淆的名詞定義。',
  },
  {
    id: 'explanation',
    label: '解釋型問題',
    shortLabel: '解釋型',
    icon: 'settings',
    color: 'pink',
    description: '學生在「為什麼會這樣、背後機制是什麼」的因果推論上出現偏差。',
    coreJudgment: '核心困難在於「原因、機制、條件影響」。',
    diagnosticCriteria: [
      '觀察與名詞使用大致正確，但解釋原因錯誤',
      '把相關性當因果',
      '使用目的論、擬人化方式解釋',
      '多因素情況只抓單一錯誤因素',
    ],
    followUpFocus: '追問聚焦於「為什麼你覺得是這個原因？」「還有沒有其他可能的解釋？」引導學生檢視自己的因果推論。',
    teachingDirection: '設計控制變因實驗，讓學生練習「改變一個條件、觀察結果」的科學思維。',
  },
];

// 共用色票（與 misconceptionCauses 的 CAUSE_COLOR_THEMES 取相同色名以便視覺一致）。
export const PROBLEM_TYPE_COLOR_THEMES = {
  blue:   { badge: 'bg-[#BADDF4] text-[#2E86C1]', accent: 'bg-[#BADDF4]' },
  yellow: { badge: 'bg-[#FCF0C2] text-[#B7950B]', accent: 'bg-[#FCF0C2]' },
  pink:   { badge: 'bg-[#FAC8CC] text-[#E74C5E]', accent: 'bg-[#FAC8CC]' },
};

export function getProblemTypeById(id) {
  return PROBLEM_TYPES.find((p) => p.id === id) ?? null;
}
