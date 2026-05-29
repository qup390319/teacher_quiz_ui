import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 管理員後台 Layout（spec-14）。
 * - 左側白色 sidebar（240px），active 項以薄荷綠膠囊 + 左側 3px 強調條呈現
 * - 頂部 header：當前頁標題 + admin 頭像 dropdown
 * - 內容區背景 `#F4F8F6`
 */

const NAV_ITEMS = [
  { to: '/admin', label: '首頁', icon: 'space_dashboard', end: true },
  { to: '/admin/users', label: '帳號管理', icon: 'group' },
  { to: '/admin/classes', label: '班級總覽', icon: 'school' },
  { to: '/admin/units', label: '單元管理', icon: 'category' },
  { to: '/admin/subthemes', label: '課綱次主題庫', icon: 'menu_book' },
  { to: '/admin/knowledge-nodes', label: '知識節點', icon: 'account_tree' },
  { to: '/admin/sample-quizzes', label: '範例題庫', icon: 'library_books' },
];

function SidebarItem({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[#DCFCE7] text-[#15803D] font-semibold'
            : 'text-[#4B5563] hover:bg-[#F4F8F6]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#15803D] rounded-r" />
          )}
          <span className="material-symbols-rounded text-xl">{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout({ title, breadcrumb, children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F6] flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#7DD3A8] flex items-center justify-center text-white">
              <span className="material-symbols-rounded text-xl">admin_panel_settings</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#1F2937] leading-tight">SciLens Admin</div>
              <div className="text-[11px] text-[#6B7280]">系統管理後台</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Footer (admin info + logout) */}
        <div className="px-3 py-4 border-t border-[#E5E7EB] space-y-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center font-semibold text-sm">
              {currentUser?.account?.slice(0, 2).toUpperCase() ?? 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#1F2937] truncate">
                {currentUser?.name || currentUser?.account || '管理員'}
              </div>
              <div className="text-[11px] text-[#6B7280]">管理員</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium
                       text-[#4B5563] hover:bg-[#F4F8F6] transition-colors"
          >
            <span className="material-symbols-rounded text-xl">logout</span>
            登出
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E7EB] px-8 py-5">
          {breadcrumb && (
            <nav className="text-xs text-[#6B7280] mb-1">{breadcrumb}</nav>
          )}
          <h1 className="text-xl font-bold text-[#1F2937]">{title}</h1>
        </header>

        {/* Page content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
