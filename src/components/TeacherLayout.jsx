import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const navItems = [
  {
    to: '/teacher',
    label: '首頁',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/teacher/dashboard',
    label: '診斷結果',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  { section: '考卷' },
  {
    to: '/teacher/quizzes',
    label: '出題管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/teacher/assignments',
    label: '派題管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    ),
  },
  { section: '班級' },
  {
    to: '/teacher/classes',
    label: '班級管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  { section: '其他' },
  {
    to: '/teacher/knowledge-map',
    label: '知識節點總覽',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
      </svg>
    ),
  },
];

export default function TeacherLayout({ children }) {
  const { setRole } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    setRole(null);
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-[#EEF5E6]">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-[#D5D8DC] flex flex-col flex-shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#D5D8DC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#C8EAAE] border border-[#BDC3C7] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 20.4a3.001 3.001 0 01-2.121-.872l-.347-.347z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-[#2D3436]">迷思概念診斷</p>
              <p className="text-xs text-[#5A8A5C] leading-tight font-medium">教師端</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item, i) =>
            item.section ? (
              <p key={i} className="px-3 pt-4 pb-1 text-xs font-semibold text-[#95A5A6] uppercase tracking-wider select-none">
                {item.section}
              </p>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/teacher'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#C8EAAE] text-[#2D3436] border border-[#8FC87A]'
                      : 'text-[#636E72] hover:bg-[#EEF5E6] hover:text-[#2D3436]'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          )}
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
            切換角色
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
