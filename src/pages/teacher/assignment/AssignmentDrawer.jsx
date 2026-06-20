import { useEffect, useState } from 'react';
import { Icon } from '../../../components/ui/woodKit';

/**
 * 派題管理右側抽屜：管理「單一題組」對所有班級的派發。
 * 因應班級數量很多——提供搜尋、狀態篩選、全選未派發 + 批次派發、逐班管理。
 */
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'empty', label: '未派發' },
  { key: 'active', label: '作答中' },
  { key: 'done', label: '已完成' },
];

function classStatus(assignment) {
  if (!assignment) return 'empty';
  const pct = assignment.completionRate ?? 0;
  if (pct >= 100) return 'done';
  return 'active'; // 含待作答(0%)與進行中
}

export default function AssignmentDrawer({
  quiz, classes, assignments,
  onAssign, onBatchAssign, onUpdateDueDate, onRemove, onViewReport, onClose,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [batchDue, setBatchDue] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const assignmentOf = (classId) => assignments.find(
    (a) => (a.type ?? 'diagnosis') === 'diagnosis' && a.quizId === quiz.id && a.classId === classId,
  );

  const counts = { all: classes.length, empty: 0, active: 0, done: 0 };
  classes.forEach((cls) => { counts[classStatus(assignmentOf(cls.id))] += 1; });

  const kw = search.trim();
  const rows = classes.filter((cls) => {
    if (kw && !cls.name.includes(kw)) return false;
    if (filter === 'all') return true;
    return classStatus(assignmentOf(cls.id)) === filter;
  });

  const visibleUnassigned = rows.filter((c) => !assignmentOf(c.id));
  const allUnassignedSelected = visibleUnassigned.length > 0
    && visibleUnassigned.every((c) => selected.has(c.id));
  const dueMissing = !batchDue;

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allUnassignedSelected) visibleUnassigned.forEach((c) => next.delete(c.id));
    else visibleUnassigned.forEach((c) => next.add(c.id));
    return next;
  });

  const doBatch = () => {
    if (selected.size === 0 || dueMissing) return;
    onBatchAssign([...selected], batchDue);
    setSelected(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="w-full max-w-xl bg-white border-l border-[#BDC3C7] shadow-[-4px_0_20px_rgba(0,0,0,0.08)] flex flex-col">
        {/* 標題 */}
        <div className="px-5 py-4 border-b border-[#D5D8DC] flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#2D3436] leading-snug">管理派發</h3>
            <p className="text-sm text-[#636E72] mt-0.5 truncate">{quiz.title}</p>
            <p className="text-xs text-[#95A5A6] mt-0.5">
              共 {counts.all} 班 — 已派 {counts.active + counts.done} · 未派 {counts.empty}
            </p>
          </div>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72] flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 派發設定（批次與單筆共用）——截止日為必填 */}
        <div className="px-5 py-3 border-b border-[#D5D8DC] bg-[#F4F7F3] flex-shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="batch-due" className="text-sm text-[#636E72]">
              截止日 <span className="text-[#E74C5E]">*</span>
            </label>
            <span className="text-xs text-[#95A5A6]">（必填，套用到下方派發）</span>
            <input
              id="batch-due"
              type="date"
              value={batchDue}
              onChange={(e) => setBatchDue(e.target.value)}
              className={`ml-auto border rounded-lg px-2 py-1 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] ${dueMissing ? 'border-[#F0B962] bg-[#FFF9EC]' : 'border-[#BDC3C7]'}`}
            />
          </div>
          {dueMissing && (
            <p className="text-xs text-[#B7950B] mt-1.5 flex items-center gap-1">
              <Icon name="info" className="text-sm" />
              請先填寫截止日，才能派發。
            </p>
          )}
        </div>

        {/* 搜尋 + 篩選 */}
        <div className="px-5 py-3 border-b border-[#D5D8DC] flex-shrink-0 space-y-2.5">
          <div className="relative">
            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#95A5A6] text-lg" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋班級…"
              className="w-full border border-[#BDC3C7] rounded-xl pl-9 pr-3 py-1.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-sm font-semibold rounded-full border transition-colors ${
                  filter === f.key
                    ? 'bg-[#C8EAAE] border-[#8FC87A] text-[#3D5A3E]'
                    : 'bg-white border-[#D5D8DC] text-[#636E72] hover:bg-[#EEF5E6]'
                }`}
              >
                {f.label} {counts[f.key]}
              </button>
            ))}
          </div>
          {visibleUnassigned.length > 0 && (
            <div className="flex items-center justify-between gap-2 bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-[#3D5A3E] cursor-pointer">
                <input type="checkbox" checked={allUnassignedSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-[#8FC87A]" />
                全選未派發（{visibleUnassigned.length} 班）
              </label>
              <button
                type="button"
                onClick={doBatch}
                disabled={selected.size === 0 || dueMissing}
                title={dueMissing ? '請先填寫截止日' : undefined}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-lg hover:bg-[#76B563] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="send" className="text-base" />
                批次派發 {selected.size > 0 ? `${selected.size} 班` : ''}
              </button>
            </div>
          )}
        </div>

        {/* 班級列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-[#95A5A6] text-center py-10">沒有符合條件的班級</p>
          )}
          {rows.map((cls) => (
            <ClassRow
              key={cls.id}
              cls={cls}
              assignment={assignmentOf(cls.id)}
              selected={selected.has(cls.id)}
              onToggleSelect={() => toggleSelect(cls.id)}
              onAssign={() => onAssign(cls.id, batchDue)}
              assignDisabled={dueMissing}
              expanded={expandedId === assignmentOf(cls.id)?.id}
              onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
              removing={removingId === assignmentOf(cls.id)?.id}
              onAskRemove={setRemovingId}
              onUpdateDueDate={onUpdateDueDate}
              onRemove={onRemove}
              onViewReport={() => onViewReport(cls.id, quiz.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassRow({
  cls, assignment, selected, onToggleSelect, onAssign, assignDisabled,
  expanded, onToggleExpand, removing, onAskRemove, onUpdateDueDate, onRemove, onViewReport,
}) {
  const [due, setDue] = useState(assignment?.dueDate || '');
  if (!assignment) {
    return (
      <div className="flex items-center justify-between gap-3 p-2.5 border border-[#D5D8DC] rounded-xl">
        <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-4 h-4 accent-[#8FC87A]" />
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
          <span className="min-w-0">
            <span className="text-sm text-[#2D3436] block truncate">{cls.name}</span>
            <span className="text-xs text-[#95A5A6]">{cls.studentCount} 人</span>
          </span>
        </label>
        <button
          type="button"
          onClick={onAssign}
          disabled={assignDisabled}
          title={assignDisabled ? '請先填寫截止日' : undefined}
          className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] rounded-lg hover:bg-[#8FC87A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="add" className="text-base" />派發
        </button>
      </div>
    );
  }

  const pct = assignment.completionRate ?? 0;
  const done = pct >= 100;
  const tone = done
    ? { bg: 'bg-[#C8EAAE]', text: 'text-[#3D5A3E]', bar: '#5C8A2E', label: '已完成' }
    : pct > 0
      ? { bg: 'bg-[#FCF0C2]', text: 'text-[#B7950B]', bar: '#E6B800', label: '進行中' }
      : { bg: 'bg-[#EEF5E6]', text: 'text-[#7A8A6E]', bar: '#C8D6C9', label: '待作答' };

  return (
    <div className="border border-[#D5D8DC] rounded-xl overflow-hidden">
      <button type="button" onClick={() => onToggleExpand(assignment.id)} className="w-full flex items-center justify-between gap-3 p-2.5 text-left hover:bg-[#F4F7F3] transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
            <span className="text-sm text-[#2D3436] truncate">{cls.name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tone.bg} ${tone.text}`}>{tone.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 ml-[18px]">
            <span className="h-1.5 w-28 max-w-[40%] bg-[#EEF1EF] rounded-full overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tone.bar }} />
            </span>
            <span className="text-xs text-[#95A5A6]">
              {assignment.submittedCount ?? 0}/{assignment.totalStudents ?? cls.studentCount} 人（{pct}%）{assignment.dueDate ? ` · 截止 ${assignment.dueDate.slice(5).replace('-', '/')}` : ''}
            </span>
          </div>
        </div>
        <Icon name="expand_more" className={`text-[#95A5A6] text-xl flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#EFF1F3] space-y-2.5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-[#636E72] mb-1 block">截止日期</label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full border border-[#BDC3C7] rounded-lg px-2.5 py-1.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
              />
            </div>
            {due !== (assignment.dueDate || '') && (
              <button onClick={() => onUpdateDueDate(assignment.id, due)} className="px-3 py-1.5 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-lg hover:bg-[#76B563] transition-colors">儲存</button>
            )}
          </div>
          <button
            onClick={onViewReport}
            disabled={pct === 0}
            className={`w-full py-2 text-sm font-semibold rounded-lg border transition-colors ${pct > 0 ? 'bg-[#8FC87A] text-[#2D3436] border-[#BDC3C7] hover:bg-[#76B563]' : 'bg-[#EEF5E6] text-[#95A5A6] border-[#D5D8DC] cursor-not-allowed'}`}
          >
            {pct > 0 ? '查看診斷報告' : '尚無作答資料'}
          </button>
          {!removing ? (
            <button onClick={() => onAskRemove(assignment.id)} className="w-full py-2 text-sm font-medium text-[#E74C5E] border border-[#F5B8BA] rounded-lg hover:bg-[#FAC8CC] transition-colors">取消派發</button>
          ) : (
            <div className="border border-[#F5B8BA] rounded-lg p-3 bg-[#FFF5F5]">
              <p className="text-sm text-[#E74C5E] mb-2 leading-relaxed">確定取消派發？已收到的作答資料將被清除。</p>
              <div className="flex gap-2">
                <button onClick={() => onAskRemove(null)} className="flex-1 py-1.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-lg hover:bg-[#EEF5E6] transition-colors">返回</button>
                <button onClick={() => onRemove(assignment.id)} className="flex-1 py-1.5 text-sm font-semibold bg-[#E74C5E] text-white border border-[#E74C5E] rounded-lg hover:bg-[#C0392B] transition-colors">確認取消</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
