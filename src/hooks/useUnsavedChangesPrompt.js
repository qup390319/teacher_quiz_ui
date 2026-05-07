import { useEffect } from 'react';

/**
 * 在 isDirty 為 true 時，於使用者關閉/重新整理瀏覽器分頁時觸發原生確認對話框（beforeunload）。
 * 注意：瀏覽器無法自訂訊息內容；單純用來避免意外遺失變更。
 *
 * 路由內導航（navigate / Link / 上一頁）不在此 hook 處理範圍——呼叫端應自行包一層
 * guardedNavigate 顯示自訂 modal（react-router v7 的 useBlocker 需要 data router，本專案使用
 * BrowserRouter 不適用）。
 *
 * @param {boolean} isDirty
 */
export function useUnsavedChangesPrompt(isDirty) {
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
