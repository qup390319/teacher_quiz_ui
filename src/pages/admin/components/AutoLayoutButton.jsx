import { useBulkUpdatePositions } from '../../../hooks/useAdminKnowledgeNodes';
import { computeAutoLayout } from './KnowledgeNodeCanvas';

/**
 * 把節點以「parent_code 分欄、learning_order 分列」自動排版，並 bulk-update DB。
 */
export default function AutoLayoutButton({ rawNodes, onApplied }) {
  const positionMut = useBulkUpdatePositions();
  const handler = () => {
    const positions = computeAutoLayout(rawNodes);
    const payload = Object.entries(positions).map(([id, { x, y }]) => ({ id, x, y }));
    positionMut.mutate(payload, { onSuccess: () => onApplied?.() });
  };
  return (
    <button
      type="button"
      onClick={handler}
      disabled={positionMut.isPending}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-sm font-medium text-[#1F2937] disabled:opacity-50"
    >
      <span className="material-symbols-rounded text-base">auto_awesome_motion</span>
      自動排版
    </button>
  );
}
