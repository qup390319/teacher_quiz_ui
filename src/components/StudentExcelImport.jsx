import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';

/**
 * Excel 匯入學生名冊（教師端 / 管理員端共用）。
 *
 * - 只在班級**完全空白**時可用（後端會回 409 CLASS_NOT_EMPTY 防呆）
 * - 上傳前先打 `.../import-excel/preview` 取得預覽（不寫 DB）
 * - 確認後打 `.../import-excel` 正式寫入
 *
 * Props:
 *   classId: 班級 ID
 *   variant: 'teacher' | 'admin'（影響成功後要 invalidate 的 queryKey 與視覺色彩）
 *   onSuccess: (classDetail) => void
 */

const ERROR_MESSAGES = {
  CLASS_NOT_EMPTY: '此班級已有學生，無法匯入。',
  CLASS_NOT_FOUND: '找不到此班級。',
  FILE_TOO_LARGE: 'Excel 檔案過大（限 1 MiB）。',
  INVALID_FILE_TYPE: '不是有效的 .xlsx 檔案。',
  INVALID_XLSX: 'Excel 格式錯誤，請確認檔案完整且未加密。',
  EMPTY_SHEET: '工作表沒有任何資料。',
  EMPTY_WORKBOOK: 'Excel 沒有可用的工作表。',
  NO_VALID_ROWS: 'Excel 中沒有有效的學生資料。',
};

function explainError(code) {
  if (!code) return '匯入失敗';
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code.startsWith('ROW_') && code.includes('MISSING_SEAT')) {
    return `第 ${code.match(/ROW_(\d+)/)?.[1] ?? '?'} 列缺少座號。`;
  }
  if (code.startsWith('ROW_') && code.includes('MISSING_NAME')) {
    return `第 ${code.match(/ROW_(\d+)/)?.[1] ?? '?'} 列缺少姓名。`;
  }
  if (code.startsWith('ROW_') && code.includes('INVALID_SEAT')) {
    return `第 ${code.match(/ROW_(\d+)/)?.[1] ?? '?'} 列的座號不是正整數。`;
  }
  if (code.startsWith('ROW_') && code.includes('NAME_TOO_LONG')) {
    return `第 ${code.match(/ROW_(\d+)/)?.[1] ?? '?'} 列的姓名超過 64 字元。`;
  }
  if (code.startsWith('DUPLICATE_SEAT')) return `座號重複：${code.split(':')[1]}`;
  if (code.startsWith('ACCOUNT_ALREADY_EXISTS')) {
    return `自動產生的帳號已被使用：${code.split(':')[1]}（請聯絡管理員處理）`;
  }
  return code;
}

async function fetchUpload(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const code = data?.detail || data?.error || `HTTP_${res.status}`;
    throw new ApiError(res.status, code, code, data);
  }
  return data;
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export default function StudentExcelImport({ classId, variant = 'teacher', onSuccess }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { rows, total }
  const [step, setStep] = useState('pick'); // 'pick' | 'preview' | 'submitting' | 'done'
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStep('pick');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setStep('submitting');
    try {
      const data = await fetchUpload(`/classes/${classId}/students/import-excel/preview`, f);
      setPreview(data);
      setStep('preview');
    } catch (err) {
      setError(explainError(err.code));
      setStep('pick');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setError('');
    setStep('submitting');
    try {
      const result = await fetchUpload(`/classes/${classId}/students/import-excel`, file);
      setStep('done');
      // Invalidate caches
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['classes', classId] });
      if (variant === 'admin') {
        qc.invalidateQueries({ queryKey: ['admin-classes'] });
        qc.invalidateQueries({ queryKey: ['admin-users'] });
      }
      onSuccess?.(result);
    } catch (err) {
      setError(explainError(err.code));
      setStep('preview');
    }
  };

  const cardCls = variant === 'admin'
    ? 'bg-white rounded-2xl border border-[#E5E7EB] p-5'
    : 'bg-[#FFF8E7] rounded-2xl border border-[#D9C58E] p-5';

  const primaryBtn = variant === 'admin'
    ? 'bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white'
    : 'bg-[#8FC87A] hover:bg-[#76B563] text-[#2D3436]';

  return (
    <div className={cardCls}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variant === 'admin' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FBE9C7] text-[#7A5232]'}`}>
          <span className="material-symbols-rounded text-xl">upload_file</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold mb-0.5 ${variant === 'admin' ? 'text-[#1F2937]' : 'text-[#5A3E22]'}`}>
            從 Excel 匯入名冊
          </h3>
          <p className={`text-sm ${variant === 'admin' ? 'text-[#6B7280]' : 'text-[#7A5232]'}`}>
            Excel <strong>只需要兩欄</strong>：第一欄座號、第二欄姓名（第一列可放標題）。<br />
            匯入後系統會自動依座號產生學生帳號，預設密碼等於帳號。
          </p>
        </div>
      </div>

      {step === 'pick' && (
        <div>
          <label className={`block w-full cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors
                          ${variant === 'admin' ? 'border-[#E5E7EB] hover:border-[#7DD3A8] hover:bg-[#F4F8F6]' : 'border-[#D9C58E] hover:border-[#8FC87A] hover:bg-white'}`}>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handlePick}
              className="sr-only"
            />
            <span className={`material-symbols-rounded text-3xl block mb-1 ${variant === 'admin' ? 'text-[#9CA3AF]' : 'text-[#9B7A4F]'}`}>
              cloud_upload
            </span>
            <span className={`text-sm font-medium ${variant === 'admin' ? 'text-[#1F2937]' : 'text-[#5A3E22]'}`}>
              點此選擇 .xlsx 檔案
            </span>
            <span className={`block text-xs mt-1 ${variant === 'admin' ? 'text-[#6B7280]' : 'text-[#9B7A4F]'}`}>
              檔案大小不超過 1 MiB
            </span>
          </label>
        </div>
      )}

      {step === 'submitting' && (
        <div className="py-8 text-center text-sm text-[#6B7280]">處理中…</div>
      )}

      {step === 'preview' && preview && (
        <div>
          <div className={`mb-3 text-sm ${variant === 'admin' ? 'text-[#1F2937]' : 'text-[#5A3E22]'}`}>
            預覽：共 <strong>{preview.total}</strong> 位學生{preview.total > 20 ? '（僅顯示前 20 列）' : ''}
          </div>
          <div className="overflow-x-auto max-h-80 border border-[#E5E7EB] rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F8F6] text-[#6B7280] uppercase text-xs sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium w-20">座號</th>
                  <th className="text-left px-4 py-2 font-medium">姓名</th>
                  <th className="text-left px-4 py-2 font-medium">帳號（自動產生）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {preview.rows.slice(0, 20).map((r) => (
                  <tr key={r.account}>
                    <td className="px-4 py-2 font-mono text-[#1F2937]">{r.seat}</td>
                    <td className="px-4 py-2 text-[#1F2937]">{r.name}</td>
                    <td className="px-4 py-2 font-mono text-[#4B5563]">{r.account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-[#1F2937] font-medium text-sm"
            >
              重新選擇
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${primaryBtn}`}
            >
              確認匯入 {preview.total} 位學生
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="py-6 text-center">
          <div className="text-sm text-[#15803D] font-medium mb-2">✓ 已成功匯入學生名冊</div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#6B7280] hover:text-[#1F2937] underline"
          >
            再上傳一份
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
          {error}
        </div>
      )}
    </div>
  );
}
