import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import bgImg from '../assets/backgrounds/bg_chiheisen_green.jpg';
import mascotImg from '../assets/illustrations/scilens_mascot.png';
import teacherImg from '../assets/illustrations/irasutoya_teacher_boy.png';
import studentImg from '../assets/illustrations/irasutoya_student_clean.png';
import settingsIcon from '../assets/icons/settings_wood.png';

const Icon = ({ name, className = '', filled = false }) => (
  <span className={`material-symbols-rounded${filled ? ' filled' : ''} ${className}`}>{name}</span>
);

const TEACHER_FEATURES = [
  { icon: 'auto_fix_high',     text: '引導式 2 步出題精靈' },
  { icon: 'rocket_launch',     text: '一鍵使用推薦題組' },
  { icon: 'insights',          text: '班級迷思熱點矩陣' },
  { icon: 'tips_and_updates',  text: '教學行動建議' },
];

const STUDENT_FEATURES = [
  { icon: 'forum',         text: '對話式情境作答' },
  { icon: 'explore',       text: '循序探索科學概念' },
  { icon: 'monitor_heart', text: '個人學習體檢表' },
];

/* ── 木框工具 class（雙層邊框 + 木紋陰影 + 圓角） ─────────────── */
const WOOD_OUTER =
  'bg-gradient-to-b from-[#C19A6B] to-[#8B5E3C] p-[5px] rounded-[28px] ' +
  'shadow-[0_6px_0_-1px_#5A3E22,0_14px_24px_-6px_rgba(91,66,38,0.45)]';
const WOOD_INNER_CREAM =
  'bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7] rounded-[22px] border-2 border-[#FFFFFF]/70';

/* ── 木質頂部標籤（角色名招牌） ───────────────────────────────── */
const SignBoard = ({ children, color = 'green' }) => {
  const palette = color === 'green'
    ? 'bg-gradient-to-b from-[#B8DC83] to-[#7DB044] text-[#2F4A1A] border-[#5C8A2E]'
    : 'bg-gradient-to-b from-[#86CEF5] to-[#4A9FD8] text-[#1A3A5C] border-[#2E6FA0]';
  return (
    <div className={`relative inline-flex items-center justify-center px-5 py-1.5 rounded-full border-2 ${palette}
                     shadow-[0_3px_0_-1px_rgba(0,0,0,0.25),0_5px_8px_-3px_rgba(0,0,0,0.3)]
                     font-game text-base font-bold tracking-wide`}>
      {children}
    </div>
  );
};

/* ── 星等（⭐⭐⭐） ───────────────────────────────────────────── */
const StarRating = ({ count = 3 }) => (
  <div className="inline-flex items-center gap-0.5">
    {[0, 1, 2].map((i) => (
      <Icon
        key={i}
        name="star"
        filled
        className={`text-xl drop-shadow-[0_2px_0_rgba(180,120,30,0.5)] ${
          i < count ? 'text-[#F4C545]' : 'text-[#D8C7A0]'
        }`}
      />
    ))}
  </div>
);

/* ── 角色選擇卡（木框收集冊風格） ─────────────────────────────── */
function RoleCard({ variant, open, onToggleInfo, onSelect }) {
  const isTeacher = variant === 'teacher';
  // 角色色僅用於 CTA 按鈕（其餘元件統一木紋色，避免次要元素搶走視覺焦點）
  // CTA 配色（v2.5 / 2026-04-29）：對齊日系手遊雙按鈕參考（やめとく 鮮綠 + 光りものGET 飽和藍）
  const palette = isTeacher
    ? {
        signColor: 'green',
        // 教師 CTA：鮮綠（やめとく 風）
        ctaBg: 'from-[#A2D550] to-[#65A626]',
        ctaShadow: 'shadow-[0_5px_0_#3E7818,0_8px_14px_-3px_rgba(62,120,24,0.5)] group-hover:shadow-[0_3px_0_#3E7818]',
        ctaBorder: 'border-[#3E7818]',
      }
    : {
        signColor: 'blue',
        // 學生 CTA：飽和天藍（光りものGET 風）
        ctaBg: 'from-[#5BA8DC] to-[#2D8AC4]',
        ctaShadow: 'shadow-[0_5px_0_#1A5F94,0_8px_14px_-3px_rgba(26,95,148,0.5)] group-hover:shadow-[0_3px_0_#1A5F94]',
        ctaBorder: 'border-[#1A5F94]',
      };

  const features  = isTeacher ? TEACHER_FEATURES : STUDENT_FEATURES;
  const heading   = isTeacher ? '我是老師' : '我是學生';
  const tagline   = isTeacher
    ? '出題、查看班級迷思、獲得教學建議'
    : '對話式診斷，獲得個人學習體檢';
  const ctaText   = isTeacher ? 'GO' : 'GO';
  const fadeDelay = isTeacher ? 'animate-fade-up-delay-1' : 'animate-fade-up-delay-2';

  return (
    <div className={`relative flex-1 ${fadeDelay}`}>
      {/* 主卡片：木框外殼 */}
      <button
        onClick={onSelect}
        className={`group block w-full ${WOOD_OUTER}
                   hover:-translate-y-1 hover:scale-[1.02]
                   transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                   text-left`}
      >
        <div className={`relative ${WOOD_INNER_CREAM} px-5 pt-5 pb-5`}>
          {/* 角色名標題（純文字，加大顯眼） */}
          <h2 className="text-center mb-3 text-[#5A3E22] font-black text-2xl tracking-wide drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
            {heading}
          </h2>

          {/* 角色插圖（無方框，直接呈現） */}
          <div className="flex justify-center items-end h-32 mb-3">
            <img
              src={isTeacher ? teacherImg : studentImg}
              alt={heading}
              className="max-h-32 object-contain group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-[0_4px_4px_rgba(91,66,38,0.25)]"
            />
          </div>

          {/* 星等 */}
          <div className="flex justify-center mb-2"><StarRating count={3} /></div>

          {/* 副標 */}
          <p className="text-center text-[#7A5232] text-sm leading-relaxed mb-4 font-medium">
            {tagline}
          </p>

          {/* CTA 按鈕：肥大圓角 + 木紋邊 */}
          <div className={`relative flex items-center justify-center gap-1.5 bg-gradient-to-b ${palette.ctaBg} text-white py-3 rounded-full border-2 ${palette.ctaBorder} ${palette.ctaShadow} group-hover:translate-y-0.5 transition-all duration-200`}>
            <span className="font-game text-2xl font-bold tracking-wider drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{ctaText}</span>
            <Icon name="play_arrow" filled className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>

      {/* ⓘ 資訊按鈕（圓木紐扣） */}
      <button
        type="button"
        aria-label="顯示功能說明"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); onToggleInfo(); }}
        className={`absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full
                   bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                   border-[3px] border-[#8B5E3C]
                   text-[#7A4A18] hover:bg-[#FFF4E0]
                   flex items-center justify-center
                   shadow-[0_3px_0_-1px_#5A3E22,0_5px_8px_-2px_rgba(0,0,0,0.3)]
                   hover:scale-110 hover:rotate-12
                   transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                   ${open ? 'rotate-12 scale-110' : ''}`}
      >
        <Icon name="info" filled className="text-xl" />
      </button>

      {/* Popover */}
      {open && (
        <div
          role="tooltip"
          className={`absolute top-12 right-0 z-20 w-64 ${WOOD_OUTER} animate-fade-up`}
        >
          <div className={`${WOOD_INNER_CREAM} p-4`}>
            <div className="absolute -top-2 right-6 w-4 h-4 bg-[#C19A6B] rotate-45 rounded-sm" />
            <div className="text-xs font-bold text-[#5A3E22] mb-3 flex items-center gap-1">
              <Icon name="menu_book" filled className="text-base" />
              主要功能
            </div>
            <div className="space-y-2">
              {features.map((f) => (
                <div key={f.text} className="flex items-center gap-2 text-sm text-[#5A3E22]">
                  <Icon name={f.icon} className="text-[#D08B2E] text-lg" filled />
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { setRole } = useApp();
  const navigate = useNavigate();
  const [openInfo, setOpenInfo] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenInfo(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'teacher') navigate('/teacher');
    else navigate('/student');
  };

  const handleToggleInfo = (variant) => () => {
    setOpenInfo((prev) => (prev === variant ? null : variant));
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col p-4 sm:p-6"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* ── 上方狀態列（手遊風） ──────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
        {/* 左：吉祥物頭像 + 品牌字 */}
        <div className="flex items-center gap-3">
          {/* 貓頭鷹吉祥物：直接顯示，僅柔軟落地陰影 */}
          <img
            src={mascotImg}
            alt="SciLens 吉祥物"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain animate-breath drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]"
          />
          <span className="font-game font-bold text-[#5A3E22] text-3xl sm:text-4xl drop-shadow-[0_2px_0_rgba(193,154,107,0.5)] tracking-tight">
            SciLens
          </span>
        </div>

        {/* 右：木質齒輪設定按鈕（自製插圖，無外框） */}
        <button
          type="button"
          aria-label="設定"
          className="hover:rotate-90 hover:scale-110
                     transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                     cursor-pointer flex items-center justify-center
                     drop-shadow-[0_4px_4px_rgba(91,66,38,0.35)]"
        >
          <img
            src={settingsIcon}
            alt="設定"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
          />
        </button>
      </div>

      {/* ── 主內容（垂直置中） ───────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* 中央標題（純文字，非互動不套框） */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-up">
          <h1 className="font-game text-4xl sm:text-5xl font-black text-[#5A3E22] tracking-tight leading-none mb-2 drop-shadow-[0_3px_0_rgba(193,154,107,0.5)]">
            迷思概念診斷
          </h1>
          <p className="text-base sm:text-lg font-bold text-[#7A5232] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
            以「水溶液」單元為例 · 國小自然
          </p>
        </div>

        {/* 兩個角色卡 */}
        <div ref={containerRef} className="w-full max-w-3xl flex flex-col sm:flex-row gap-6 sm:gap-12">
          <RoleCard
            variant="teacher"
            open={openInfo === 'teacher'}
            onToggleInfo={handleToggleInfo('teacher')}
            onSelect={() => handleSelect('teacher')}
          />
          <RoleCard
            variant="student"
            open={openInfo === 'student'}
            onToggleInfo={handleToggleInfo('student')}
            onSelect={() => handleSelect('student')}
          />
        </div>
      </div>

      {/* ── 底部資訊（純文字，非互動不套框） ─────────────────── */}
      <div className="relative z-10 flex justify-center mt-4 sm:mt-6 animate-fade-up-delay-3">
        <p className="text-xs sm:text-sm font-medium text-[#5A3E22] flex items-center gap-1.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
          <Icon name="account_tree" filled className="text-[#7A5232] text-base" />
          水溶液單元 · INe-II-3-01 至 INe-Ⅲ-5-7（共 12 個知識節點）
        </p>
      </div>
    </div>
  );
}
