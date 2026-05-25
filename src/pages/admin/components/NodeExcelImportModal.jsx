import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';

/**
 * 知識節點 Excel 匯入 modal（W5a）。
 * - 上傳「整合-知識節點大全」xlsx
 * - 預覽：列出依年段 + 大節點分組的數量
 * - 確認後寫入 DB（unit_id=NULL，全部進「未分配」池）
 */

const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: '不是有效的 .xlsx 檔案',
  INVALID_XLSX: 'Excel 檔案損壞或加密',
  FILE_TOO_LARGE: '檔案過大（限 2 MiB）',
  EMPTY_SHEET: '工作表沒有資料',
  NO_VALID_ROWS: '沒有有效的節點資料',
  'SHEET_NOT_FOUND:整合': '找不到名為「整合」的工作表',
};

function explain(code) {
  if (!code) return '匯入失敗';
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const m = code.match(/^ROW_(\d+)_(\w+)/);
  if (m) {
    const map = { MISSING_ID: '缺少節點 ID', MISSING_NAME: '缺少名稱',
                  INVALID_STAGE: '學習階段需為 1/2/3', ID_TOO_LONG: '節點 ID 超過 64 字',
                  NAME_TOO_LONG: '節點名稱超過 256 字' };
    return `第 ${m[1]} 列：${map[m[2]] || m[2]}`;
  }
  if (code.startsWith('DUPLICATE_NODE_ID')) return `節點 ID 重複：${code.split(':')[1]}`;
  return code;
}

async function uploadXlsx(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api${path}`, { method: 'POST', credentials: 'include', body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = data?.detail || `HTTP_${res.status}`;
    throw new ApiError(res.status, code, code, data);
  }
  return data;
}

const BAND_LABEL = { lower: '低年級', middle: '中年級', upper: '高年級' };

export default function NodeExcelImportModal({ onClose, onSuccess }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('pick'); // pick | preview | submitting | done
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null); setPreview(null); setStep('pick'); setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setError(''); setStep('submitting');
    try {
      const data = await uploadXlsx('/admin/knowledge-nodes/import-excel/preview', f);
      setPreview(data); setStep('preview');
    } catch (err) {
      setError(explain(err.code));
      setStep('pick'); setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setError(''); setStep('submitting');
    try {
      const r = await uploadXlsx('/admin/knowledge-nodes/import-excel', file);
      setResult(r); setStep('done');
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
      onSuccess?.(r);
    } catch (err) {
      setError(explain(err.code));
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E5E7EB] shadow-lg"
           onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[#E5E7EB]">
          <h3 className="text-lg font-bold text-[#1F2937]">從 Excel 匯入知識節點</h3>
          <p className="text-sm text-[#6B7280] mt-1">
            上傳「整合-知識節點大全」xlsx；節點會先進入「未分配單元」池，匯入後可批次指派到各課程單元。
          </p>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {step === 'pick' && (
            <label className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-[#E5E7EB] hover:border-[#7DD3A8] p-10 text-center transition-colors">
              <input ref={inputRef} type="file" accept=".xlsx" onChange={handlePick} className="sr-only" />
              <span className="material-symbols-rounded text-4xl text-[#9CA3AF] block mb-2">cloud_upload</span>
              <span className="text-sm font-medium text-[#1F2937]">點此選擇 .xlsx 檔案</span>
              <div className="text-xs text-[#6B7280] mt-1">第一個 sheet 需為「整合」；檔案 ≤ 2 MiB</div>
            </label>
          )}

          {step === 'submitting' && (
            <div className="py-12 text-center text-sm text-[#6B7280]">處理中…</div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="text-sm text-[#1F2937]">
                預覽：共 <strong>{preview.total}</strong> 個節點
              </div>

              <div>
                <div className="text-xs uppercase text-[#6B7280] mb-1.5">依年段</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.byGradeBand || {}).map(([band, n]) => (
                    <span key={band} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
                      {BAND_LABEL[band] || band}：{n} 筆
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase text-[#6B7280] mb-1.5">依大節點 / 子主題（共 {(preview.byParent || []).length} 組）</div>
                <div className="border border-[#E5E7EB] rounded-xl overflow-y-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F4F8F6] text-[#6B7280] text-xs sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">大節點編碼</th>
                        <th className="text-left px-3 py-2 font-medium">名稱</th>
                        <th className="text-left px-3 py-2 font-medium w-20">年段</th>
                        <th className="text-right px-3 py-2 font-medium w-16">小節點數</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {(preview.byParent || []).map((p, i) => (
                        <tr key={`${p.parentCode}-${i}`}>
                          <td className="px-3 py-2 font-mono text-xs text-[#1F2937]">{p.parentCode || '—'}</td>
                          <td className="px-3 py-2 text-xs text-[#4B5563]">{p.parentName || '—'}</td>
                          <td className="px-3 py-2 text-xs text-[#4B5563]">{BAND_LABEL[p.gradeBand] || p.gradeBand}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-[#1F2937] text-right">{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#FEF3C7] border border-[#FBBF24] text-xs text-[#92400E] rounded-xl px-3 py-2">
                ⚠ 既存的節點 ID（如目前 12 個水溶液節點）匯入時會自動略過，不會重複建立或覆蓋。
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="py-8 text-center">
              <div className="text-base text-[#15803D] font-semibold mb-1">✓ 匯入完成</div>
              <div className="text-sm text-[#4B5563]">
                新增 <strong>{result.inserted}</strong> 個節點 · 略過 <strong>{result.skipped}</strong> 個（已存在）
              </div>
              <div className="text-xs text-[#6B7280] mt-3">
                所有新節點都在「未分配」池，可從畫布頁切換到「未分配」分區，依大節點群批次指派到對應的課程單元。
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#E5E7EB] flex justify-between">
          <button type="button" onClick={reset}
                  className="text-sm text-[#6B7280] hover:text-[#1F2937]">
            重新選擇
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937] text-sm font-medium">
              {step === 'done' ? '完成' : '取消'}
            </button>
            {step === 'preview' && (
              <button type="button" onClick={handleConfirm}
                      className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white text-sm font-semibold">
                確認匯入 {preview?.total} 筆
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
