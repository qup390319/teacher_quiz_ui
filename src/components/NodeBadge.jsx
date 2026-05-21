/**
 * NodeBadge — 知識節點識別徽章
 *
 * spec-07 §節點徽章 規範：
 * - 子主題 A（溶解 INe-II-3-*）= 藍系框線（sky）
 * - 子主題 B（酸鹼 INe-Ⅲ-5-*）= 橘系框線（orange）
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
    // 子主題 A：溶解 — 藍系
    bg: '#E6F2FB',
    border: '#3B8BC2',
    text: '#0E3A5C',
  },
  B: {
    // 子主題 B：酸鹼 — 橘系
    bg: '#FBEFE0',
    border: '#D4843C',
    text: '#7A4A18',
  },
  unknown: {
    bg: '#F0F1F2',
    border: '#95A5A6',
    text: '#2D3436',
  },
};

const SIZE_STYLES = {
  sm: 'text-[10px] px-1.5 py-0.5 rounded-md',
  md: 'text-xs px-2 py-0.5 rounded-md',
  lg: 'text-sm px-2.5 py-1 rounded-lg',
};

function detectSubject(nodeId) {
  if (!nodeId) return 'unknown';
  if (nodeId.includes('II-3')) return 'A';
  if (nodeId.includes('Ⅲ-5')) return 'B';
  return 'unknown';
}

function shortenId(nodeId) {
  if (!nodeId) return '—';
  // 'INe-II-3-02' → 'II-3-02'；'INe-Ⅲ-5-4' → 'Ⅲ-5-4'
  return nodeId.replace(/^INe-/, '');
}

export default function NodeBadge({ nodeId, name, size = 'md', showFullId = false, className = '' }) {
  const subject = detectSubject(nodeId);
  const s = SUBJECT_STYLES[subject];
  const sizeCls = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const label = showFullId ? (nodeId ?? '—') : shortenId(nodeId);
  const title = name ? `${nodeId} · ${name}` : nodeId;

  return (
    <span
      className={`inline-flex items-center font-mono font-bold border-2 whitespace-nowrap ${sizeCls} ${className}`}
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
      title={title}
    >
      {label}
    </span>
  );
}
