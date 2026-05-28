import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useCreateTeacher } from '../../../hooks/useAdminUsers';

/**
 * 新增教師 modal（spec-14 風格）。
 * 帳號規則：字母+數字、3-64 字元；密碼預設等於帳號。
 */
export default function NewTeacherModal({ onClose, onCreated }) {
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const createMut = useCreateTeacher();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const accountValid = /^[A-Za-z0-9_-]{3,64}$/.test(account.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedAccount = account.trim();
    const trimmedName = name.trim();
    if (!accountValid) {
      setError('帳號格式不符（3-64 字元，僅可使用英數字、底線與連字號）');
      return;
    }
    if (!trimmedName) {
      setError('請輸入教師姓名');
      return;
    }
    try {
      const user = await createMut.mutateAsync({ account: trimmedAccount, name: trimmedName });
      onCreated?.(user);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ACCOUNT_EXISTS') setError('此帳號已存在');
        else if (err.status === 422) setError('帳號或姓名格式不符');
        else setError(err.message || '新增失敗');
      } else {
        setError('新增失敗，請稍後再試');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-lg p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#1F2937] mb-1">新增教師</h3>
        <p className="text-sm text-[#6B7280] mb-5">建立後密碼預設等於帳號，教師首次登入後可自行修改。</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
              帳號 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="範例：bbb002"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white
                         text-[#1F2937] placeholder:text-[#9CA3AF]
                         focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
              required
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-[#6B7280]">3-64 字元，英數字 / 底線 / 連字號</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
              姓名 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="範例：王老師"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white
                         text-[#1F2937] placeholder:text-[#9CA3AF]
                         focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
              required
              maxLength={64}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createMut.isPending}
              className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6]
                         text-[#1F2937] font-medium disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createMut.isPending ? '建立中…' : '建立教師'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
