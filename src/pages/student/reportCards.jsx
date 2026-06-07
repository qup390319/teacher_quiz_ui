import { CAUSE_CATEGORIES, CAUSE_COLOR_THEMES } from '../../data/misconceptionCauses';
import {
  ERROR_TYPE_LABELS,
  ERROR_TYPE_DESCRIPTIONS,
  ERROR_TYPE_THEMES,
  ERROR_TYPE_UNCLASSIFIED_BADGE,
} from '../../data/errorTypes';
import { Icon } from '../../components/ui/woodKit';

export function MisconceptionCard({ node, miscon, relatedQs, quote, causeIds, errorType }) {
  const errTheme = errorType ? ERROR_TYPE_THEMES[errorType] : null;
  return (
    <div className="relative bg-white border-[3px] border-[#8B5E3C] rounded-[24px] p-4 sm:p-5
                    shadow-[0_4px_0_-1px_#5A3E22,0_8px_14px_-4px_rgba(91,66,38,0.35)]">
      {/* 標籤列：知識節點 + 錯誤類別（中性色） */}
      <div className="flex items-start gap-2 flex-wrap mb-3">
        <span className="font-game text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0
                         bg-[#FFF4E0] border-2 border-[#C19A6B] text-[#7A4A18]">
          {node.name}
        </span>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 border-2 ${
            errTheme ? errTheme.badge : ERROR_TYPE_UNCLASSIFIED_BADGE
          }`}
          title={errorType ? ERROR_TYPE_DESCRIPTIONS[errorType] : '尚未分類'}
        >
          {errorType ? ERROR_TYPE_LABELS[errorType] : '未分類'}
        </span>
      </div>

      {/* 焦點 1：你目前的想法（粉色 = 問題） */}
      <div className="bg-gradient-to-b from-[#FCE5E7] to-[#F8D2D5] border-2 border-[#F5B8BA] rounded-2xl p-4 mb-3">
        <p className="flex items-center gap-1.5 text-xs font-black text-[#C0392B] mb-2">
          <Icon name="lightbulb" filled className="text-base" />
          你目前的想法
        </p>
        <p className="text-base sm:text-lg text-[#5A2C2C] font-black leading-relaxed">「{miscon.label}」</p>
        <p className="text-sm text-[#7A4A4A] mt-1.5 leading-relaxed">{miscon.studentDetail || miscon.detail}</p>
      </div>

      {/* 中性次要區塊：用淡米底 + 灰邊，header 用 icon + 小灰字 */}
      {(causeIds.length > 0 || quote || relatedQs.length > 0) && (
        <div className="bg-[#FBF8EE] border border-[#E5DCC4] rounded-2xl p-3.5 mb-3 space-y-3 divide-y divide-[#E5DCC4]">
          {causeIds.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#7A5232] mb-1.5">
                <Icon name="search" filled className="text-sm text-[#A38A5A]" />
                可能的原因
              </p>
              <div className="flex flex-wrap gap-1.5">
                {causeIds.map((cid) => {
                  const cat = CAUSE_CATEGORIES.find((c) => c.id === cid);
                  if (!cat) return null;
                  return (
                    <span key={cid} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                                               bg-white border border-[#C19A6B] text-[#7A4A18]">
                      {cat.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {quote && (
            <div className={causeIds.length > 0 ? 'pt-3' : ''}>
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#7A5232] mb-1.5">
                <Icon name="chat_bubble" filled className="text-sm text-[#A38A5A]" />
                你在對話中提到
              </p>
              <p className="text-sm text-[#5A3E22] leading-relaxed italic">「{quote}」</p>
            </div>
          )}

          {relatedQs.length > 0 && (
            <div className={(causeIds.length > 0 || quote) ? 'pt-3' : ''}>
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#7A5232] mb-1.5">
                <Icon name="science" filled className="text-sm text-[#A38A5A]" />
                這個想法出現在以下情境
              </p>
              {relatedQs.map((q) => (
                <p key={q.id} className="text-sm text-[#5A3E22] leading-relaxed">
                  • {q.stem}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 焦點 2：科學上是這樣的（藍色 = 解答） */}
      <div className="bg-gradient-to-b from-[#D6ECFA] to-[#BADDF4] border-2 border-[#8AC0E0] rounded-2xl p-4">
        <p className="flex items-center gap-1.5 text-xs font-black text-[#1F6B9C] mb-2">
          <Icon name="auto_stories" filled className="text-base" />
          科學上是這樣的
        </p>
        <p className="text-base sm:text-lg text-[#1A4D70] font-bold leading-relaxed">
          {node.studentHint || `${node.teachingStrategy.split('。')[0]}。`}
        </p>
      </div>
    </div>
  );
}

export function RemedialNodeCard({ node }) {
  return (
    <div className="relative bg-white border-[3px] border-[#8B5E3C] rounded-[20px] p-4
                    shadow-[0_4px_0_-1px_#5A3E22,0_6px_10px_-3px_rgba(91,66,38,0.3)]
                    overflow-hidden">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#D6ECFA] to-[#BADDF4] border-2 border-[#8AC0E0]
                        flex items-center justify-center flex-shrink-0
                        shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]">
          <Icon name="menu_book" filled className="text-2xl text-[#1F6B9C]" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-game text-xs font-bold text-[#95A5A6] tabular-nums">{node.id}</span>
          <p className="font-game text-base font-black text-[#5A3E22] leading-tight mt-0.5">{node.name}</p>
          <p className="text-xs sm:text-sm text-[#7A5232] mt-1 leading-relaxed">{node.description}</p>
        </div>
      </div>
      {node.videoUrl && (
        <a
          href={node.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 bg-gradient-to-b from-[#F4D58A] to-[#F0B962] border-[3px] border-[#9B5E18]
                     rounded-xl px-3 py-2.5 hover:translate-y-0.5 transition-all duration-150
                     shadow-[0_3px_0_#9B5E18,0_5px_8px_-2px_rgba(155,94,24,0.4)] hover:shadow-[0_1px_0_#9B5E18]"
        >
          <Icon name="play_circle" filled className="text-4xl text-[#7A4A18] drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]" />
          <div className="min-w-0 flex-1 text-left">
            <p className="font-game text-xs font-black text-[#7A4A18]">教學影片</p>
            <p className="text-xs sm:text-sm font-bold text-[#5A3E22] truncate">{node.videoTitle}</p>
          </div>
          <Icon name="open_in_new" filled className="text-base text-[#7A4A18] group-hover:translate-x-0.5 transition-transform" />
        </a>
      )}
    </div>
  );
}
