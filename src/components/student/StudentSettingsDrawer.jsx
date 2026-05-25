import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icon, WOOD_OUTER, WOOD_INNER_CREAM } from '../ui/woodKit';
import { FONT_SIZE_OPTIONS, getFontSize, setFontSize } from '../../lib/fontSize';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

const FONT_SIZE_ICONS = { small: 'text_decrease', medium: 'format_size', large: 'text_increase' };

export default function StudentSettingsDrawer({ open, onClose }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentFontSize, setCurrentFontSize] = useState(getFontSize);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleFontChange = (value) => {
    setFontSize(value);
    setCurrentFontSize(value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const studentName = currentUser?.name ?? '探險者';
  const classLabel = currentUser?.className ?? currentUser?.classId ?? '—';
  const seatNumber = currentUser?.seatNumber ?? currentUser?.seat ?? '—';

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
                    ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] max-w-full
                    flex flex-col transform transition-transform duration-300 ease-out
                    bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                    shadow-[-4px_0_20px_rgba(91,66,38,0.25)]
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-[#C19A6B] flex-shrink-0
                        bg-gradient-to-r from-[#C19A6B] to-[#8B5E3C]">
          <div className="flex items-center gap-2">
            <Icon name="settings" filled className="text-2xl text-[#FFF8E7]" />
            <h2 className="font-game text-xl font-bold text-[#FFF8E7] tracking-wide
                           drop-shadow-[0_2px_0_rgba(91,66,38,0.5)]">
              設定
            </h2>
          </div>
          <button
            type="button"
            aria-label="關閉設定"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white
                       flex items-center justify-center
                       transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                       hover:scale-110 hover:rotate-90"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* ── scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {/* 1 — 字體大小 */}
          <SettingsSection icon="format_size" title="字體大小">
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZE_OPTIONS.map((opt) => {
                const active = currentFontSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleFontChange(opt.value)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-[3px]
                               font-game font-bold transition-all duration-300
                               ease-[cubic-bezier(0.34,1.56,0.64,1)]
                               ${active
                                 ? 'border-[#D08B2E] bg-gradient-to-b from-[#FFF1D8] to-[#F0B962]/30 scale-105 shadow-[0_3px_0_-1px_#9B5E18,0_4px_8px_-2px_rgba(155,94,24,0.3)]'
                                 : 'border-[#C19A6B]/50 bg-white/60 hover:border-[#C19A6B] hover:scale-[1.03]'
                               }`}
                  >
                    <Icon
                      name={FONT_SIZE_ICONS[opt.value]}
                      filled
                      className={`text-2xl ${active ? 'text-[#D08B2E]' : 'text-[#8B5E3C]'}`}
                    />
                    <span className={`text-sm ${active ? 'text-[#9B5E18]' : 'text-[#7A5232]'}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* 2 — 個人資訊 */}
          <SettingsSection icon="person" title="個人資訊">
            <div className="space-y-2.5">
              <InfoRow icon="badge" label="姓名" value={studentName} />
              <InfoRow icon="school" label="班級" value={classLabel} />
              <InfoRow icon="event_seat" label="座號" value={seatNumber} />
            </div>
          </SettingsSection>

          {/* 3 — 關於系統 */}
          <SettingsSection icon="info" title="關於系統">
            <button
              type="button"
              onClick={() => setAboutOpen((v) => !v)}
              className="w-full flex items-center justify-between py-2 px-1 text-left
                         text-[#5A3E22] font-bold text-sm hover:text-[#D08B2E]
                         transition-colors duration-200"
            >
              <span>查看使用說明</span>
              <Icon
                name="expand_more"
                filled
                className={`text-xl text-[#7A5232] transition-transform duration-300 ${aboutOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {aboutOpen && (
              <div className="animate-fade-up space-y-3 pt-1">
                <div className="flex items-center gap-3 pb-2">
                  <img src={mascotImg} alt="SciLens 吉祥物" className="w-14 h-14 object-contain animate-breath" />
                  <div>
                    <p className="font-game text-lg font-bold text-[#5A3E22]">SciLens</p>
                    <p className="text-xs text-[#7A5232]">自然科學迷思概念診斷系統</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-[#5A3E22] leading-relaxed">
                  <AboutItem icon="science" text="針對國小五年級「水溶液」單元設計" />
                  <AboutItem icon="quiz" text="透過診斷測驗找出你的迷思概念" />
                  <AboutItem icon="insights" text="完成後查看個人學習報告" />
                </div>

                <div className="pt-2 border-t border-[#C19A6B]/30">
                  <p className="text-xs text-[#7A5232]/70 text-center">
                    SciLens v1.0
                  </p>
                </div>
              </div>
            )}
          </SettingsSection>
        </div>

        {/* ── footer: logout ── */}
        <div className="px-4 py-4 border-t-[3px] border-[#C19A6B] flex-shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                       border-[3px] border-[#E74C5E]/60 bg-white
                       text-[#E74C5E] font-game font-bold text-base tracking-wide
                       shadow-[0_3px_0_-1px_rgba(231,76,94,0.3)]
                       hover:bg-[#FDE2E4] hover:border-[#E74C5E] hover:translate-y-0.5
                       hover:shadow-[0_1px_0_-1px_rgba(231,76,94,0.3)]
                       transition-all duration-200"
          >
            <Icon name="logout" filled className="text-xl" />
            登出
          </button>
        </div>
      </div>
    </>
  );
}

/* ── sub-components ── */

function SettingsSection({ icon, title, children }) {
  return (
    <div className={WOOD_OUTER.replace('rounded-[28px]', 'rounded-[20px]')
                               .replace('shadow-[0_6px_0_-1px_#5A3E22,0_14px_24px_-6px_rgba(91,66,38,0.45)]',
                                        'shadow-[0_4px_0_-1px_#5A3E22,0_8px_16px_-4px_rgba(91,66,38,0.3)]')}>
      <div className={`${WOOD_INNER_CREAM.replace('rounded-[22px]', 'rounded-[15px]')} px-4 py-3`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon name={icon} filled className="text-xl text-[#D08B2E]" />
          <h3 className="font-bold text-[#5A3E22] text-base">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/50">
      <Icon name={icon} filled className="text-lg text-[#8B5E3C]" />
      <span className="text-sm text-[#7A5232] font-bold min-w-[3rem]">{label}</span>
      <span className="text-sm text-[#5A3E22] font-black">{value}</span>
    </div>
  );
}

function AboutItem({ icon, text }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} filled className="text-lg text-[#D08B2E] flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}
