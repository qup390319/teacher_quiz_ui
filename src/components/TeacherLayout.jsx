import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
};

const navItems = [
  { to: '/teacher', label: '首頁', icon: ICONS.home },

  { section: '考卷' },
  {
    group: 'quiz',
    label: '出題',
    icon: ICONS.pencil,
    alwaysOpen: true,
    children: [
      { to: '/teacher/quizzes',  label: 'step 1. 診斷出題' },
      { to: '/teacher/scenarios', label: 'step 2. 情境出題' },
    ],
  },
  {
    group: 'assignment',
    label: '派題',
    icon: ICONS.send,
    alwaysOpen: true,
    children: [
      { to: '/teacher/assignments/diagnosis', label: 'step 1. 診斷考卷' },
      { to: '/teacher/assignments/scenarios', label: 'step 2. 情境考卷' },
    ],
  },

  { section: '看結果' },
  {
    group: 'dashboard',
    label: '診斷結果',
    icon: ICONS.chart,
    children: [
      { to: '/teacher/dashboard/overview',       label: '全年級總覽' },
      { to: '/teacher/dashboard/classes',        label: '各班學習狀況' },
      { to: '/teacher/dashboard/nodes',          label: '知識節點跨班比較' },
      { to: '/teacher/dashboard/misconceptions', label: '跨班高頻迷思' },
      { to: '/teacher/dashboard/class-detail',   label: '各班詳細報告' },
    ],
  },
  { to: '/teacher/treatment-logs', label: '治療對話紀錄', icon: ICONS.chat },

  { section: '班級' },
  { to: '/teacher/classes', label: '班級管理', icon: ICONS.users },

  { section: '其他' },
  { to: '/teacher/knowledge-map', label: '知識節點總覽', icon: ICONS.grid },
];

function isGroupActive(children, pathname) {
  return children.some(c => pathname === c.to || pathname.startsWith(c.to + '/'));
}

export default function TeacherLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openOverrides, setOpenOverrides] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // 抽屜開啟時鎖住 body 卷軸（避免 iOS 背景滾動）
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

  const sidebar = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#D5D8DC] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C8EAAE] border border-[#BDC3C7] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#3D5A3E]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m21 21-5.5-5.5" />
              <circle cx="10.5" cy="10.5" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-[#2D3436] tracking-tight">SciLens</p>
            <p className="text-xs text-[#5A8A5C] leading-tight font-medium">迷思概念診斷 · 教師端</p>
          </div>
        </div>
        {/* 手機抽屜內的關閉鈕 */}
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {navItems.map((item, i) => {
          if (item.section) {
            return (
              <p key={`section-${i}`} className="px-3 pt-3 pb-0.5 text-xs font-semibold text-[#95A5A6] uppercase tracking-wider select-none">
                {item.section}
              </p>
            );
          }
          if (item.group) {
            const active = isGroupActive(item.children, location.pathname);
            const expanded = item.alwaysOpen || active || (openOverrides[item.group] ?? false);
            const childList = (
              <div className="ml-3 pl-3 border-l border-[#D5D8DC]">
                {item.children.map(child => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={closeDrawer}
                    className={({ isActive }) =>
                      `block px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#EEF5E6] text-[#3D5A3E] border border-[#8FC87A]'
                          : 'text-[#636E72] hover:bg-[#EEF5E6] hover:text-[#2D3436] border border-transparent'
                      }`
                    }
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium select-none ${
                      active
                        ? 'text-[#2D3436]'
                        : 'text-[#636E72]'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#C8EAAE] text-[#2D3436] border border-[#8FC87A]'
                      : 'text-[#636E72] hover:bg-[#EEF5E6] hover:text-[#2D3436] border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
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
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#C8EAAE] text-[#2D3436] border border-[#8FC87A]'
                    : 'text-[#636E72] hover:bg-[#EEF5E6] hover:text-[#2D3436]'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
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
      {/* Desktop sidebar (≥ md) */}
      <aside className="hidden md:flex w-60 bg-white border-r border-[#D5D8DC] flex-col flex-shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
        {sidebar}
      </aside>

      {/* Mobile drawer (< md) */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="關閉選單背景"
          className="absolute inset-0 bg-black/40"
        />
        {/* Drawer */}
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

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Mobile top bar with hamburger */}
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
