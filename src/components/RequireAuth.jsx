import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 受保護路由 wrapper。
 *  <RequireAuth role="teacher"><TeacherPage /></RequireAuth>
 *
 * - 載入中：顯示簡易 loading
 * - 未登入：導回 /
 * - role mismatch：導回 / （清楚錯誤即可，不打擾）
 */
export default function RequireAuth({ role, children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#5A3E22] text-lg font-medium">
        載入中…
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  if (role && currentUser.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}
