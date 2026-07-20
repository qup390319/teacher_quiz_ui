// 迷思概念成因分類（共 9 類，互斥）。對照 docs/spec-09 與來源文件
// 「迷思概念成因分類.md」。第 8、9 類為「情境條件成因」（conditional），
// 僅在學生於對話中明確提及來源（老師/課本）或描述錯誤操作時才歸類。
//
// `name` 為學術用語（依代表文獻原始術語命名，符合論文撰寫慣例）。
// 每條成因另附 `studentMeaning`（用兒童語說明「為什麼會這樣想」，第二人稱、不指責）
// 與 `studentTip`（知道原因後「下一步可以怎麼做」的具體行動）；學生端報告用這兩欄，
// 把「可能的原因」從一個冷標籤變成有理由、有回饋的學習引導。
export const CAUSE_CATEGORIES = [
  {
    id: 1, name: '概念缺失', color: 'blue',
    studentMeaning: '這個你可能還沒學過，所以有點空白、想不出來。',
    studentTip: '把這一課再看一次，或問問老師，就會懂了！',
  },
  {
    id: 2, name: '概念混淆', color: 'pink',
    studentMeaning: '有兩個很像的東西，你可能不小心當成同一個了。',
    studentTip: '兩個各想一個例子，就分得出來了。',
  },
  {
    id: 3, name: '日常經驗的直觀建構', color: 'mint',
    studentMeaning: '你用平常生活看到的事來想，但科學有時候不一樣喔。',
    studentTip: '自己動手做做看，看結果跟你想的一不一樣。',
  },
  {
    id: 4, name: '日常語言的字面干擾', color: 'purple',
    studentMeaning: '同一個字，平常的意思跟自然課的意思可能不一樣。',
    studentTip: '問問看這個字在自然課是什麼意思。',
  },
  {
    id: 5, name: '直覺反應', color: 'yellow',
    studentMeaning: '你可能是靠感覺，或看到認識的字就選了。',
    studentTip: '選之前，先想一個例子試試看對不對。',
  },
  {
    id: 6, name: '推理謬誤（含因果倒置）', color: 'green',
    studentMeaning: '你有自己的想法，但中間想歪了一點點，或把前後順序弄反了。',
    studentTip: '一步一步慢慢想，看看是哪一個先發生的。',
  },
  {
    id: 7, name: '過度類推', color: 'orange',
    studentMeaning: '你把一件事的規則，用到了不一定行的地方。',
    studentTip: '想想看：換個情況，這樣還對嗎？',
  },
  {
    id: 8, name: '教學與教材因素', color: 'gray', conditional: true,
    studentMeaning: '可能是上課或課本講的，讓你這樣記住了。',
    studentTip: '不懂就問老師，問到懂為止！',
  },
  {
    id: 9, name: '實驗操作不當', color: 'gray', conditional: true,
    studentMeaning: '做實驗的時候，可能有一步不小心做錯了。',
    studentTip: '下次照順序慢慢做，每一步看仔細。',
  },
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
