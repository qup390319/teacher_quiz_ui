import { useEffect, useRef, useState } from 'react';

// ─── 格子：未派發 ─────────────────────────────────────────────────────────────
export function CellEmpty({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#D5D8DC] text-[#BDC3C7] hover:border-[#8FC87A] hover:text-[#8FC87A] hover:bg-[#EEF5E6] transition-all group"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span className="text-xs font-medium">派發</span>
    </button>
  );
}

// ─── 格子：已派發 ─────────────────────────────────────────────────────────────
export function CellActive({ assignment, onClick }) {
  const pct = assignment.completionRate;
  const barColor = pct === 100 ? '#8FC87A' : pct >= 50 ? '#F4D03F' : '#F28B95';
  const isComplete = pct === 100;

  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[88px] flex flex-col items-start justify-between p-3 rounded-2xl border transition-all ${
        isComplete
          ? 'bg-[#C8EAAE] border-[#8FC87A] hover:bg-[#8FC87A]'
          : pct === 0
          ? 'bg-[#EEF5E6] border-[#D5D8DC] hover:bg-[#DDE8D4]'
          : 'bg-[#FCF0C2] border-[#F5D669] hover:bg-[#F8E89A]'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`text-xs font-semibold ${
          isComplete ? 'text-[#3D5A3E]' : pct === 0 ? 'text-[#95A5A6]' : 'text-[#B7950B]'
        }`}>
          {isComplete ? '已完成' : pct === 0 ? '待作答' : '進行中'}
        </span>
        <svg className="w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </div>
      <div className="w-full">
        <div className="flex items-end justify-between mb-1.5">
          <span className={`text-xl font-bold leading-none ${
            isComplete ? 'text-[#3D5A3E]' : pct === 0 ? 'text-[#95A5A6]' : 'text-[#B7950B]'
          }`}>
            {pct}%
          </span>
          <span className="text-xs text-[#636E72]">{assignment.submittedCount}/{assignment.totalStudents}</span>
        </div>
        <div className="w-full bg-white/60 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        {assignment.dueDate && (
          <p className="text-[10px] text-[#95A5A6] mt-1.5 truncate">截止：{assignment.dueDate}</p>
        )}
      </div>
    </button>
  );
}

// 用觸發按鈕的 bounding rect 算出 fixed 座標，避免被 overflow-hidden 容器切掉
// 注意：
// 1. 不掛 scroll listener — date input focus 會觸發 scrollIntoView，
//    重算座標的 re-render 會干擾原生 date picker 開啟。
// 2. 桌機 / 手機矩陣同時掛 popover，必須跳過「不可見」的副本，
//    否則隱藏副本的 click-outside handler 會把使用者點選的可見 popover 關掉。
function useAnchoredFixedPosition(ref, onClose) {
  const [coords, setCoords] = useState(null);
  // anchor 不可見時（offsetParent 為 null），整個 hook 直接跳過。
  const isVisible = () => {
    const anchor = ref.current?.parentElement?.querySelector('button');
    return Boolean(anchor && anchor.offsetParent !== null);
  };
  useEffect(() => {
    if (!isVisible()) return;
    const anchor = ref.current.parentElement.querySelector('button');
    const update = () => {
      const r = anchor.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  useEffect(() => {
    if (!isVisible()) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, onClose]);
  return coords;
}

// ─── Popover：派發考卷（診斷分頁，整班派發） ─────────────────────────────────
export function AssignPopover({ quiz, cls, onConfirm, onClose }) {
  const [dueDate, setDueDate] = useState('');
  const ref = useRef(null);
  const coords = useAnchoredFixedPosition(ref, onClose);

  return (
    <div
      ref={ref}
      style={coords ? { position: 'fixed', top: coords.top, left: coords.left } : { visibility: 'hidden', position: 'fixed' }}
      className="z-50 bg-white border border-[#BDC3C7] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-4 w-56"
    >
      <div className="mb-3">
        <p className="text-xs font-bold text-[#2D3436] leading-snug">
          派發給 <span style={{ color: cls.textColor }}>{cls.name}</span>
        </p>
        <p className="text-xs text-[#95A5A6] mt-0.5 truncate">{quiz.title}</p>
      </div>
      <div className="mb-3">
        <label className="text-xs text-[#636E72] mb-1 block">截止日期（選填）</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-[#BDC3C7] rounded-xl px-2.5 py-1.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-1.5 text-xs font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => onConfirm(dueDate)}
          className="flex-1 py-1.5 text-xs font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors"
        >
          確認派發
        </button>
      </div>
    </div>
  );
}

// ─── Popover：管理已派發考卷（兩個分頁共用，依 isScenario 切換主按鈕） ───────
export function ManagePopover({
  assignment, quiz, cls, isScenario,
  onViewReport, onUpdateDueDate, onRemove, onEditTargets, onClose,
}) {
  const [dueDate, setDueDate] = useState(assignment.dueDate || '');
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [dueDateDirty, setDueDateDirty] = useState(false);
  const ref = useRef(null);
  const coords = useAnchoredFixedPosition(ref, onClose);

  const handleDueDateChange = (value) => {
    setDueDate(value);
    setDueDateDirty(value !== (assignment.dueDate || ''));
  };

  const handleSaveDueDate = () => {
    onUpdateDueDate(assignment.id, dueDate);
    setDueDateDirty(false);
  };

  const pct = assignment.completionRate;

  return (
    <div
      ref={ref}
      style={coords ? { position: 'fixed', top: coords.top, left: coords.left } : { visibility: 'hidden', position: 'fixed' }}
      className="z-50 bg-white border border-[#BDC3C7] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-4 w-64"
    >
      {/* 標題 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
          <p className="text-sm font-bold text-[#2D3436]">{cls.name}</p>
        </div>
        <p className="text-xs text-[#95A5A6] truncate">{quiz.title}</p>
      </div>

      {/* 資訊列 */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#636E72]">派發日期</span>
          <span className="text-[#2D3436] font-medium">{assignment.assignedAt}</span>
        </div>
        {isScenario && assignment.targetType === 'students' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#636E72]">指派對象</span>
            <span className="text-[#2E6B47] font-medium">
              {assignment.studentIds?.length ?? 0} 位學生
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#636E72]">完成進度</span>
          <span className={`font-bold ${pct === 100 ? 'text-[#3D5A3E]' : pct >= 50 ? 'text-[#B7950B]' : pct > 0 ? 'text-[#E74C5E]' : 'text-[#95A5A6]'}`}>
            {assignment.submittedCount}/{assignment.totalStudents} 人（{pct}%）
          </span>
        </div>
      </div>

      {/* 截止日期編輯 */}
      <div className="mb-4">
        <label className="text-xs text-[#636E72] mb-1 block">截止日期</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className="flex-1 border border-[#BDC3C7] rounded-xl px-2.5 py-1.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
          />
          {dueDateDirty && (
            <button
              onClick={handleSaveDueDate}
              className="px-3 py-1.5 text-xs font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors flex-shrink-0"
            >
              儲存
            </button>
          )}
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="space-y-2">
        {isScenario ? (
          <button
            onClick={() => onEditTargets(assignment)}
            className="w-full py-2 text-xs font-semibold bg-[#5BA47A] text-white border border-[#3F8B5E] rounded-xl hover:bg-[#3F8B5E] transition-colors"
          >
            調整派發對象
          </button>
        ) : (
          <button
            onClick={() => onViewReport(assignment.classId, assignment.quizId)}
            disabled={pct === 0}
            className={`w-full py-2 text-xs font-semibold rounded-xl border transition-colors ${
              pct > 0
                ? 'bg-[#8FC87A] text-[#2D3436] border-[#BDC3C7] hover:bg-[#76B563]'
                : 'bg-[#EEF5E6] text-[#95A5A6] border-[#D5D8DC] cursor-not-allowed'
            }`}
          >
            {pct > 0 ? '查看診斷報告' : '尚無作答資料'}
          </button>
        )}

        {/* 取消派發 */}
        {!confirmingRemove ? (
          <button
            onClick={() => setConfirmingRemove(true)}
            className="w-full py-2 text-xs font-medium text-[#E74C5E] border border-[#F5B8BA] rounded-xl hover:bg-[#FAC8CC] transition-colors"
          >
            取消派發
          </button>
        ) : (
          <div className="border border-[#F5B8BA] rounded-xl p-3 bg-[#FFF5F5]">
            <p className="text-xs text-[#E74C5E] mb-2 leading-relaxed">
              確定要取消派發嗎？已收到的作答資料將被清除。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingRemove(false)}
                className="flex-1 py-1.5 text-xs font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
              >
                返回
              </button>
              <button
                onClick={() => onRemove(assignment.id)}
                className="flex-1 py-1.5 text-xs font-semibold bg-[#E74C5E] text-white border border-[#E74C5E] rounded-xl hover:bg-[#C0392B] transition-colors"
              >
                確認取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
