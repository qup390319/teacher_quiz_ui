import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';

const CAUSE_CATEGORIES = [
  {
    id: 1,
    name: '學科知識不足或缺乏',
    feature: '完全不知道相關概念，或顯示出非常基礎的前置概念也不具備。',
    sample: '被問到「糖溶進水裡之後跑去哪了？」直接回答「不知道」、「消失了吧」，看起來沒學過溶解的概念。',
    color: 'blue',
  },
  {
    id: 2,
    name: '概念不清楚或混淆',
    feature: '有一些相關概念，但用法錯亂、把兩個不同概念當成同一個。',
    sample: '把「溶解」當成「融化」（覺得糖溶在水裡跟冰塊融化是同一回事），或分不清「溶質」和「溶劑」哪一個比較多。',
    color: 'pink',
  },
  {
    id: 3,
    name: '不正確的推論或運算過程',
    feature: '基本概念大致有，但在推理步驟或計算過程出了錯。',
    sample: '「糖看不見了 → 一定是蒸發到空氣中」、「加熱可以多溶一點糖 → 所以一杯水可以無限溶解」這類推論錯誤。',
    color: 'green',
  },
  {
    id: 4,
    name: '單憑個人直覺或關鍵字反應',
    feature: '幾乎沒有解釋，只憑感覺或題目裡的關鍵字聯想。',
    sample: '看到「酸」字就回答「一定有毒、不能碰」、看到液體透明就直接說「這一定是水溶液」，沒有任何分析過程。',
    color: 'yellow',
  },
  {
    id: 5,
    name: '來自日常的經驗和生活中的觀察',
    feature: '大量引用自己日常生活經驗做結論，卻忽略其他情況。',
    sample: '「我泡奶粉每次都要攪拌，所以糖不攪拌就完全不會溶」、「自己泡的糖水不算水溶液，只有市售飲料才是」。',
    color: 'mint',
  },
  {
    id: 6,
    name: '日常生活用語與科學用語的混淆',
    feature: '語詞層面的誤解，把生活語言用法當成科學概念。',
    sample: '把「鹹的」直接當成「鹼性」（食鹽水是鹹的所以是鹼性）、把酸鹼「中和」想成兩種東西就「消失」了。',
    color: 'purple',
  },
  {
    id: 7,
    name: '教師的教學過程不當',
    feature: '學生明確提到是因為老師這樣說 / 課本這樣寫而造成誤解。',
    sample: '學生在對話中說「老師說只有完全看不見才算溶解」、「課本上說攪拌可以增加溶解量」這類來源描述時才適用。',
    color: 'gray',
    conditional: true,
  },
  {
    id: 8,
    name: '實驗操作不當',
    feature: '學生描述自己做實驗時的步驟有明顯錯誤，導致觀察結果偏差。',
    sample: '學生描述「我把石蕊試紙泡了三分鐘才拿起來」、「我同一張試紙連續測了三杯不同的水溶液」這類錯誤操作時才適用。',
    color: 'gray',
    conditional: true,
  },
];

const COLOR_THEMES = {
  blue:   { badge: 'bg-[#BADDF4] text-[#2E86C1]', accent: 'bg-[#BADDF4]' },
  pink:   { badge: 'bg-[#FAC8CC] text-[#E74C5E]', accent: 'bg-[#FAC8CC]' },
  green:  { badge: 'bg-[#C8EAAE] text-[#3D5A3E]', accent: 'bg-[#C8EAAE]' },
  yellow: { badge: 'bg-[#FCF0C2] text-[#B7950B]', accent: 'bg-[#FCF0C2]' },
  mint:   { badge: 'bg-[#A8E6CF] text-[#1E8449]', accent: 'bg-[#A8E6CF]' },
  purple: { badge: 'bg-[#F3E5F5] text-[#7D3C98]', accent: 'bg-[#F3E5F5]' },
  gray:   { badge: 'bg-[#E5E7EA] text-[#636E72]', accent: 'bg-[#E5E7EA]' },
};

function CauseCard({ category }) {
  const theme = COLOR_THEMES[category.color];
  return (
    <div className="bg-white rounded-[24px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col">
      <div className={`${theme.accent} px-5 py-3 flex items-center gap-3 border-b border-[#BDC3C7]`}>
        <div className={`w-9 h-9 rounded-full ${theme.badge} flex items-center justify-center font-bold text-base flex-shrink-0`}>
          {category.id}
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#2D3436] leading-tight">{category.name}</h3>
      </div>

      <div className="px-5 py-4 flex-1 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-[#95A5A6] uppercase tracking-wider mb-1">特徵</p>
          <p className="text-sm text-[#2D3436] leading-relaxed">{category.feature}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#95A5A6] uppercase tracking-wider mb-1">常見樣態</p>
          <p className="text-sm text-[#636E72] leading-relaxed">{category.sample}</p>
        </div>

        {category.conditional && (
          <div className="mt-auto pt-3 border-t border-dashed border-[#D5D8DC]">
            <p className="text-xs text-[#95A5A6] flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>情境條件成因：僅在對話內容明確支持時才適用。</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MisconceptionCauses() {
  const navigate = useNavigate();

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁面標題 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/teacher')}
              className="text-[#95A5A6] hover:text-[#636E72] transition-colors"
              aria-label="返回首頁"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">迷思概念成因</h1>
          </div>
          <p className="text-sm text-[#636E72] ml-8">
            學生在診斷對話中表現出的迷思概念，其背後成因可歸納為以下 8 類；診斷模型會依據學生回答內容歸類。
            <span className="ml-2 font-medium text-[#2D3436]">共 {CAUSE_CATEGORIES.length} 種成因</span>
          </p>
        </div>

        {/* 成因說明 */}
        <div className="bg-[#FCF0C2]/40 border border-[#FCF0C2] rounded-2xl px-4 py-3 mb-5 sm:mb-6 flex items-start gap-2">
          <svg className="w-4 h-4 text-[#B7950B] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs sm:text-sm text-[#636E72] leading-relaxed">
            類別 1–6 是一般通用成因；類別 7、8 為「情境條件成因」，僅在學生對話中明確提及對應描述時才會被歸類。
          </p>
        </div>

        {/* 成因卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {CAUSE_CATEGORIES.map((c) => (
            <CauseCard key={c.id} category={c} />
          ))}
        </div>
      </div>
    </TeacherLayout>
  );
}
