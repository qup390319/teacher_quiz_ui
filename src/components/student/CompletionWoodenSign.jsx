import { Icon, WOOD_OUTER, WOOD_INNER_CREAM, StarRating } from '../ui/woodKit';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

/* 結算過渡 dots 動畫（spec-07 §12.5）*/
export function SettlingPanel() {
  return (
    <div className="flex-1 flex items-center justify-center animate-fade-up">
      <div className="flex flex-col items-center gap-4">
        <img
          src={mascotImg}
          alt="吉祥物"
          className="w-24 h-24 sm:w-28 sm:h-28 object-contain animate-breath
                     drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]"
        />
        <div className="flex items-center gap-2">
          {[0, 240, 480].map((d) => (
            <span
              key={d}
              className="h-3 w-3 rounded-full bg-[#5C8A2E] animate-[dot-pulse_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </div>
        <p className="text-base font-game font-black text-[#5A3E22] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
          整理你的論證紀錄...
        </p>
      </div>
    </div>
  );
}

/* 過關木牌 + StarRating（spec-07 §12.5，禁用 monster GIF）*/
export function ResultPanel({ quiz, stars = 3, onEnterReflection }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-10 animate-fade-up">
      <div className={WOOD_OUTER + ' max-w-md w-full'}>
        <div className={WOOD_INNER_CREAM + ' p-6 text-center'}>
          <Icon name="emoji_events" filled className="text-6xl text-[#F4C545] drop-shadow-[0_3px_0_rgba(180,120,30,0.5)]" />
          <h2 className="font-game text-3xl font-black text-[#5A3E22] mb-2 mt-2
                         drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
            過關成功
          </h2>
          <div className="flex justify-center mb-3">
            <StarRating count={stars} size="text-3xl" />
          </div>
          <p className="text-sm sm:text-base text-[#7A5232] leading-relaxed mb-5 font-medium">
            你完成了《{quiz.title}》的論證對話。<br />接著進入反思，回顧這次的推理路徑。
          </p>
          <button
            type="button"
            onClick={onEnterReflection}
            className="inline-flex items-center gap-1.5 px-7 py-3 rounded-full border-2
                       bg-gradient-to-b from-[#F0B962] to-[#D08B2E] border-[#9B5E18] text-white
                       font-game font-bold text-lg
                       shadow-[0_5px_0_#9B5E18] hover:translate-y-0.5 hover:shadow-[0_3px_0_#9B5E18]
                       transition-all duration-200"
          >
            <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">進入反思</span>
            <Icon name="auto_stories" filled className="text-2xl" />
          </button>
        </div>
      </div>
    </div>
  );
}
