/* eslint-disable react-refresh/only-export-components */
/**
 * 操作導覽（GuidedTour / react-joyride）的全域控制 context。
 *
 * - 任何頁面都能透過 `useTour().startTour(variant)` 啟動導覽
 * - 兩種變體：
 *     'sidebar' — 由 TeacherLayout 側邊欄按鈕觸發，只走側邊欄項目
 *     'home'    — 由 TeacherDashboard 首頁按鈕觸發，走側邊欄 + 首頁對應卡片（配對高亮）
 * - 實際 Joyride 渲染由 <GuidedTour /> 元件統一處理，置於 TeacherLayout 內以跨頁可用
 */
import { createContext, useCallback, useContext, useState } from 'react';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  // tour = null 表示未啟動；否則 { variant, key }，key 用於強制 Joyride 重掛載
  const [tour, setTour] = useState(null);

  const startTour = useCallback((variant) => {
    setTour({ variant, key: Date.now() });
  }, []);

  const endTour = useCallback(() => setTour(null), []);

  return (
    <TourContext.Provider value={{ tour, startTour, endTour }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
};
