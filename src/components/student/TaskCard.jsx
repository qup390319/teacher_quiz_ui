import { Icon, StarRating } from '../ui/woodKit';
import flaskBlue from '../../assets/illustrations/flasks/flask_erlenmeyer2_blue.png';
import flaskGreen from '../../assets/illustrations/flasks/flask_erlenmeyer3_green.png';
import flaskYellow from '../../assets/illustrations/flasks/flask_erlenmeyer4_yellow.png';
import flaskOrange from '../../assets/illustrations/flasks/flask_erlenmeyer5_orange.png';
import flaskPink from '../../assets/illustrations/flasks/flask_erlenmeyer6_pink.png';
import flaskPurple from '../../assets/illustrations/flasks/flask_erlenmeyer7_purple.png';
import flaskClear from '../../assets/illustrations/flasks/flask_erlenmeyer8_clear.png';

/* 圖示池：診斷=燒杯（7 色）— 每張任務卡用 quizId hash 穩定選一張 */
const FLASKS = [flaskBlue, flaskGreen, flaskYellow, flaskOrange, flaskPink, flaskPurple, flaskClear];

const hashSeed = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const pickFlask = (seed) => FLASKS[hashSeed(seed) % FLASKS.length];

/* SciLens 學生端 任務卡片（v2.5 - 寶可夢手遊風）
 * 詳細規範見 docs/spec-07-ui-design-system.md §11 */

const DiagnosisStatusConfig = {
  next: {
    iconBg: 'bg-[#FFF1D8]',
    iconBorder: 'border-[#F0B962]',
    iconColor: 'text-[#D08B2E]',
    icon: 'quiz',
    bandClass: 'bg-gradient-to-b from-[#C8E4A8] to-[#A8D88E]',
    progressFill: 'bg-gradient-to-b from-[#F0B962] to-[#D08B2E]',
  },
  completed: {
    iconBg: 'bg-[#E8F4D8]',
    iconBorder: 'border-[#7DB044]',
    iconColor: 'text-[#5C8A2E]',
    icon: 'verified',
    bandClass: 'bg-gradient-to-b from-[#A8D88E] to-[#7DB044]',
    progressFill: 'bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E]',
  },
  expired: {
    iconBg: 'bg-[#F0EAE2]',
    iconBorder: 'border-[#9B8E80]',
    iconColor: 'text-[#7A6F60]',
    icon: 'schedule',
    bandClass: 'bg-gradient-to-b from-[#D0C5B8] to-[#9B8E80]',
    progressFill: 'bg-gradient-to-b from-[#C0B4A6] to-[#9B8E80]',
  },
};

const daysFromToday = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
};

export default function TaskCard({
  status,
  title,
  questionCount,
  dueDate,
  stars = 0,
  completedAt,
  bestRecord,
  quizId,
  assignmentId,
  onStart,
  onViewReport,
}) {
  const taskImg = pickFlask(assignmentId || quizId || title);
  const cfg = DiagnosisStatusConfig[status] ?? DiagnosisStatusConfig.next;
  const isCompleted = status === 'completed';
  const isExpired = status === 'expired';
  const isNext = status === 'next';

  const daysLeft = isNext && dueDate ? daysFromToday(dueDate) : null;
  const isUrgent = daysLeft != null && daysLeft <= 3;

  /* 進度條：已完成顯示答對率 / 其他顯示空 */
  const progressPct = isCompleted && bestRecord && questionCount
    ? Math.round((bestRecord.correctCount / questionCount) * 100)
    : 0;

  return (
    <div
      className={`relative
                 ${isNext ? 'hover:-translate-y-0.5 transition-transform duration-200' : ''}
                 ${isExpired ? 'opacity-90' : ''}`}
    >
      {isUrgent && <Sticker variant="urgent" text={daysLeft <= 0 ? '今天截止' : `剩 ${daysLeft} 天`} />}
      {isCompleted && <Sticker variant="completed" text="完成" />}
      {isExpired && <Sticker variant="expired" text="已過期" />}

      <div className="relative bg-white border-[3px] border-[#8B5E3C] rounded-[20px] overflow-hidden
                      shadow-[0_4px_0_-1px_#5A3E22,0_8px_14px_-4px_rgba(91,66,38,0.35)]">

      <div className="flex items-center gap-3 p-3 sm:p-4 pr-3 sm:pr-4">
        <div
          className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl
                     ${cfg.iconBg} border-2 ${cfg.iconBorder}
                     flex items-center justify-center
                     shadow-[inset_0_-3px_0_rgba(0,0,0,0.06),0_2px_4px_rgba(91,66,38,0.15)]`}
        >
          <img
            src={taskImg}
            alt="任務"
            className={`max-w-[80%] max-h-[80%] object-contain drop-shadow-[0_2px_2px_rgba(91,66,38,0.2)] ${
              isExpired ? 'grayscale opacity-70' : ''
            }`}
          />
        </div>

        <div className="flex-1 min-w-0 leading-tight">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold mb-1
                          border bg-[#FFF1D8] border-[#D08B2E] text-[#7A4A18]">
            <Icon name="quiz" filled className="text-[10px] sm:text-xs" />
            迷思診斷
          </span>
          <h3 className={`font-black text-lg sm:text-xl text-[#5A3E22] mb-2 truncate ${isExpired ? 'opacity-70' : ''}`}>
            {title}
          </h3>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm sm:text-base font-bold text-[#5A3E22] flex-shrink-0">
              {questionCount} 題
            </span>
            <div className="flex-1 h-2.5 sm:h-3 bg-[#E0D5BC] rounded-full overflow-hidden border border-[#8B5E3C]/40">
              <div
                className={`h-full ${cfg.progressFill} transition-all duration-500`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {isCompleted && stars > 0 && (
              <div className="flex-shrink-0">
                <StarRating count={stars} size="text-base" />
              </div>
            )}
          </div>

          <p className="text-sm sm:text-base text-[#7A5232] font-medium truncate">
            {isCompleted
              ? `完成於 ${formatShortDate(completedAt)} · 答對 ${bestRecord?.correctCount ?? 0} 題`
              : isExpired
                ? `已於 ${formatShortDate(dueDate)} 截止`
                : `截止：${formatShortDate(dueDate)}`}
          </p>
        </div>

        <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
          {isCompleted ? (
            <>
              <ChunkyButton onClick={onViewReport} variant="primary" label="查看" icon="visibility" />
              <ChunkyButton onClick={onStart} variant="ghost" label="再做" icon="refresh" small />
            </>
          ) : (
            <ChunkyButton
              onClick={onStart}
              variant={isExpired ? 'muted' : 'primary'}
              label={isExpired ? '挑戰' : '開始'}
              icon="play_arrow"
            />
          )}
        </div>
      </div>

        <div className={`h-2 sm:h-2.5 ${cfg.bandClass}`} />
      </div>
    </div>
  );
}

function Sticker({ variant, text }) {
  const palette = variant === 'urgent'
    ? 'bg-gradient-to-b from-[#F08080] to-[#D54545] text-white border-white animate-pulse-soft'
    : variant === 'completed'
      ? 'bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E] text-white border-white'
      : 'bg-gradient-to-b from-[#C0B4A6] to-[#7A6F60] text-white border-white';
  const icon = variant === 'urgent' ? 'alarm' : variant === 'completed' ? 'check' : 'block';

  return (
    <div
      className={`absolute -top-1.5 -left-1.5 z-10 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md
                 border-2 text-[10px] sm:text-xs font-game font-black tracking-wider
                 shadow-[0_2px_4px_rgba(0,0,0,0.3)] -rotate-6 ${palette}`}
    >
      <Icon name={icon} filled className="text-xs" />
      {text}
    </div>
  );
}

function ChunkyButton({ onClick, label, icon, variant = 'primary', small = false }) {
  const sizeClass = small ? 'px-3 py-1.5 text-sm' : 'px-4 sm:px-5 py-2.5 sm:py-3 text-base sm:text-lg';
  const borderRadius = small ? 'rounded-xl' : 'rounded-2xl';

  const variantClass = {
    primary:
      'bg-gradient-to-b from-[#F4D58A] to-[#F0B962] border-[#9B5E18] text-[#7A4A18] ' +
      'shadow-[0_4px_0_#9B5E18,0_6px_10px_-2px_rgba(155,94,24,0.4)] hover:shadow-[0_2px_0_#9B5E18]',
    muted:
      'bg-gradient-to-b from-[#D0C5B8] to-[#9B8E80] border-[#6B5E50] text-white ' +
      'shadow-[0_4px_0_#6B5E50,0_6px_10px_-2px_rgba(91,82,70,0.4)] hover:shadow-[0_2px_0_#6B5E50]',
    ghost:
      'bg-white border-[#8B5E3C] text-[#7A4A18] ' +
      'shadow-[0_2px_0_#8B5E3C] hover:shadow-[0_1px_0_#8B5E3C] hover:bg-[#FFF8E7]',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-0.5 border-[3px] font-game font-black tracking-wider
                 ${sizeClass} ${borderRadius} ${variantClass}
                 hover:translate-y-0.5 transition-all duration-200 whitespace-nowrap`}
    >
      <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">{label}</span>
      {icon && (
        <Icon
          name={icon}
          filled
          className="text-lg drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] group-hover:translate-x-0.5 transition-transform"
        />
      )}
    </button>
  );
}
