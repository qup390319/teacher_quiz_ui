// 每條成因附 `studentMeaning`（用兒童語說明「為什麼會這樣想」，第二人稱、不指責）
// 與 `studentTip`（知道原因後「下一步可以怎麼做」的具體行動）。
// 學生端報告用這兩欄，把「可能的原因」從一個冷標籤變成有理由、有回饋的學習引導；
// 教師端只用 `name`。
export const CAUSE_CATEGORIES = [
  {
    id: 1, name: '學科知識不足或缺乏', color: 'blue',
    studentMeaning: '這個可能還沒學熟，所以你有點不確定。',
    studentTip: '把這一課再看一次，就會懂了！',
  },
  {
    id: 2, name: '概念不清楚或混淆', color: 'pink',
    studentMeaning: '有兩個很像的東西，你可能不小心搞混了。',
    studentTip: '兩個各想一個例子，就分得出來了。',
  },
  {
    id: 3, name: '不正確的推論或運算過程', color: 'green',
    studentMeaning: '你有自己的想法，但中間想歪了一點點。',
    studentTip: '一步一步慢慢想，看看哪裡卡住了。',
  },
  {
    id: 4, name: '單憑個人直覺或關鍵字反應', color: 'yellow',
    studentMeaning: '你可能是靠感覺，或看到認識的字就選了。',
    studentTip: '選之前，先想一個例子試試看對不對。',
  },
  {
    id: 5, name: '來自日常的經驗和生活中的觀察', color: 'mint',
    studentMeaning: '你用平常看到的事來想，但科學有時候不一樣喔。',
    studentTip: '自己動手做做看，看結果跟你想的一不一樣。',
  },
  {
    id: 6, name: '日常生活用語與科學用語的混淆', color: 'purple',
    studentMeaning: '同一個字，平常的意思跟上課的意思可能不一樣。',
    studentTip: '問問看這個字在自然課是什麼意思。',
  },
  {
    id: 7, name: '教師的教學過程不當', color: 'gray', conditional: true,
    studentMeaning: '這裡上課的時候，可能還沒講得很清楚。',
    studentTip: '不懂就問老師，問到懂為止！',
  },
  {
    id: 8, name: '實驗操作不當', color: 'gray', conditional: true,
    studentMeaning: '做實驗的時候，可能有一步不小心做錯了。',
    studentTip: '下次照順序慢慢做，每一步看仔細。',
  },
  {
    id: 9, name: '過度類推', color: 'orange',
    studentMeaning: '你把一件事的規則，用到了不一定行的地方。',
    studentTip: '想想看：換個情況，這樣還對嗎？',
  },
  {
    id: 10, name: '因果倒置', color: 'red',
    studentMeaning: '你可能把「哪個先、哪個後」想反了。',
    studentTip: '再想一次：是哪一個先發生的？',
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
