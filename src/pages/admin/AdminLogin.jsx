import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';

/**
 * 管理員登入頁（spec-14 / spec-13 §8）。
 * 獨立於 `/`（角色卡頁）；不在師生介面露出入口。
 * 風格：薄荷綠 SaaS dashboard，與 spec-07 木框風完全切割。
 */
export default function AdminLogin() {
  const { login, logout, currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // 已登入者自動導向對應頁
  useEffect(() => {
    if (loading || !currentUser) return;
    if (currentUser.role === 'admin') navigate('/admin', { replace: true });
    else if (currentUser.role === 'teacher') navigate('/teacher', { replace: true });
    else if (currentUser.role === 'student') navigate('/student', { replace: true });
  }, [currentUser, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await login(account.trim(), password, 'admin');
      if (user.role !== 'admin') {
        await logout();
        setError('此帳號不是管理員，請確認後再試。');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (err.code === 'ROLE_MISMATCH') {
          setError('此帳號不是管理員，請確認後再試。');
        } else if (err.code === 'ACCOUNT_DISABLED') {
          setError('此帳號已被停用，無法登入。');
        } else {
          setError('帳號或密碼錯誤，請再試一次。');
        }
      } else {
        setError('登入失敗，請稍後再試。');
        console.error('[admin-login]', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-[#7DD3A8] flex items-center justify-center text-white">
            <span className="material-symbols-rounded text-2xl">admin_panel_settings</span>
          </div>
          <div>
            <div className="text-xl font-bold text-[#1F2937] leading-tight">SciLens Admin</div>
            <div className="text-xs text-[#6B7280]">系統管理後台</div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-8">
          <h1 className="text-2xl font-bold text-[#1F2937] mb-1">管理員登入</h1>
          <p className="text-sm text-[#6B7280] mb-6">請使用管理員帳號登入後台</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">帳號</label>
              <input
                ref={inputRef}
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="範例：admin001"
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white
                           text-[#1F2937] placeholder:text-[#9CA3AF]
                           focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">密碼</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-[#E5E7EB] bg-white
                             text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  aria-label={showPwd ? '隱藏密碼' : '顯示密碼'}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                             text-[#6B7280] hover:text-[#1F2937]"
                >
                  <span className="material-symbols-rounded text-xl">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold
                         transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? '登入中…' : '登入後台'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-[#6B7280] hover:text-[#1F2937]"
            >
              ← 回到師生入口
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          僅限授權的系統管理員使用
        </p>
      </div>
    </div>
  );
}
