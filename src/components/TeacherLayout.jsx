import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeacherStageStatus } from '../hooks/useTeacherStageStatus';
import AIBadge from './AIBadge';
import teacherAvatar from '../assets/illustrations/irasutoya_teacher_boy.png';

const ICONS = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  pencil: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  send: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  grid: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
    </svg>
  ),
  bulb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z" />
    </svg>
  ),
};

/**
 * D1：依教學流程（Use Case）排列 sidebar。
 * D2：nextStep 階段以細小 pulsing dot 提示「建議下一步」（不顯示文字 chip，降低認知負荷）。
 * D7：用到 AI 的項目以 AIBadge 標示，hover 顯示說明。
 */
const navItems = [
  { to: '/teacher', label: '首頁', icon: ICONS.home },

  { section: '① 出診斷題', flow: 'quiz' },
  {
    to: '/teacher/quizzes',
    label: '診斷題組編輯',
    icon: ICONS.pencil,
    ai: { description: '出題輔助：RAGFlow 從教材檢索並建議題目' },
  },

  { section: '② 派題給班級', flow: 'assign' },
  { to: '/teacher/assignments/diagnosis', label: '派發診斷題組', icon: ICONS.send },

  { section: '③ 看診斷結果', flow: 'dashboard' },
  {
    group: 'dashboard',
    label: '診斷儀表板',
    icon: ICONS.chart,
    ai: { description: 'AI 報告摘要：LLM 彙整班級表現重點' },
    children: [
      { to: '/teacher/dashboard/overview',       label: '所有班級答題分布' },
      { to: '/teacher/dashboard/classes',        label: '各班級比較' },
      { to: '/teacher/dashboard/nodes',          label: '知識節點答對率' },
      { to: '/teacher/dashboard/misconceptions', label: '高頻迷思排行' },
      { to: '/teacher/dashboard/students',       label: '個別學生報告' },
    ],
  },
  {
    to: '/teacher/diagnosis-logs',
    label: '診斷對話紀錄',
    icon: ICONS.chat,
    ai: { description: 'AI 追問：LLM 根據學生作答產生 POE 追問' },
  },

  { section: '④ 概念釐清・補救', flow: 'remediation' },
  { to: '/teacher/scenarios', label: '釐清題組編輯', icon: ICONS.pencil },
  { to: '/teacher/assignments/scenarios', label: '派發釐清題組', icon: ICONS.send },
  {
    to: '/teacher/treatment-outcomes',
    label: '概念釐清結果',
    icon: ICONS.chart,
    ai: { description: '從對話自動衍生：各題釐清程度、整體星等、AI 判定是否釐清' },
  },
  {
    to: '/teacher/treatment-logs',
    label: '釐清對話紀錄',
    icon: ICONS.chat,
    ai: { description: 'AI 補救對話：LLM 引導 CER 概念釐清' },
  },

  // 分隔線：以下與教學流程順序無關
  { divider: true },

  { section: '班級' },
  { to: '/teacher/classes', label: '班級名單管理', icon: ICONS.users },

  { section: '其他' },
  { to: '/teacher/misconception-causes', label: '迷思概念成因', icon: ICONS.bulb },
  { to: '/teacher/knowledge-map', label: '(預設) 知識節點總覽', icon: ICONS.grid },
  { to: '/teacher/custom-knowledge-map', label: '(自定義) 知識節點總覽', icon: ICONS.grid },
];

// 教學流程 section 用各自主色；班級/其他為輔助功能，採低調中性灰
const SECTION_STYLES = {
  '① 出診斷題':       { color: '#4A7324', bg: '#E4F1CE', border: '#8FC87A', label: '#2E4A1A', activeBg: '#C8DFAA', activeBorder: '#5C8A2E', hoverBg: '#D8E9BC' },
  '② 派題給班級':     { color: '#1F7A8C', bg: '#D4ECF1', border: '#5BA4B7', label: '#0E3E47', activeBg: '#A8D8E1', activeBorder: '#1F7A8C', hoverBg: '#C0E0E8' },
  '③ 看診斷結果':     { color: '#1F6FAB', bg: '#D6EAF8', border: '#5DADE2', label: '#0E3A5C', activeBg: '#A9CCE3', activeBorder: '#2E86C1', hoverBg: '#C5DFF2' },
  '④ 概念釐清・補救': { color: '#8A3F76', bg: '#F2DDED', border: '#C77DBA', label: '#502047', activeBg: '#E5C2DA', activeBorder: '#8A3F76', hoverBg: '#EBD0E2' },
  '班級':             { color: '#6B6F71', bg: '#F4F5F5', border: '#D5D8DC', label: '#4A4D4F', activeBg: '#E5E7E8', activeBorder: '#95A5A6', hoverBg: '#ECEDEE' },
  '其他':             { color: '#6B6F71', bg: '#F4F5F5', border: '#D5D8DC', label: '#4A4D4F', activeBg: '#E5E7E8', activeBorder: '#95A5A6', hoverBg: '#ECEDEE' },
};

function isGroupActive(children, pathname) {
  return children.some(c => pathname === c.to || pathname.startsWith(c.to + '/'));
}

/**
 * nextStep 提示：純小 pulsing dot，不顯示文字 chip，降低 sidebar 認知負荷
 */
function NextStepDot({ ss }) {
  return (
    <span className="relative flex w-2 h-2 flex-shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: ss?.activeBorder }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: ss?.activeBorder }} />
    </span>
  );
}

export default function TeacherLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stageStatus = useTeacherStageStatus();
  const [openOverrides, setOpenOverrides] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  const toggleGroup = (key) =>
    setOpenOverrides(prev => ({ ...prev, [key]: !(prev[key] ?? false) }));

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const groupedSections = (() => {
    const sections = [];
    let topItems = [];
    let currentSection = null;
    let currentMeta = null;
    let currentItems = [];
    for (const item of navItems) {
      if (item.divider) {
        if (currentSection) {
          sections.push({ section: currentSection, meta: currentMeta, items: currentItems });
          currentSection = null;
          currentItems = [];
        }
        sections.push({ divider: true });
      } else if (item.section) {
        if (currentSection) sections.push({ section: currentSection, meta: currentMeta, items: currentItems });
        currentSection = item.section;
        currentMeta = { flow: item.flow };
        currentItems = [];
      } else if (!currentSection) {
        topItems.push(item);
      } else {
        currentItems.push(item);
      }
    }
    if (currentSection) sections.push({ section: currentSection, meta: currentMeta, items: currentItems });
    return { topItems, sections };
  })();

  const renderNavItem = (item, ss) => {
    if (item.group) {
      const active = isGroupActive(item.children, location.pathname);
      const expanded = item.alwaysOpen || (openOverrides[item.group] ?? active);
      const childList = (
        <div className="ml-4 pl-3" style={{ borderLeft: `2px solid ${ss?.color || '#D5D8DC'}` }}>
          {item.children.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'border-l-4 -ml-px' : 'border border-transparent'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: ss?.activeBg, color: ss?.label, borderLeftColor: ss?.color }
                  : undefined
              }
              onMouseEnter={(e) => { if (!e.currentTarget.classList.contains('border-l-4')) e.currentTarget.style.backgroundColor = ss?.hoverBg || ''; }}
              onMouseLeave={(e) => { if (!e.currentTarget.classList.contains('border-l-4')) e.currentTarget.style.backgroundColor = ''; }}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      );
      if (item.alwaysOpen) {
        return (
          <div key={item.group}>
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[15px] font-semibold select-none [&_svg]:w-5 [&_svg]:h-5 ${
                active ? 'text-[#2D3436]' : 'text-[#4A4D4F]'
              }`}
            >
              <span className="flex-shrink-0" style={{ color: ss?.color }}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.ai && <AIBadge description={item.ai.description} size="xs" />}
            </div>
            {childList}
          </div>
        );
      }
      return (
        <div key={item.group}>
          <button
            type="button"
            onClick={() => toggleGroup(item.group)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[15px] font-semibold transition-colors [&_svg]:w-5 [&_svg]:h-5 ${
              active ? 'text-[#2D3436]' : 'text-[#4A4A4A]'
            }`}
            style={active ? { backgroundColor: ss?.activeBg, border: `2px solid ${ss?.activeBorder}` } : { border: '2px solid transparent' }}
          >
            <span className="flex-shrink-0" style={{ color: ss?.color }}>{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.ai && <AIBadge description={item.ai.description} size="xs" />}
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && childList}
        </div>
      );
    }
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/teacher'}
        onClick={closeDrawer}
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2.5 rounded-xl text-[15px] font-semibold transition-colors [&_svg]:w-5 [&_svg]:h-5 ${
            isActive ? 'text-[#2D3436]' : 'text-[#636E72]'
          }`
        }
        style={({ isActive }) =>
          isActive
            ? { backgroundColor: ss?.activeBg, border: `2px solid ${ss?.activeBorder}` }
            : undefined
        }
        onMouseEnter={(e) => { if (!e.currentTarget.style.backgroundColor) e.currentTarget.style.backgroundColor = ss?.hoverBg || ''; }}
        onMouseLeave={(e) => { if (!e.currentTarget.style.backgroundColor?.includes(ss?.activeBg)) e.currentTarget.style.backgroundColor = ''; }}
      >
        <span className="flex-shrink-0" style={{ color: ss?.color }}>{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.ai && <AIBadge description={item.ai.description} size="xs" />}
      </NavLink>
    );
  };

  const renderNavSections = () => (
    <>
      {groupedSections.topItems.map(item => renderNavItem(item, null))}
      {groupedSections.sections.map((sec, idx) => {
        if (sec.divider) {
          return <div key={`divider-${idx}`} className="my-3 mx-2 border-t border-[#D5D8DC]" />;
        }
        const { section, meta, items } = sec;
        const ss = SECTION_STYLES[section];
        const isNext = meta?.flow && stageStatus.nextStep === meta.flow;
        return (
          <div
            key={section}
            className="rounded-xl overflow-hidden mt-3"
            style={{
              backgroundColor: ss?.bg,
              border: `2px solid ${ss?.border}`,
              boxShadow: isNext ? `0 0 0 2px ${ss?.activeBorder}55, 0 2px 8px ${ss?.activeBorder}33` : undefined,
            }}
          >
            <div
              className="px-3 py-1.5 select-none"
              style={{ borderBottom: `2px solid ${ss?.border}` }}
            >
              <div className="flex items-center gap-2">
                {isNext && <NextStepDot ss={ss} />}
                <p
                  className="tracking-wider flex-1 text-sm font-bold"
                  style={{ color: ss?.label }}
                >
                  {section}
                </p>
              </div>
            </div>
            <div className="px-1 py-1.5 space-y-0.5">
              {items.map(item => renderNavItem(item, ss))}
            </div>
          </div>
        );
      })}
    </>
  );

  const sidebar = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#D5D8DC] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C8EAAE] border border-[#BDC3C7] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={teacherAvatar} alt="教師" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-[#2D3436] tracking-tight">SciLens</p>
            <p className="text-sm text-[#5A8A5C] leading-tight font-medium">迷思概念診斷 · 教師端</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="關閉選單"
          className="md:hidden -mr-1 p-1.5 rounded-lg text-[#636E72] hover:bg-[#EEF5E6]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {renderNavSections()}
      </nav>

      <div className="px-3 py-3 border-t border-[#D5D8DC]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#636E72] hover:text-[#2D3436] hover:bg-[#EEF5E6] rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          登出
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#EEF5E6]">
      <aside className="hidden md:flex w-60 bg-white border-r border-[#D5D8DC] flex-col flex-shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
        {sidebar}
      </aside>

      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="關閉選單背景"
          className="absolute inset-0 bg-black/40"
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-[#D5D8DC] flex flex-col shadow-[4px_0_16px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="教師端選單"
        >
          {sidebar}
        </aside>
      </div>

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur border-b border-[#D5D8DC]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="開啟選單"
            className="p-1.5 -ml-1 rounded-lg text-[#2D3436] hover:bg-[#EEF5E6] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#C8EAAE] border border-[#BDC3C7] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#3D5A3E]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m21 21-5.5-5.5" />
              </svg>
            </div>
            <p className="text-sm font-bold text-[#2D3436]">SciLens</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
