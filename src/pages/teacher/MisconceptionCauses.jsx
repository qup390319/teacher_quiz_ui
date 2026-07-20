import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';

const CAUSE_CATEGORIES = [
  {
    id: 1,
    name: '概念缺失',
    feature: '對這個主題幾乎一片空白，連最基本的前置概念都沒有，常直接說「不知道」。',
    sample: '被問到「糖溶進水裡之後跑去哪了？」直接回答「不知道」、「忘記了」，找不到任何可辨識的相關科學想法。',
    color: 'blue',
  },
  {
    id: 2,
    name: '概念混淆',
    feature: '有學過一些，但把不同概念當成同一個，或用錯地方。',
    sample: '把「溶解」當成「融化」（覺得糖溶在水裡跟冰塊融化是同一回事），或把「溶質」和「溶劑」、「酸」和「鹼」互相講反。',
    color: 'pink',
  },
  {
    id: 3,
    name: '日常經驗的直觀建構',
    feature: '用自己日常生活的觀察下結論，並以個人經驗當作判斷依據，忽略其他情況。',
    sample: '「我泡奶粉每次都要攪拌，所以糖不攪拌就完全不會溶」、「我在家泡過，看不到就是溶完了」。',
    color: 'mint',
  },
  {
    id: 4,
    name: '日常語言的字面干擾',
    feature: '把某個科學名詞的日常字面意思當成科學意思；拿掉那個詞，迷思就不存在。',
    sample: '把「鹹的」直接當成「鹼性」（食鹽水鹹所以是鹼性）、把「中和」想成兩種東西互相抵消「消失」了。',
    color: 'purple',
  },
  {
    id: 5,
    name: '直覺反應',
    feature: '幾乎沒有推理過程、沒有因果說明，由題目中單一字詞或第一印象直接觸發結論。',
    sample: '看到「酸」字就回答「一定有毒、不能碰」、看到液體透明就說「這一定是水溶液」；問「為什麼」時只說「感覺／應該是」。',
    color: 'yellow',
  },
  {
    id: 6,
    name: '推理謬誤（含因果倒置）',
    feature: '概念大致有，但推論或計算步驟錯了；包含把果當因、相關當因果（但不含過度類推）。',
    sample: '「糖看不見了 → 一定是蒸發到空氣中」這類跳步推論；或因果倒置「酸常使石蕊變紅 → 所以紅色的液體都是酸性」。',
    color: 'green',
  },
  {
    id: 7,
    name: '過度類推',
    feature: '把某情境成立的規則，不加限制地套到不適用的對象，忽略前提條件或反例。',
    sample: '「糖能溶於水，所以油、沙子也都能溶」、「飽和糖水加熱還能再溶 → 所以任何水溶液加熱都能無限溶解」。',
    color: 'orange',
  },
  {
    id: 8,
    name: '教學與教材因素',
    feature: '學生明確提到是因為老師這樣講、課本這樣寫而誤解（屬「學校造成的迷思」）。',
    sample: '學生在對話中說「老師說只有完全看不見才算溶解」、「課本上寫攪拌可以增加溶解量」這類來源描述時才適用。',
    color: 'gray',
    conditional: true,
  },
  {
    id: 9,
    name: '實驗操作不當',
    feature: '學生描述自己做實驗的步驟有明顯錯誤，導致觀察結果偏差。',
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
  orange: { badge: 'bg-[#FAD7A0] text-[#CA6F1E]', accent: 'bg-[#FAD7A0]' },
  red:    { badge: 'bg-[#FADBD8] text-[#C0392B]', accent: 'bg-[#FADBD8]' },
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
          <p className="text-sm font-semibold text-[#95A5A6] uppercase tracking-wider mb-1">特徵</p>
          <p className="text-sm text-[#2D3436] leading-relaxed">{category.feature}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#95A5A6] uppercase tracking-wider mb-1">常見樣態</p>
          <p className="text-sm text-[#636E72] leading-relaxed">{category.sample}</p>
        </div>

        {category.conditional && (
          <div className="mt-auto pt-3 border-t border-dashed border-[#D5D8DC]">
            <p className="text-sm text-[#95A5A6] flex items-start gap-1.5">
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
            學生在診斷對話中表現出的迷思概念，其背後成因可歸納為以下 9 類；診斷模型會依據學生回答內容歸類。
            <span className="ml-2 font-medium text-[#2D3436]">共 {CAUSE_CATEGORIES.length} 種成因</span>
          </p>
        </div>

        {/* 成因說明 */}
        <div className="bg-[#FCF0C2]/40 border border-[#FCF0C2] rounded-2xl px-4 py-3 mb-5 sm:mb-6 flex items-start gap-2">
          <svg className="w-4 h-4 text-[#B7950B] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm sm:text-sm text-[#636E72] leading-relaxed">
            類別 1–7 是一般通用成因；類別 8、9 為「情境條件成因」，僅在學生對話中明確提及對應描述時才會被歸類。
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
