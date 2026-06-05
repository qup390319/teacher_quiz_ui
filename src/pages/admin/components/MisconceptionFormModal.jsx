import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/api';
import {
  useCreateMisconception,
  useUpdateMisconception,
} from '../../../hooks/useAdminKnowledgeNodes';

const ERROR_MESSAGES = {
  MISCONCEPTION_ID_EXISTS: '此迷思 ID 已被使用',
  MISCONCEPTION_NOT_FOUND: '找不到此迷思',
  NODE_NOT_FOUND: '找不到所屬節點',
};

// 迷思編號慣例：M{XX}-{Y}（XX = 節點序號 01–12、Y = 該節點下流水號）
const ID_PATTERN = /^M\d{2}-\d+$/;

/**
 * 新增 / 編輯 迷思概念 modal（spec-14 薄荷綠風）。
 *
 * props：
 *   - isEdit：true=編輯（id 唯讀）、false/省略=新增
 *   - nodeId：新增時所屬節點 id（必填）
 *   - nodeLabel：節點顯示名稱，純提示用
 *   - initial：編輯時帶入既有迷思（id/label/detail/studentDetail/confirmQuestion/displayOrder）
 *   - existingIds：同節點下已存在的迷思 id（新增時做前端重複檢查）
 *   - onClose / onSuccess(misconception)
 */
export default function MisconceptionFormModal({
  isEdit = false,
  nodeId,
  nodeLabel,
  initial = null,
  existingIds = [],
  onClose,
  onSuccess,
}) {
  const [id, setId] = useState(initial?.id ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [studentDetail, setStudentDetail] = useState(initial?.studentDetail ?? '');
  const [confirmQuestion, setConfirmQuestion] = useState(initial?.confirmQuestion ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [error, setError] = useState('');
  const firstInputRef = useRef(null);
  const createMut = useCreateMisconception();
  const updateMut = useUpdateMisconception();
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => { firstInputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('請輸入迷思短標');
      return;
    }

    try {
      let result;
      if (isEdit) {
        result = await updateMut.mutateAsync({
          id: initial.id,
          label: trimmedLabel,
          detail: detail.trim() || null,
          studentDetail: studentDetail.trim() || null,
          confirmQuestion: confirmQuestion.trim() || null,
          source: source.trim() || null,
        });
      } else {
        const trimmedId = id.trim();
        if (!trimmedId) {
          setError('請輸入迷思 ID');
          return;
        }
        if (!ID_PATTERN.test(trimmedId)) {
          setError('ID 格式應為 M{XX}-{Y}，例：M01-5');
          return;
        }
        if (existingIds.includes(trimmedId)) {
          setError('此迷思 ID 已存在於此節點');
          return;
        }
        result = await createMut.mutateAsync({
          nodeId,
          id: trimmedId,
          label: trimmedLabel,
          detail: detail.trim() || null,
          studentDetail: studentDetail.trim() || null,
          confirmQuestion: confirmQuestion.trim() || null,
          source: source.trim() || null,
        });
      }
      onSuccess?.(result ?? { id: isEdit ? initial.id : id.trim(), label: trimmedLabel });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(ERROR_MESSAGES[err.code] || err.message || '操作失敗');
      } else {
        setError('操作失敗，請稍後再試');
      }
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white ' +
    'text-[#1F2937] placeholder:text-[#9CA3AF] ' +
    'focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-[#E5E7EB] shadow-lg p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#1F2937] mb-1">
          {isEdit ? '編輯迷思概念' : '新增迷思概念'}
        </h3>
        <p className="text-sm text-[#6B7280] mb-5">
          {nodeLabel
            ? <>所屬節點：<span className="font-medium text-[#4B5563]">{nodeLabel}</span></>
            : '填寫迷思的四個欄位；ID 建立後不可變更。'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
                ID {!isEdit && <span className="text-[#DC2626]">*</span>}
              </label>
              <input
                ref={!isEdit ? firstInputRef : undefined}
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="M01-5"
                disabled={isEdit}
                maxLength={64}
                className={`${inputCls} font-mono ${isEdit ? 'opacity-60 cursor-not-allowed bg-[#F4F8F6]' : ''}`}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
                迷思短標 <span className="text-[#DC2626]">*</span>
              </label>
              <input
                ref={isEdit ? firstInputRef : undefined}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例：加進水裡就算溶解"
                maxLength={256}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">教師視角描述（detail）</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="教師判讀此迷思的完整說明"
              rows={2}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">學生視角描述（studentDetail）</label>
            <textarea
              value={studentDetail}
              onChange={(e) => setStudentDetail(e.target.value)}
              placeholder="以學生能懂的口吻描述這個想法"
              rows={2}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">AI 二次確認問句（confirmQuestion）</label>
            <textarea
              value={confirmQuestion}
              onChange={(e) => setConfirmQuestion(e.target.value)}
              placeholder="用「你是不是覺得…」溫和地向學生確認"
              rows={2}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">資料來源 / 出處（source）</label>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="文獻引用出處，例：陳淑筠、熊同鑫（2003）。國內學生自然科學迷思概念研究之後設研究。"
              rows={2}
              className={`${inputCls} resize-y`}
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
              {isPending ? '儲存中…' : (isEdit ? '儲存變更' : '建立迷思')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
