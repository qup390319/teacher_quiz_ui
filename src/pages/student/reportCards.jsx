import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CAUSE_CATEGORIES, CAUSE_COLOR_THEMES } from '../../data/misconceptionCauses';
import {
  ERROR_TYPE_LABELS,
  ERROR_TYPE_DESCRIPTIONS,
  ERROR_TYPE_STUDENT_EXPLAIN,
  ERROR_TYPE_FEEDBACK,
  ERROR_TYPE_THEMES,
} from '../../data/errorTypes';
import { Icon } from '../../components/ui/woodKit';
import { cleanScienceHint } from './reportData';

/* 點擊分類章後跳出的小彈窗（平板友善，不靠 hover）：只解釋「這個分類詞是什麼意思」。
   正確說法／建議不放這裡——那些直接顯示在卡片上。spec-07 木框風，參考 LeaveConfirmModal。 */
function ErrorTypeInfoModal({ errorType, onClose }) {
  if (!errorType) return null;
  const theme = ERROR_TYPE_THEMES[errorType];
  // 用 portal 掛到 body：報告頁祖先有 transform 動畫，會讓 position:fixed 變成相對該祖先
  // 定位（彈窗跑到長內容中段、需捲動才看得到）。掛到 body 才能真正置中於畫面（平板/手機）。
  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/40 animate-fade-up"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="errortype-info-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                   border-[3px] border-[#8B5E3C] rounded-[28px] p-5 sm:p-6
                   shadow-[0_8px_0_-1px_#5A3E22,0_16px_28px_-6px_rgba(91,66,38,0.5)]"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black border-2 ${theme.badge}`}>
            {ERROR_TYPE_LABELS[errorType]}
          </span>
          <h2 id="errortype-info-title" className="font-game text-base font-black text-[#5A3E22]">
            這是什麼意思呢？
          </h2>
          <p className="text-sm text-[#5A3E22] font-bold leading-relaxed">
            {ERROR_TYPE_STUDENT_EXPLAIN[errorType]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-2xl border-[3px] border-[#5C8A2E] font-game font-black text-sm sm:text-base
                     bg-gradient-to-b from-[#B8DC83] to-[#7DB044] text-[#2F4A1A]
                     shadow-[0_4px_0_#5C8A2E] hover:translate-y-0.5 hover:shadow-[0_2px_0_#5C8A2E]
                     transition-all duration-150"
        >
          我知道了！
        </button>
      </div>
    </div>,
    document.body,
  );
}

// 給學生看的 aiSummary 品質閘：含知識節點/迷思代碼，或以第三人稱「學生…」開頭的
// 都是教師/除錯導向的舊摘要（例：「學生對『INe-Ⅱ-3-02』有迷思概念，M02-1。」），
// 對國小生無意義且像未完成 → 不顯示原文，改由「可能的原因」的回饋承擔引導。
function isStudentFacingSummary(text) {
  if (!text || typeof text !== 'string') return false;
  if (/INe-|M\d{2}-\d/.test(text)) return false;        // 裸代碼
  if (/^\s*(該?學生|這位學生)/.test(text)) return false; // 第三人稱旁白
  return true;
}

export function MisconceptionCard({ node, miscon, relatedQs, quote, causeIds, errorType, aiSummary, statusChange, reasoningQuality, onDispute, questionContext }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const errTheme = errorType ? ERROR_TYPE_THEMES[errorType] : null;
  const typeFeedback = errorType ? ERROR_TYPE_FEEDBACK[errorType] : null;
  // 作答時選對、深談後才確認迷思（DOWNGRADED）→ 給一行誠實但不打擊的情境說明
  const isDowngraded = statusChange?.changeType === 'DOWNGRADED';
  // 低信心（AI 資訊不足硬給判斷）→ 用「可能」的委婉措辭，不把學生沒有的迷思講死
  const lowConfidence = reasoningQuality === 'GUESSING';
  // 成因 → 帶學生版意義/行動的物件；下一步提示去重彙整
  const causeCats = causeIds.map((cid) => CAUSE_CATEGORIES.find((c) => c.id === cid)).filter(Boolean);
  const causeTips = [...new Set(causeCats.map((c) => c.studentTip).filter(Boolean))];
  const showSummary = isStudentFacingSummary(aiSummary);
  return (
    <div className="relative bg-white border-[3px] border-[#8B5E3C] rounded-[24px] p-4 sm:p-5
                    shadow-[0_4px_0_-1px_#5A3E22,0_8px_14px_-4px_rgba(91,66,38,0.35)]">
      {/* 題目脈絡：把「第幾題 / 題幹 / 你選的」直接接在迷思診斷上方，題目與迷思合為一張卡 */}
      {questionContext && (
        <div className="mb-3 pb-3 border-b-2 border-dashed border-[#E5DCC4]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-game text-xs font-black text-[#7A5232]">第 {questionContext.questionId} 題</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border-2
                             bg-[#FCEFD6] border-[#F0CFA4] text-[#B9770E]">
              <Icon name="cancel" filled className="text-sm text-[#D08B2E]" />答錯
            </span>
          </div>
          <p className="text-sm text-[#5A3E22] leading-relaxed">{questionContext.stem}</p>
          {questionContext.pickedContent && (
            <p className="text-sm text-[#7A5232] leading-relaxed mt-1">
              <span className="font-bold">你選的：</span>{questionContext.pickedContent}
            </p>
          )}
        </div>
      )}
      {/* 標籤列：知識節點 +（若有判讀）錯誤類別。errorType 為 null 時不渲染徽章，
          避免整排灰色「未分類」讓報告看起來像未完成。 */}
      <div className="flex items-start gap-2 flex-wrap mb-3">
        <span className="font-game text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0
                         bg-[#FFF4E0] border-2 border-[#C19A6B] text-[#7A4A18]">
          {node.name}
        </span>
        {errorType && (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 border-2 ${errTheme.badge}`}
            title={ERROR_TYPE_DESCRIPTIONS[errorType]}
            aria-label={`${ERROR_TYPE_LABELS[errorType]}，點一下看說明`}
          >
            {ERROR_TYPE_LABELS[errorType]}
            <Icon name="help" filled className="text-sm" />
          </button>
        )}
        {isDowngraded && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 border-2
                           bg-[#FFF6E0] border-[#F0CFA4] text-[#B9770E]"
                title="作答時選了正確選項，但對話中發現想法還沒到位">
            選對了，但想法還可以更清楚
          </span>
        )}
      </div>

      {/* 核心對比：你目前的想法（粉）↔ 科學上是這樣的（藍）。橫式平板並排，一眼看出落差；
          正確答案緊鄰你的想法，不再被「可能的原因」擋在後面。 */}
      <div className="grid lg:grid-cols-2 gap-3 mb-3 items-stretch">
        {/* 焦點 1：你目前的想法（粉色 = 問題）。低信心時改用「可能有的想法」委婉措辭，
            label 前綴「可能是」，避免把學生沒有的迷思講死、誤判時打擊孩子。 */}
        <div className="h-full bg-gradient-to-b from-[#FCE5E7] to-[#F8D2D5] border-2 border-[#F5B8BA] rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-xs font-black text-[#C0392B] mb-2">
            <Icon name="lightbulb" filled className="text-base" />
            {lowConfidence ? '你這題可能有的想法' : '你目前的想法'}
          </p>
          <p className="text-base sm:text-lg text-[#5A2C2C] font-black leading-relaxed">
            {lowConfidence ? '可能是' : ''}「{miscon.label}」
          </p>
          {!questionContext && (
            <p className="text-sm text-[#7A4A4A] mt-1.5 leading-relaxed">{miscon.studentDetail || miscon.detail}</p>
          )}
        </div>
        {/* 焦點 2：依錯誤類型給對應回饋（藍色 = 解答）。標題/圖示隨類型變化、正確說法直接顯示，
            類型專屬提醒（guidance）接在後面；errorType 為 null 時沿用「科學上是這樣的」。 */}
        <div className="h-full bg-gradient-to-b from-[#D6ECFA] to-[#BADDF4] border-2 border-[#8AC0E0] rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-xs font-black text-[#1F6B9C] mb-2">
            <Icon name={typeFeedback?.icon || 'auto_stories'} filled className="text-base" />
            {typeFeedback?.heading || '科學上是這樣的'}
          </p>
          <p className="text-base sm:text-lg text-[#1A4D70] font-bold leading-relaxed">
            {cleanScienceHint(node.studentHint) || `${node.teachingStrategy.split('。')[0]}。`}
          </p>
          {typeFeedback?.guidance && (
            <p className="text-sm text-[#1F6B9C] mt-2 leading-relaxed flex items-start gap-1">
              <Icon name="tips_and_updates" filled className="text-sm mt-0.5 flex-shrink-0" />
              <span>{typeFeedback.guidance}</span>
            </p>
          )}
        </div>
      </div>

      {/* 中性次要區塊：用淡米底 + 灰邊，header 用 icon + 小灰字 */}
      {(causeIds.length > 0 || quote || relatedQs.length > 0) && (
        <div className="bg-[#FBF8EE] border border-[#E5DCC4] rounded-2xl p-3.5 mb-3 space-y-3 divide-y divide-[#E5DCC4]">
          {causeCats.length > 0 && (
            <div>
              {/* header 帶一句「為什麼給你看原因」，讓孩子知道這不是責備而是幫助 */}
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#7A5232] mb-0.5">
                <Icon name="search" filled className="text-sm text-[#A38A5A]" />
                可能的原因
              </p>
              <p className="text-xs text-[#A38A5A] mb-2 leading-relaxed pl-5">
                一開始這樣想很正常～知道原因，下次就會更棒！
              </p>
              {/* 每個成因：標籤 + 一句兒童語意義 */}
              <div className="space-y-1.5">
                {causeCats.map((cat) => (
                  <div key={cat.id}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                                     bg-white border border-[#C19A6B] text-[#7A4A18]">
                      {cat.name}
                    </span>
                    {cat.studentMeaning && (
                      <p className="text-sm text-[#5A3E22] leading-relaxed mt-1">{cat.studentMeaning}</p>
                    )}
                  </div>
                ))}
              </div>
              {/* 知道原因後的回饋：具體下一步可以怎麼做 */}
              {causeTips.length > 0 && (
                <div className="mt-2.5 bg-white border border-[#D9E8C9] rounded-xl p-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-black text-[#5C8A2E] mb-1">
                    <Icon name="emoji_objects" filled className="text-sm" />
                    下一步可以這樣做
                  </p>
                  <ul className="space-y-0.5">
                    {causeTips.map((tip, i) => (
                      <li key={i} className="text-sm text-[#3D5A3E] leading-relaxed">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
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

      {/* 焦點 3：給你的話（aiSummary）—— 連結「你的想法」與「科學解釋」的個人化回饋。
          僅顯示通過品質閘的學生導向摘要；含代碼/第三人稱旁白的舊資料不顯示，
          改由上方「可能的原因 → 下一步」承擔回饋。 */}
      {showSummary && (
        <div className="mt-3 flex items-start gap-2.5 bg-gradient-to-b from-[#FFFBF0] to-[#FFF4D6]
                        border-2 border-[#F5D669] rounded-2xl p-4">
          <Icon name="tips_and_updates" filled className="text-xl text-[#D4AC0D] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-[#B9770E] mb-1">給你的話</p>
            <p className="text-sm sm:text-base text-[#5A3E22] leading-relaxed">{aiSummary}</p>
          </div>
        </div>
      )}

      {/* 誤判補救：學生覺得這不是他的想法 → 重新問這一題（重做選擇題＋對話）。
          由 StudentReport 注入 onDispute(questionId)；沒有題目脈絡或未注入時不顯示。 */}
      {onDispute && questionContext?.questionId != null && (
        <button
          type="button"
          onClick={() => onDispute(questionContext.questionId)}
          className="mt-3 w-full py-2.5 rounded-2xl border-[3px] border-[#C19A6B] font-game font-black text-sm
                     bg-white text-[#8B6B43] hover:bg-[#FFF8E7] hover:text-[#5A3E22]
                     shadow-[0_2px_0_-1px_#C19A6B] transition-all duration-150
                     flex items-center justify-center gap-1.5"
        >
          <Icon name="back_hand" filled className="text-lg" />
          這不是我的想法，重新問我這一題
        </button>
      )}

      {infoOpen && <ErrorTypeInfoModal errorType={errorType} onClose={() => setInfoOpen(false)} />}
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

/** 單一題目結果卡：✓對（綠木框）/ ✗錯（暖橘木框）+ 你選的 + 正確的想法。 */
export function QuestionResultCard({ questionId, correct, stem, pickedContent, pickedReason, correctHint, miscLabel }) {
  const accent = correct
    ? { border: 'border-[#5C8A2E]', pill: 'bg-[#E8F3DA] border-[#A7D696] text-[#3D5A3E]', icon: 'check_circle', iconColor: 'text-[#5C8A2E]', label: '答對' }
    : { border: 'border-[#D08B2E]', pill: 'bg-[#FCEFD6] border-[#F0CFA4] text-[#B9770E]', icon: 'cancel', iconColor: 'text-[#D08B2E]', label: '答錯' };
  return (
    <div className={`bg-white border-[3px] ${accent.border} rounded-[20px] p-4
                     shadow-[0_3px_0_-1px_rgba(91,66,38,0.35),0_5px_8px_-3px_rgba(91,66,38,0.25)]`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-game text-xs font-black text-[#7A5232]">第 {questionId} 題</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border-2 ${accent.pill}`}>
          <Icon name={accent.icon} filled className={`text-sm ${accent.iconColor}`} />
          {accent.label}
        </span>
      </div>
      <p className="text-sm text-[#5A3E22] leading-relaxed mb-2">{stem}</p>
      {pickedContent && (
        <p className="text-sm text-[#7A5232] leading-relaxed">
          <span className="font-bold">你選的：</span>{pickedContent}
        </p>
      )}
      {pickedReason && (
        <p className="text-sm text-[#3A6EA5] leading-relaxed mt-0.5">
          <span className="font-bold">你的理由：</span>{pickedReason}
        </p>
      )}
      {!correct && miscLabel && (
        <p className="text-sm text-[#B9770E] leading-relaxed mt-0.5">
          <span className="font-bold">你的想法：</span>「{miscLabel}」
        </p>
      )}
      {correctHint && (
        <div className="mt-2 bg-gradient-to-b from-[#D6ECFA] to-[#BADDF4] border-2 border-[#8AC0E0] rounded-xl p-3">
          <p className="flex items-center gap-1.5 text-xs font-black text-[#1F6B9C] mb-1">
            <Icon name="auto_stories" filled className="text-sm" />
            正確的想法
          </p>
          <p className="text-sm text-[#1A4D70] font-bold leading-relaxed">{correctHint}</p>
        </div>
      )}
    </div>
  );
}

/** 「每一題的結果」區塊：逐題對錯總覽，置於迷思卡之上，先回答「我對幾題錯幾題」。 */
export function QuestionResultsSection({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h2 className="font-game text-lg font-black text-[#5A3E22] mb-3 flex items-center gap-2 pl-2 border-l-[5px] border-[#5C8A2E] rounded-l">
        <Icon name="fact_check" filled className="text-2xl text-[#5C8A2E]" />
        每一題的結果
      </h2>
      <div className="space-y-3">
        {items.map((it) => (
          <QuestionResultCard key={it.questionId} {...it} />
        ))}
      </div>
    </div>
  );
}
