import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';

/**
 * 從 Word docx 匯入次主題階層（W7b）。
 * 支援 .docx 單檔或 .zip 批次。
 * 流程：選檔 → 後端預覽 → 階層樹預覽 → 設定模式 → 確認寫入 → 顯示結果。
 */

const ERR = {
  INVALID_DOCX: 'Word 檔損壞或不是 .docx 格式',
  INVALID_XML: 'Word 檔內容結構錯誤',
  INVALID_ZIP: 'zip 檔損壞',
  INVALID_FILE_TYPE: '只接受 .docx 或 .zip 檔案',
  FILE_TOO_LARGE: '檔案過大（docx 上限 4 MiB；zip 上限 20 MiB）',
  EMPTY_DOCUMENT: 'Word 檔沒有內容',
  NO_TABLES: 'Word 檔找不到任何表格',
  UNIT_NAME_NOT_FOUND: '找不到「次主題名稱」表格列',
  NO_PARENT_NODES_FOUND: '找不到任何大節點',
};

function explain(code) {
  if (!code) return '操作失敗';
  if (ERR[code]) return ERR[code];
  if (code.startsWith('INVALID_DOCX')) return ERR.INVALID_DOCX;
  if (code.startsWith('UNIT_CODE_EXISTS')) return `此次主題代碼已存在：${code.split(':')[1]}`;
  return code;
}

async function upload(path, file, extraForm = {}) {
  const fd = new FormData();
  fd.append('file', file);
  Object.entries(extraForm).forEach(([k, v]) => fd.append(k, v));
  const res = await fetch(`/api${path}`, { method: 'POST', credentials: 'include', body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = data?.detail || `HTTP_${res.status}`;
    throw new ApiError(res.status, code, code, data);
  }
  return data;
}

function ParentRow({ parent, expanded, onToggle }) {
  return (
    <div className="border border-[#E5E7EB] rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F4F8F6] text-left"
      >
        <span className={`material-symbols-rounded text-base text-[#6B7280] transition-transform ${expanded ? 'rotate-90' : ''}`}>
          chevron_right
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-mono font-semibold text-[#1F2937]">{parent.code}</div>
          <div className="text-xs text-[#4B5563] mt-0.5 line-clamp-2">{parent.name || '(無名稱)'}</div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#F4F8F6] text-[#4B5563]">
          {parent.children.length} 小節點
        </span>
      </button>
      {expanded && parent.children.length > 0 && (
        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 space-y-1">
          {parent.children.map((c) => (
            <div key={c.code} className="flex items-start gap-2 px-2 py-1 text-xs">
              <span className="font-mono text-[#1E40AF] shrink-0">{c.code}</span>
              <span className="text-[#1F2937]">{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnitCard({ unit }) {
  const [openParents, setOpenParents] = useState(() => new Set());
  const toggle = (idx) => setOpenParents((prev) => {
    const next = new Set(prev);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    return next;
  });

  if (unit.error) {
    return (
      <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-3">
        <div className="text-sm font-semibold text-[#B91C1C]">
          {unit.fileName || '(未命名)'} — 解析失敗
        </div>
        <div className="text-xs text-[#B91C1C] mt-1">{explain(unit.error)}</div>
      </div>
    );
  }

  const total = unit.parents.reduce((s, p) => s + p.children.length, 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F4F8F6]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[#15803D]">menu_book</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1F2937]">
              {unit.unitName} <span className="font-mono text-[#15803D] ml-1">({unit.unitCode})</span>
            </div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              {unit.fileName && <span className="font-mono">{unit.fileName} · </span>}
              {unit.parents.length} 大節點 · {total} 小節點
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {unit.parents.map((p, idx) => (
          <ParentRow
            key={p.code}
            parent={p}
            expanded={openParents.has(idx)}
            onToggle={() => toggle(idx)}
          />
        ))}
      </div>
    </div>
  );
}

export default function DocxImportModal({ onClose, onSuccess }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('pick'); // pick | preview | submitting | done
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [mode, setMode] = useState('merge');
  const [gradeBand, setGradeBand] = useState('upper');
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null); setPreview(null); setStep('pick'); setError('');
    setResults(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setError(''); setStep('submitting');
    try {
      const data = await upload('/admin/units/import-docx/preview', f);
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
      const r = await upload('/admin/units/import-docx', file, { mode, gradeBand });
      setResults(r.results); setStep('done');
      qc.invalidateQueries({ queryKey: ['admin-units'] });
      qc.invalidateQueries({ queryKey: ['admin-parent-nodes'] });
      qc.invalidateQueries({ queryKey: ['admin-knowledge-nodes'] });
      onSuccess?.(r);
    } catch (err) {
      setError(explain(err.code));
      setStep('preview');
    }
  };

  const validUnits = preview?.units?.filter((u) => !u.error) ?? [];
  const errorUnits = preview?.units?.filter((u) => u.error) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
      role="dialog" aria-modal="true" onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-3xl border border-[#E5E7EB] shadow-lg max-h-[90vh] flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#E5E7EB]">
          <h3 className="text-lg font-bold text-[#1F2937]">從 Word 匯入次主題</h3>
          <p className="text-sm text-[#6B7280] mt-1">
            上傳 108 課綱「知識節點關聯圖」.docx（或 .zip 一次匯入多份）。
            次主題 → 大節點 → 小節點 三層階層會自動建立，先備關係箭頭暫不解析需手動設定。
          </p>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 'pick' && (
            <label className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-[#E5E7EB] hover:border-[#7DD3A8] p-10 text-center transition-colors">
              <input ref={inputRef} type="file" accept=".docx,.zip" onChange={handlePick} className="sr-only" />
              <span className="material-symbols-rounded text-4xl text-[#9CA3AF] block mb-2">cloud_upload</span>
              <span className="text-sm font-medium text-[#1F2937]">點此選擇 .docx 或 .zip 檔</span>
              <div className="text-xs text-[#6B7280] mt-1">docx 上限 4 MiB；zip 上限 20 MiB</div>
            </label>
          )}

          {step === 'submitting' && (
            <div className="py-12 text-center text-sm text-[#6B7280]">處理中…</div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="bg-[#F4F8F6] rounded-xl p-3 text-sm text-[#4B5563]">
                解析到 <strong className="text-[#15803D]">{validUnits.length}</strong> 個次主題
                {errorUnits.length > 0 && (
                  <span> · 失敗 <strong className="text-[#B91C1C]">{errorUnits.length}</strong> 個</span>
                )}
              </div>

              {/* 模式選擇 */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">遇到既有次主題</label>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm bg-white">
                    <option value="merge">合併（新增缺漏的節點）</option>
                    <option value="skip">跳過整份檔案</option>
                    <option value="create">回報錯誤（強制只建立新次主題）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">年段</label>
                  <select value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm bg-white">
                    <option value="upper">高年級（5-6 年級）</option>
                    <option value="middle">中年級（3-4 年級）</option>
                    <option value="lower">低年級（1-2 年級）</option>
                  </select>
                </div>
              </div>

              {/* 各次主題卡片 */}
              <div className="space-y-3">
                {preview.units.map((u, idx) => (
                  <UnitCard key={`${u.unitCode || 'err'}-${idx}`} unit={u} />
                ))}
              </div>
            </div>
          )}

          {step === 'done' && results && (
            <div className="space-y-3">
              <div className="bg-[#DCFCE7] border border-[#7DD3A8] rounded-xl p-4 text-sm text-[#15803D]">
                ✓ 匯入完成
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#F4F8F6] text-[#6B7280] text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">檔案</th>
                    <th className="text-left px-3 py-2">次主題</th>
                    <th className="text-left px-3 py-2">狀態</th>
                    <th className="text-right px-3 py-2">unit</th>
                    <th className="text-right px-3 py-2">大節點</th>
                    <th className="text-right px-3 py-2">小節點</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {results.map((r, i) => (
                    <tr key={i} className={r.status === 'error' ? 'bg-[#FEE2E2]' : ''}>
                      <td className="px-3 py-2 font-mono text-xs">{r.fileName || '-'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.unitCode || '-'}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded ${
                          r.status === 'created' ? 'bg-[#DCFCE7] text-[#15803D]' :
                          r.status === 'merged' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
                          r.status === 'skipped' ? 'bg-[#F3F4F6] text-[#6B7280]' :
                          'bg-[#FEE2E2] text-[#B91C1C]'
                        }`}>
                          {r.status === 'created' ? '已建立' :
                           r.status === 'merged' ? '已合併' :
                           r.status === 'skipped' ? '已跳過' : '失敗'}
                        </span>
                        {r.message && <div className="text-[10px] text-[#6B7280] mt-1">{r.message}</div>}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{r.unitsAdded || 0}</td>
                      <td className="px-3 py-2 text-right text-xs">{r.parentsAdded || 0}</td>
                      <td className="px-3 py-2 text-right text-xs">{r.childrenAdded || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#E5E7EB] flex justify-between">
          {step !== 'pick' && step !== 'done' ? (
            <button type="button" onClick={reset} className="text-sm text-[#6B7280] hover:text-[#1F2937]">
              重新選擇
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937] text-sm font-medium"
            >
              {step === 'done' ? '完成' : '取消'}
            </button>
            {step === 'preview' && validUnits.length > 0 && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white text-sm font-semibold"
              >
                確認匯入 {validUnits.length} 個次主題
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
