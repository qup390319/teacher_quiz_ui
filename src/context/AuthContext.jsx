/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';

const AuthContext = createContext(null);

/**
 * 統一管理「目前登入者」與登入 / 登出。
 * - 啟動時呼叫 GET /api/auth/me 嘗試從 cookie 還原
 * - login(account, password) → 成功後設定 currentUser
 * - logout() → 呼叫後端清 cookie + 清本地 state
 * - role 由 currentUser.role 判斷（'teacher' | 'student' | null）
 *
 * 對應 spec-13 §8。
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // bootstrap 中

  // bootstrap：嘗試還原 session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get('/auth/me');
        if (!cancelled) setCurrentUser(me);
      } catch (err) {
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) {
          console.warn('[auth] /me failed:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (account, password) => {
    const { user } = await api.post('/auth/login', { account, password });
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {/* ignore */}
    setCurrentUser(null);
  }, []);

  const value = {
    currentUser,
    loading,
    role: currentUser?.role ?? null,
    login,
    logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
