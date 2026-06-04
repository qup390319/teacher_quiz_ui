import { useMemo, useState } from 'react';

// 用 inline style 做多行截斷：本專案 Tailwind build 未產生 line-clamp 工具類別，
// 改用 inline -webkit-box（一定生效），避免長名稱換行撐破面板版面。
const CLAMP_2 = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
};

/**
 * 畫布視圖左側「本次主題小節點」清單面板（spec-02 §3.9）。
 *
 * 依大節點（parent_code）分組列出該次主題全部小節點，標示是否已在畫布上：
 *   - 在畫布：綠點 + 點擊 → 畫布聚焦該節點（onFocusNode）
 *   - 節點庫（未上畫布）：灰點 + 點擊 → 快速加入畫布（onQuickAdd）
 * 可整體收合，不擋畫布。
 */
export default function CanvasNodeListPanel({
  canvasNodes = [],
  libraryNodes = [],
  onQuickAdd,
  onFocusNode,
  addingId = null,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => {
    const all = [
      ...canvasNodes.map((n) => ({ ...n, _onCanvas: true })),
      ...libraryNodes.map((n) => ({ ...n, _onCanvas: false })),
    ];
    const map = new Map();
    for (const n of all) {
      const key = n.parentCode || '(無大節點)';
      if (!map.has(key)) {
        map.set(key, { parentCode: n.parentCode, parentName: n.parentName, items: [] });
      }
      map.get(key).items.push(n);
    }
    const arr = [...map.values()];
    arr.forEach((g) => g.items.sort(
      (a, b) => (a.learningOrder ?? 0) - (b.learningOrder ?? 0) || a.id.localeCompare(b.id),
    ));
    arr.sort((a, b) => (a.parentCode || '').localeCompare(b.parentCode || ''));
    return arr;
  }, [canvasNodes, libraryNodes]);

  const total = canvasNodes.length + libraryNodes.length;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="展開本次主題小節點清單"
        className="shrink-0 w-9 self-stretch flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-[#6B7280]"
      >
        <span className="material-symbols-rounded text-lg">chevron_right</span>
        <span className="text-[11px] [writing-mode:vertical-rl]">小節點清單（{total}）</span>
      </button>
    );
  }

  return (
    <div className="shrink-0 w-64 self-stretch flex flex-col rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#E5E7EB] flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#1F2937]">本次主題小節點</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5">
            共 {total} · <span className="text-[#15803D]">在畫布 {canvasNodes.length}</span> · 待加入 {libraryNodes.length}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="收合"
          className="text-[#9CA3AF] hover:text-[#1F2937] p-0.5"
        >
          <span className="material-symbols-rounded text-lg">chevron_left</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {total === 0 && (
          <div className="px-2 py-6 text-center text-xs text-[#9CA3AF]">
            此次主題尚無小節點。<br />用「新增節點」建立，或從「未分配」指派。
          </div>
        )}
        {groups.map((g) => (
          <div key={g.parentCode || '_none'}>
            <div className="px-1.5 pb-1 flex items-baseline gap-1.5">
              <span className="text-[11px] font-mono font-semibold text-[#4B5563]">{g.parentCode || '(無大節點)'}</span>
              <span className="text-[10px] text-[#9CA3AF]">{g.items.length}</span>
            </div>
            {g.parentName && (
              <div className="px-1.5 pb-1 text-[10px] text-[#9CA3AF] truncate" title={g.parentName}>{g.parentName}</div>
            )}
            <div className="space-y-1">
              {g.items.map((n) => {
                const adding = addingId === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    disabled={adding}
                    onClick={() => (n._onCanvas ? onFocusNode?.(n.id) : onQuickAdd?.(n.id))}
                    title={n._onCanvas ? '在畫布上 — 點擊聚焦' : '在節點庫 — 點擊加入畫布'}
                    className={`group/item w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                      n._onCanvas
                        ? 'border-[#E5E7EB] bg-white hover:bg-[#F0FAF4]'
                        : 'border-dashed border-[#E5E7EB] bg-[#FAFBFC] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n._onCanvas ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="text-xs text-[#1F2937]" style={CLAMP_2}>{n.name}</span>
                      <span className="block text-[10px] font-mono text-[#9CA3AF] mt-0.5 truncate">{n.id}</span>
                    </span>
                    <span className="shrink-0 self-center">
                      {n._onCanvas ? (
                        <span className="text-[10px] text-[#15803D]">在畫布</span>
                      ) : adding ? (
                        <span className="text-[10px] text-[#6B7280]">加入中…</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#6B7280] group-hover/item:text-[#15803D]">
                          <span className="material-symbols-rounded text-sm">add</span>加入
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
