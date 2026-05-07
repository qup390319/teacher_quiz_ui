import { useEffect, useMemo, useState } from 'react';
import { useClass } from '../../hooks/useClasses';

/**
 * 情境派題對象選擇器（spec-05 §3.4）
 *
 * 模態視窗：列出指定班級的學生，教師勾選個別對象 + 設定截止日後派發。
 * - props.quiz：情境考卷物件（要顯示標題用）
 * - props.cls：班級物件（id / name / color / textColor）
 * - props.existing：若為「編輯既有派題」，傳入既有 assignment（含 dueDate / studentIds）
 * - props.onConfirm({ studentIds, dueDate })
 * - props.onClose()
 */
export default function AssignTargetPicker({ quiz, cls, existing = null, onConfirm, onClose }) {
  const { data: classDetail, isLoading } = useClass(cls.id);
  const students = useMemo(
    () => (classDetail?.students ?? []).slice().sort((a, b) => a.seat - b.seat),
    [classDetail],
  );

  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(existing?.studentIds ?? []),
  );
  const [submitting, setSubmitting] = useState(false);

  // ESC 關閉
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggle = (sid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));
  const noneSelected = selectedIds.size === 0;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleConfirm = async () => {
    if (!dueDate) {
      alert('請選擇截止日期');
      return;
    }
    if (selectedIds.size === 0) {
      alert('請至少勾選一位學生');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        studentIds: students
          .filter((s) => selectedIds.has(s.id))
          .map((s) => s.id),
        dueDate,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-lg max-h-[88vh] flex flex-col">
        {/* 標題列 */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D5D8DC]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E0F0E8] border border-[#3F8B5E] rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#2E6B47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#2D3436] leading-snug">
                {existing ? '調整派發對象' : '派發情境治療考卷'}
              </h3>
              <p className="text-xs text-[#95A5A6] mt-0.5 truncate">{quiz.title}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                <span className="text-sm font-semibold" style={{ color: cls.textColor }}>{cls.name}</span>
                <span className="text-xs text-[#95A5A6]">· 共 {students.length} 位學生</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#95A5A6] hover:text-[#636E72] transition-colors p-1"
              aria-label="關閉"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 截止日期 */}
        <div className="px-6 py-4 border-b border-[#D5D8DC] bg-[#FAFBFC]">
          <label className="text-xs font-medium text-[#636E72] mb-1 block">截止日期</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
          />
        </div>

        {/* 學生勾選區 */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="px-6 py-3 flex items-center justify-between border-b border-[#D5D8DC]">
            <span className="text-xs font-medium text-[#636E72]">
              選擇對象 · 已勾選 <span className="text-[#2E6B47] font-bold">{selectedIds.size}</span> 位
            </span>
            <button
              onClick={handleSelectAll}
              className="text-xs text-[#2E6B47] font-semibold hover:underline"
            >
              {allSelected ? '全部取消' : '全部勾選'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-3">
            {isLoading ? (
              <p className="text-sm text-[#95A5A6] text-center py-8">載入學生名冊中…</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-[#95A5A6] text-center py-8">此班級目前沒有學生</p>
            ) : (
              <ul className="space-y-1.5">
                {students.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <li key={s.id}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#E0F0E8] border-[#3F8B5E]'
                            : 'bg-white border-[#D5D8DC] hover:bg-[#EEF5E6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(s.id)}
                          className="w-4 h-4 accent-[#3F8B5E]"
                        />
                        <span className="text-xs font-mono text-[#95A5A6] w-8 text-center flex-shrink-0">
                          {String(s.seat).padStart(2, '0')}
                        </span>
                        <span className="flex-1 text-sm font-medium text-[#2D3436] truncate">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-[#95A5A6] font-mono">{s.id}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-[#D5D8DC] flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || noneSelected || !dueDate}
            className="flex-1 py-2.5 text-sm font-semibold bg-[#5BA47A] text-white border border-[#3F8B5E] rounded-xl hover:bg-[#3F8B5E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '處理中…' : existing ? '儲存變更' : `派發給 ${selectedIds.size} 位學生`}
          </button>
        </div>
      </div>
    </div>
  );
}
