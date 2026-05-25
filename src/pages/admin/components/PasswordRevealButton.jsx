import { useState } from 'react';
import { useAdminUser } from '../../../hooks/useAdminUsers';

/**
 * 點擊「👁」即時拉取 admin 端的明文密碼。
 * - 預設關閉，按下後才呼叫 /api/admin/users/{id} (含 password 欄位)
 * - hover/focus 都不會 prefetch；點第二次則隱藏（但已 fetch 過的 cache 仍保留）
 */
export default function PasswordRevealButton({ userId }) {
  const [reveal, setReveal] = useState(false);
  const { data, isFetching, error } = useAdminUser(userId, { enabled: reveal });

  const display = !reveal
    ? '••••••'
    : isFetching
      ? '…'
      : error
        ? '—'
        : (data?.password ?? '—');

  return (
    <div className="inline-flex items-center gap-1.5">
      <code className="text-sm font-mono px-2 py-0.5 rounded-md bg-[#F4F8F6] border border-[#E5E7EB] text-[#1F2937] min-w-[80px] inline-block text-center">
        {display}
      </code>
      <button
        type="button"
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? '隱藏密碼' : '顯示密碼'}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F4F8F6]"
        title={reveal ? '隱藏密碼' : '顯示密碼'}
      >
        <span className="material-symbols-rounded text-lg">
          {reveal ? 'visibility_off' : 'visibility'}
        </span>
      </button>
      {reveal && data?.passwordWasDefault && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#B45309]">
          預設
        </span>
      )}
    </div>
  );
}
