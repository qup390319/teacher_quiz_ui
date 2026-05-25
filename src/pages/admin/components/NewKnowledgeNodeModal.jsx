import { useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useCreateKnowledgeNode } from '../../../hooks/useAdminKnowledgeNodes';

/**
 * 新增節點 modal（spec-14）。
 * 必填：id / 名稱 / 年段 / 所屬單元
 * 選填：大節點編碼 + 名稱、學習順序、影片
 */

const ERROR_MESSAGES = {
  NODE_ID_EXISTS: '此節點 ID 已存在',
  UNIT_NOT_FOUND: '找不到指定的單元',
};

const GRADE_BAND_OPTIONS = [
  { value: 'lower', label: '低年級' },
  { value: 'middle', label: '中年級' },
  { value: 'upper', label: '高年級' },
];

export default function NewKnowledgeNodeModal({ units, defaultUnitId, defaultGradeBand, onClose, onCreated }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [unitId, setUnitId] = useState(defaultUnitId || '');
  const [gradeBand, setGradeBand] = useState(defaultGradeBand || 'upper');
  const [parentCode, setParentCode] = useState('');
  const [parentName, setParentName] = useState('');
  const [error, setError] = useState('');
  const createMut = useCreateKnowledgeNode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!id.trim() || !name.trim()) {
      setError('請輸入 ID 與名稱');
      return;
    }
    try {
      const node = await createMut.mutateAsync({
        id: id.trim(), name: name.trim(),
        unitId: unitId || null, gradeBand,
        parentCode: parentCode.trim() || null,
        parentName: parentName.trim() || null,
      });
      onCreated?.(node);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(ERROR_MESSAGES[err.code] || err.message || '操作失敗');
      } else {
        setError('操作失敗');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-lg p-6"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#1F2937] mb-1">新增節點</h3>
        <p className="text-sm text-[#6B7280] mb-5">建立後可在畫布拖曳調整位置、連線設定先備關係，並從右側欄補上完整資訊。</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
              節點 ID <span className="text-[#DC2626]">*</span>
            </label>
            <input type="text" value={id} onChange={(e) => setId(e.target.value)}
                   placeholder="例：INe-II-3-06 或 light-01" autoFocus required
                   className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] font-mono text-sm focus:ring-2 focus:ring-[#7DD3A8]" />
            <p className="mt-1 text-xs text-[#6B7280]">同單元內 ID 須唯一</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
              名稱 <span className="text-[#DC2626]">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                   maxLength={256} required
                   className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-[#7DD3A8]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">所屬單元</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm bg-white">
                <option value="">（未分配）</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">年段</label>
              <select value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm bg-white">
                {GRADE_BAND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1.5">大節點 / 子主題（選填）</label>
            <input type="text" value={parentCode} onChange={(e) => setParentCode(e.target.value)}
                   placeholder="編碼，例：INe-Ⅱ-3"
                   className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] font-mono text-sm mb-1.5" />
            <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)}
                   placeholder="描述，例：認識水溶液中的變化"
                   className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm" />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={createMut.isPending}
                    className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937] text-sm font-medium">取消</button>
            <button type="submit" disabled={createMut.isPending}
                    className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white text-sm font-semibold disabled:opacity-50">
              {createMut.isPending ? '建立中…' : '建立節點'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
