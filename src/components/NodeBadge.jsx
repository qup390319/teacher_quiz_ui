/**
 * NodeBadge — 知識節點識別徽章（D5 強化版）
 *
 * spec-07 §節點徽章 規範：
 * - 子主題 A（溶解 INe-II-3-*）= 藍系
 * - 子主題 B（酸鹼 INe-Ⅲ-5-*）= 橘系
 * - 左側色帶（color stripe）強化辨識，不只靠文字色
 * - 字體放大、min-width 加寬，回應教授「字體或圖標弄大」回饋
 * - 預設顯示短編號（去掉 INe- 前綴），完整 ID 在 tooltip
 *
 * Props:
 *   - nodeId: 完整節點 ID（如 'INe-II-3-02', 'INe-Ⅲ-5-4'）
 *   - name?: 節點名稱（會放 title 屬性供 hover）
 *   - size?: 'sm' | 'md' | 'lg'（預設 'md'）
 *   - showFullId?: boolean（預設 false，true 時顯示完整 ID）
 */

const SUBJECT_STYLES = {
  A: {
    bg: '#E6F2FB',
    border: '#3B8BC2',
    text: '#0E3A5C',
    stripe: '#3B8BC2',
  },
  B: {
    bg: '#FBEFE0',
    border: '#D4843C',
    text: '#7A4A18',
    stripe: '#D4843C',
  },
  unknown: {
    bg: '#F0F1F2',
    border: '#95A5A6',
    text: '#2D3436',
    stripe: '#95A5A6',
  },
};

const SIZE_STYLES = {
  sm: { text: 'text-[15px]',   padX: 'pl-2 pr-2.5', padY: 'py-0.5', rounded: 'rounded-md', minW: 'min-w-[68px]', stripeW: 'w-[4px]', gap: 'gap-1.5' },
  md: { text: 'text-[15px]',   padX: 'pl-2.5 pr-3', padY: 'py-1',   rounded: 'rounded-md', minW: 'min-w-[76px]', stripeW: 'w-[4px]', gap: 'gap-1.5' },
  lg: { text: 'text-base',     padX: 'pl-2.5 pr-3', padY: 'py-1.5', rounded: 'rounded-lg', minW: 'min-w-[88px]', stripeW: 'w-[5px]', gap: 'gap-2' },
};

function detectSubject(nodeId) {
  if (!nodeId) return 'unknown';
  if (nodeId.includes('II-3')) return 'A';
  if (nodeId.includes('Ⅲ-5')) return 'B';
  return 'unknown';
}

function shortenId(nodeId) {
  if (!nodeId) return '—';
  return nodeId.replace(/^INe-/, '');
}

export default function NodeBadge({ nodeId, name, size = 'md', showFullId = false, className = '' }) {
  const subject = detectSubject(nodeId);
  const s = SUBJECT_STYLES[subject];
  const sz = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const label = showFullId ? (nodeId ?? '—') : shortenId(nodeId);

  return (
    <span className={`group relative inline-flex align-middle ${className}`}>
      <span
        className={`inline-flex items-center overflow-hidden border whitespace-nowrap cursor-help ${sz.rounded} ${sz.minW}`}
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      >
        {/* 左側色帶：強化視覺辨識 */}
        <span
          className={`self-stretch ${sz.stripeW} flex-shrink-0`}
          style={{ backgroundColor: s.stripe }}
          aria-hidden="true"
        />
        <span
          className={`inline-flex items-center font-mono font-bold ${sz.text} ${sz.padX} ${sz.padY}`}
          style={{ color: s.text }}
        >
          {label}
        </span>
      </span>
      {/* Hover tooltip：完整節點 ID（黃色 mono）+ 完整名稱（白色 15px） */}
      {nodeId && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 bottom-full mb-2 w-72 max-w-[85vw] opacity-0 group-hover:opacity-100 transition-opacity z-30"
        >
          <span className="block bg-[#2D3436] text-white rounded-lg shadow-lg px-3 py-2">
            <span className="block font-mono text-[15px] font-bold text-[#FBE9C7] mb-0.5">{nodeId}</span>
            {name && (
              <span className="block text-[15px] font-medium leading-relaxed text-white">{name}</span>
            )}
          </span>
          <span
            className="absolute left-6 top-full w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #2D3436',
            }}
          />
        </span>
      )}
    </span>
  );
}
