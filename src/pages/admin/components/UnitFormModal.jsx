import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useCreateUnit, useUpdateUnit } from '../../../hooks/useAdminUnits';

const GRADE_BAND_OPTIONS = [
  { value: 'lower', label: '低年級（1–2 年級）' },
  { value: 'middle', label: '中年級（3–4 年級）' },
  { value: 'upper', label: '高年級（5–6 年級）' },
];

const ERROR_MESSAGES = {
  UNIT_CODE_EXISTS: '此 code 已被使用',
  UNIT_ID_EXISTS: '此 id 已被使用',
  UNIT_NOT_FOUND: '找不到此單元',
};

/**
 * 新增 / 編輯 單元 modal（spec-14 風格）。
 * 操作模式：
 *   - 新增：傳 isEdit=false（或省略）
 *   - 編輯：傳 isEdit=true + initial（含 id / name / gradeBand / description 等）
 */
export default function UnitFormModal({ isEdit = false, initial = null, onClose, onSuccess }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [gradeBand, setGradeBand] = useState(initial?.gradeBand ?? 'upper');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const createMut = useCreateUnit();
  const updateMut = useUpdateUnit();
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('請輸入單元名稱');
      return;
    }
    try {
      const body = {
        name: trimmedName,
        gradeBand,
        description: description.trim() || null,
      };
      let unit;
      if (isEdit) {
        unit = await updateMut.mutateAsync({ id: initial.id, ...body });
      } else {
        unit = await createMut.mutateAsync(body);
      }
      onSuccess?.(unit);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(ERROR_MESSAGES[err.code] || err.message || '操作失敗');
      } else {
        setError('操作失敗，請稍後再試');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#1F2937] mb-1">
          {isEdit ? '編輯單元' : '新增單元'}
        </h3>
        <p className="text-sm text-[#6B7280] mb-5">
          {isEdit
            ? '修改單元基本資訊。code 與 is_system_current 不可變更。'
            : '建立後可在列表中編輯排序、封存或刪除。'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
              單元名稱 <span className="text-[#DC2626]">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：太陽與光的折射"
              maxLength={64}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white
                         text-[#1F2937] placeholder:text-[#9CA3AF]
                         focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
              年段 <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={gradeBand}
              onChange={(e) => setGradeBand(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white
                         text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
            >
              {GRADE_BAND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">簡介</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可選：單元學習目標、範圍說明"
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white
                         text-[#1F2937] placeholder:text-[#9CA3AF] resize-y
                         focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
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
              disabled={isPending}
              className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6]
                         text-[#1F2937] font-medium disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? '儲存中…' : (isEdit ? '儲存變更' : '建立單元')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
