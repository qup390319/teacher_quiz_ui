import { useEffect, useRef } from 'react';

/**
 * 將一個 effect 延後 delayMs 才執行；deps 變動時重置計時器。
 * 適合自動暫存等情境：使用者連續輸入時不會打多次 API。
 *
 * @param {() => void | Promise<void>} effect
 * @param {number} delayMs
 * @param {Array} deps
 * @param {boolean} [enabled=true]  為 false 時完全停用（用於切換條件）
 */
export function useDebouncedEffect(effect, delayMs, deps, enabled = true) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      effectRef.current();
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs, enabled]);
}
