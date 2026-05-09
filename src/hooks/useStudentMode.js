import { useEffect } from 'react';

/**
 * 在學生端頁面掛上 `student-mode` class 到 <html>。
 * 配合 index.css 的 .student-mode 規則，平板/桌機字體整體放大（rem 連動 Tailwind 所有 text-*、padding、margin）。
 * spec-07 §13（字體與可讀性）。
 */
export function useStudentMode() {
  useEffect(() => {
    document.documentElement.classList.add('student-mode');
    return () => document.documentElement.classList.remove('student-mode');
  }, []);
}
