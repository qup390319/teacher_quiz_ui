import { Icon, WOOD_OUTER, WOOD_INNER_CREAM } from '../ui/woodKit';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

/* 治療對話入場頁（spec-08 §6 / spec-07 §12）
 * 吉祥物 + 大標題木牌 + 開始挑戰 CTA
 */
export default function ScenarioIntro({ quiz, studentName, onStart }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-10 animate-fade-up">
      <div className="max-w-xl w-full">
        <div className="flex flex-col items-center gap-4">
          <img
            src={mascotImg}
            alt="吉祥物"
            className="w-28 h-28 sm:w-32 sm:h-32 object-contain animate-breath
                       drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]"
          />
          <div className={WOOD_OUTER + ' w-full'}>
            <div className={WOOD_INNER_CREAM + ' px-5 py-5 sm:px-6 sm:py-6 text-center'}>
              <h2 className="font-game text-2xl sm:text-3xl font-black text-[#5A3E22] mb-2
                             drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
                {quiz.title}
              </h2>
              <p className="text-sm sm:text-base text-[#7A5232] font-bold leading-relaxed">
                嗨 {studentName}！這是一場「情境治療」對話練習。<br />
                跟我一起，把你的想法用「主張・證據・推理」說清楚！
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-7 py-3.5 rounded-full border-2
                       bg-gradient-to-b from-[#8AC0D8] to-[#5293B4] border-[#3A7397] text-white
                       font-game font-bold tracking-wider text-xl
                       shadow-[0_5px_0_#3A7397,0_8px_14px_-3px_rgba(58,115,151,0.5)]
                       hover:translate-y-0.5 hover:shadow-[0_3px_0_#3A7397] transition-all duration-200"
          >
            <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">開始挑戰</span>
            <Icon name="play_arrow" filled className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
