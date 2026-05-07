import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { FONT_SIZE_OPTIONS, getFontSize, setFontSize } from '../lib/fontSize';
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

/* ── 星等 ───────────────────────────────────────────── */
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

/* ── 角色選擇卡 ───────────────────────────────────────── */
function RoleCard({ variant, open, onToggleInfo, onSelect }) {
  const isTeacher = variant === 'teacher';
  const palette = isTeacher
    ? {
        ctaBg: 'from-[#A2D550] to-[#65A626]',
        ctaShadow: 'shadow-[0_5px_0_#3E7818,0_8px_14px_-3px_rgba(62,120,24,0.5)] group-hover:shadow-[0_3px_0_#3E7818]',
        ctaBorder: 'border-[#3E7818]',
      }
    : {
        ctaBg: 'from-[#5BA8DC] to-[#2D8AC4]',
        ctaShadow: 'shadow-[0_5px_0_#1A5F94,0_8px_14px_-3px_rgba(26,95,148,0.5)] group-hover:shadow-[0_3px_0_#1A5F94]',
        ctaBorder: 'border-[#1A5F94]',
      };

  const features  = isTeacher ? TEACHER_FEATURES : STUDENT_FEATURES;
  const heading   = isTeacher ? '我是老師' : '我是學生';
  const tagline   = isTeacher
    ? '出題、查看班級迷思、獲得教學建議'
    : '對話式診斷，獲得個人學習體檢';
  const fadeDelay = isTeacher ? 'animate-fade-up-delay-1' : 'animate-fade-up-delay-2';

  return (
    <div className={`relative flex-1 ${fadeDelay}`}>
      <button
        onClick={onSelect}
        className={`group block w-full ${WOOD_OUTER}
                   hover:-translate-y-1 hover:scale-[1.02]
                   transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                   text-left`}
      >
        <div className={`relative ${WOOD_INNER_CREAM} px-5 pt-5 pb-5`}>
          <h2 className="text-center mb-3 text-[#5A3E22] font-black text-2xl tracking-wide drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
            {heading}
          </h2>
          <div className="flex justify-center items-end h-32 mb-3">
            <img
              src={isTeacher ? teacherImg : studentImg}
              alt={heading}
              className="max-h-32 object-contain group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-[0_4px_4px_rgba(91,66,38,0.25)]"
            />
          </div>
          <div className="flex justify-center mb-2"><StarRating count={3} /></div>
          <p className="text-center text-[#7A5232] text-sm leading-relaxed mb-4 font-medium">
            {tagline}
          </p>
          <div className={`relative flex items-center justify-center gap-1.5 bg-gradient-to-b ${palette.ctaBg} text-white py-3 rounded-full border-2 ${palette.ctaBorder} ${palette.ctaShadow} group-hover:translate-y-0.5 transition-all duration-200`}>
            <span className="font-game text-2xl font-bold tracking-wider drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">GO</span>
            <Icon name="play_arrow" filled className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>

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

      {open && (
        <div role="tooltip" className={`absolute top-12 right-0 z-20 w-64 ${WOOD_OUTER} animate-fade-up`}>
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

/* ── 登入彈窗（spec-13 §8.3） ─────────────────────────────── */
function LoginModal({ variant, onClose, onSuccess }) {
  const { login } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const isTeacher = variant === 'teacher';
  const heading = isTeacher ? '老師登入' : '學生登入';
  const hintAccount = isTeacher ? '範例：aaa001' : '範例：115001';
  const ctaBg = isTeacher
    ? 'from-[#A2D550] to-[#65A626] border-[#3E7818] shadow-[0_4px_0_#3E7818]'
    : 'from-[#5BA8DC] to-[#2D8AC4] border-[#1A5F94] shadow-[0_4px_0_#1A5F94]';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await login(account.trim(), password);
      if (variant && user.role !== variant) {
        setError(`此帳號不是${isTeacher ? '老師' : '學生'}，請確認後再試。`);
        return;
      }
      onSuccess(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('帳號或密碼錯誤，請再試一次。');
      } else {
        setError('登入失敗，請稍後再試。');
        console.error('[login]', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-sm ${WOOD_OUTER} animate-fade-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${WOOD_INNER_CREAM} p-6`}>
          <h3 className="text-center text-2xl font-black text-[#5A3E22] mb-1 drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
            {heading}
          </h3>
          <p className="text-center text-sm text-[#7A5232] mb-5">請輸入帳號與密碼</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5A3E22] mb-1">帳號</label>
              <input
                ref={inputRef}
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={hintAccount}
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[#C19A6B] bg-white/80
                           text-[#5A3E22] placeholder:text-[#B6A284]
                           focus:outline-none focus:border-[#8B5E3C] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5A3E22] mb-1">密碼</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border-2 border-[#C19A6B] bg-white/80
                             text-[#5A3E22] placeholder:text-[#B6A284]
                             focus:outline-none focus:border-[#8B5E3C] focus:bg-white"
                  required
                />
                <button
                  type="button"
                  aria-label={showPwd ? '隱藏密碼' : '顯示密碼'}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                             text-[#7A5232] hover:text-[#5A3E22]"
                >
                  <Icon name={showPwd ? 'visibility_off' : 'visibility'} className="text-lg" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#9B7A4F]">預設密碼與帳號相同</p>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full border-2 border-[#C19A6B] bg-white/70 text-[#5A3E22] font-bold hover:bg-white"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-[1.4] py-2.5 rounded-full border-2 bg-gradient-to-b ${ctaBg}
                           text-white font-game text-lg font-bold tracking-wide
                           disabled:opacity-60 disabled:cursor-not-allowed
                           hover:translate-y-0.5 transition-transform`}
              >
                {submitting ? '登入中…' : '登入'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── 設定彈窗（字體大小） ─────────────────────────────── */
function SettingsPopover({ fontSize, onChange }) {
  return (
    <div
      role="dialog"
      aria-label="設定"
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute top-full right-0 z-30 ${WOOD_OUTER} animate-fade-up`}
      style={{ marginTop: '8px', width: '240px', fontSize: '16px' }}
    >
      <div className={`${WOOD_INNER_CREAM} p-4`} style={{ fontSize: '16px' }}>
        <div className="absolute -top-2 right-8 w-4 h-4 bg-[#C19A6B] rotate-45 rounded-sm" />
        <div className="text-xs font-bold text-[#5A3E22] mb-3 flex items-center gap-1">
          <Icon name="format_size" filled className="text-base" />
          字體大小
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FONT_SIZE_OPTIONS.map((opt) => {
            const active = opt.value === fontSize;
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
                aria-pressed={active}
                style={{ padding: '8px 0', borderRadius: '12px', fontSize: `${opt.px}px` }}
                className={`border-2 font-bold transition-colors
                  ${active
                    ? 'bg-gradient-to-b from-[#A2D550] to-[#65A626] border-[#3E7818] text-white shadow-[0_3px_0_#3E7818]'
                    : 'bg-white/70 border-[#C19A6B] text-[#5A3E22] hover:bg-white'}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [openInfo, setOpenInfo] = useState(null);
  const [loginVariant, setLoginVariant] = useState(null); // 'teacher' | 'student' | null
  const [openSettings, setOpenSettings] = useState(false);
  const [fontSize, setFontSizeState] = useState(getFontSize);
  const containerRef = useRef(null);
  const settingsRef = useRef(null);

  const handleFontSizeChange = (value) => {
    setFontSize(value);
    setFontSizeState(value);
  };

  // 已登入者直接導向對應頁
  useEffect(() => {
    if (loading) return;
    if (currentUser?.role === 'teacher') navigate('/teacher', { replace: true });
    else if (currentUser?.role === 'student') navigate('/student', { replace: true });
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenInfo(null);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setOpenSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (variant) => () => setLoginVariant(variant);
  const handleToggleInfo = (variant) => () => {
    setOpenInfo((prev) => (prev === variant ? null : variant));
  };
  const handleLoginSuccess = (user) => {
    setLoginVariant(null);
    navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
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
      <div className="relative z-30 flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <img
            src={mascotImg}
            alt="SciLens 吉祥物"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain animate-breath drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]"
          />
          <span className="font-game font-bold text-[#5A3E22] text-3xl sm:text-4xl drop-shadow-[0_2px_0_rgba(193,154,107,0.5)] tracking-tight">
            SciLens
          </span>
        </div>
        <div ref={settingsRef} className="relative z-40">
          <button
            type="button"
            aria-label="設定"
            aria-expanded={openSettings}
            onClick={() => setOpenSettings((v) => !v)}
            className={`hover:rotate-90 hover:scale-110
                       transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                       cursor-pointer flex items-center justify-center
                       drop-shadow-[0_4px_4px_rgba(91,66,38,0.35)]
                       ${openSettings ? 'rotate-90 scale-110' : ''}`}
          >
            <img src={settingsIcon} alt="設定" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
          </button>
          {openSettings && (
            <SettingsPopover fontSize={fontSize} onChange={handleFontSizeChange} />
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-12 sm:mb-16 animate-fade-up">
          <h1 className="font-game text-4xl sm:text-5xl font-black text-[#5A3E22] tracking-tight leading-none mb-2 drop-shadow-[0_3px_0_rgba(193,154,107,0.5)]">
            迷思概念診斷
          </h1>
          <p className="text-base sm:text-lg font-bold text-[#7A5232] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
            以「水溶液」單元為例 · 國小自然
          </p>
        </div>

        <div ref={containerRef} className="w-full max-w-3xl flex flex-col sm:flex-row gap-6 sm:gap-12">
          <RoleCard
            variant="teacher"
            open={openInfo === 'teacher'}
            onToggleInfo={handleToggleInfo('teacher')}
            onSelect={handleSelect('teacher')}
          />
          <RoleCard
            variant="student"
            open={openInfo === 'student'}
            onToggleInfo={handleToggleInfo('student')}
            onSelect={handleSelect('student')}
          />
        </div>
      </div>

      <div className="relative z-10 flex justify-center mt-4 sm:mt-6 animate-fade-up-delay-3">
        <p className="text-xs sm:text-sm font-medium text-[#5A3E22] flex items-center gap-1.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
          <Icon name="account_tree" filled className="text-[#7A5232] text-base" />
          水溶液單元 · INe-II-3-01 至 INe-Ⅲ-5-7（共 12 個知識節點）
        </p>
      </div>

      {loginVariant && (
        <LoginModal
          variant={loginVariant}
          onClose={() => setLoginVariant(null)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
