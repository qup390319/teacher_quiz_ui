import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminUnits } from '../../hooks/useAdminUnits';
import { useAdminParentNodes } from '../../hooks/useAdminParentNodes';
import { useAdminKnowledgeNodes } from '../../hooks/useAdminKnowledgeNodes';
import { useToast } from '../../context/ToastContext';
import DocxImportModal from './components/DocxImportModal';

/**
 * /admin/subthemes — 課綱次主題庫（spec-02 §3.9、spec-14）。
 *
 * 用途：admin 瀏覽 + 匯入 108 課綱「次主題」階層（次主題 → 大節點 → 小節點）。
 * 純瀏覽，編輯既有次主題的內容（大節點 / 小節點）走「知識節點」頁的階層結構視圖。
 * 「從 Word 匯入」按鈕在本頁右上角；畫布頁不再提供匯入入口，避免功能重複。
 */

const GRADE_BAND_LABELS = {
  upper: '高年級（5–6 年級）',
  middle: '中年級（3–4 年級）',
  lower: '低年級（1–2 年級）',
};

const GRADE_BAND_COLORS = {
  upper: { bar: '#5BA8DC', soft: '#DBEAFE', strong: '#1E40AF' },
  middle: { bar: '#7DD3A8', soft: '#DCFCE7', strong: '#15803D' },
  lower: { bar: '#F0B962', soft: '#FEF3C7', strong: '#B45309' },
};

function SubthemeRow({ subtheme, color, counts }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] transition-colors">
      <span
        className="w-1 h-10 rounded-full shrink-0"
        style={{ background: color.bar }}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold text-[#1F2937]">{subtheme.name}</div>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: color.soft, color: color.strong }}
          >
            <span className="material-symbols-rounded text-sm">menu_book</span>
            課綱次主題
          </span>
          {subtheme.status === 'archived' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">
              已封存
            </span>
          )}
        </div>
        <div className="text-xs text-[#6B7280] mt-0.5 font-mono">{subtheme.code}</div>
      </div>
      <div className="flex items-center gap-5 shrink-0 text-xs">
        <div className="text-right">
          <div className="text-[#6B7280]">大節點</div>
          <div className="font-semibold text-[#1E40AF] text-base">{counts.parents}</div>
        </div>
        <div className="text-right">
          <div className="text-[#6B7280]">小節點</div>
          <div className="font-semibold text-[#15803D] text-base">{counts.children}</div>
        </div>
      </div>
    </div>
  );
}

function GradeSection({ band, subthemes, countsByUnit }) {
  const color = GRADE_BAND_COLORS[band];
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-base font-semibold text-[#1F2937]">{GRADE_BAND_LABELS[band]}</h2>
        <span className="text-xs text-[#6B7280]">{subthemes.length} 個次主題</span>
      </div>
      {subthemes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-6 text-center text-sm text-[#9CA3AF]">
          此年段尚未匯入課綱次主題
        </div>
      ) : (
        <div className="space-y-2">
          {subthemes.map((s) => (
            <SubthemeRow
              key={s.id}
              subtheme={s}
              color={color}
              counts={countsByUnit.get(s.id) || { parents: 0, children: 0 }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function SubthemesLibrary() {
  const { toast } = useToast();
  const { data: subthemes = [], isLoading, error } = useAdminUnits({ type: 'subtheme' });
  const { data: parentNodes = [] } = useAdminParentNodes();
  const { data: knowledgeNodes = [] } = useAdminKnowledgeNodes();
  const [showDocxImport, setShowDocxImport] = useState(false);

  const countsByUnit = useMemo(() => {
    const m = new Map();
    parentNodes.forEach((p) => {
      if (!p.unitId) return;
      const c = m.get(p.unitId) || { parents: 0, children: 0 };
      c.parents += 1;
      m.set(p.unitId, c);
    });
    knowledgeNodes.forEach((n) => {
      if (!n.unitId) return;
      const c = m.get(n.unitId) || { parents: 0, children: 0 };
      c.children += 1;
      m.set(n.unitId, c);
    });
    return m;
  }, [parentNodes, knowledgeNodes]);

  const grouped = useMemo(() => {
    const acc = { upper: [], middle: [], lower: [] };
    subthemes.forEach((u) => {
      if (acc[u.gradeBand]) acc[u.gradeBand].push(u);
    });
    return acc;
  }, [subthemes]);

  const totals = useMemo(() => {
    const subthemeIds = new Set(subthemes.map((s) => s.id));
    return {
      subthemes: subthemes.length,
      parents: parentNodes.filter((p) => subthemeIds.has(p.unitId)).length,
      children: knowledgeNodes.filter((n) => n.unitId && subthemeIds.has(n.unitId)).length,
    };
  }, [subthemes, parentNodes, knowledgeNodes]);

  return (
    <AdminLayout title="課綱次主題庫" breadcrumb="Dashboard / 課綱次主題庫">
      {/* Toolbar */}
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowDocxImport(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-[#1F2937] font-medium text-sm transition-colors"
          title="上傳 108 課綱知識節點關聯圖 docx，自動建立次主題 → 大節點 → 小節點階層"
        >
          <span className="material-symbols-rounded text-base">upload_file</span>
          從 Word 匯入
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="text-[#1F2937]">
          共 <strong>{totals.subthemes}</strong> 個次主題
        </div>
        <div className="text-[#D1D5DB]">·</div>
        <div className="text-[#1F2937]">
          <strong className="text-[#1E40AF]">{totals.parents}</strong> 個大節點
        </div>
        <div className="text-[#D1D5DB]">·</div>
        <div className="text-[#1F2937]">
          <strong className="text-[#15803D]">{totals.children}</strong> 個小節點
        </div>
        <div className="flex-1" />
        <div className="text-xs text-[#6B7280] inline-flex items-center gap-1">
          <span className="material-symbols-rounded text-base">info</span>
          本頁僅供瀏覽與匯入；既有次主題的大節點 / 小節點編修請至「知識節點」頁的階層結構視圖。
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-[#6B7280] py-12 text-center">載入中…</div>
      )}
      {error && (
        <div className="text-sm text-[#B91C1C] py-12 text-center">載入失敗</div>
      )}

      {!isLoading && !error && totals.subthemes === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
          <span className="material-symbols-rounded text-4xl text-[#9CA3AF]">menu_book</span>
          <p className="text-sm text-[#1F2937] font-medium mt-2">目前還沒有任何課綱次主題</p>
          <p className="text-xs text-[#6B7280] mt-1">
            點右上「從 Word 匯入」上傳 108 課綱 docx，即可批次建立次主題 → 大節點 → 小節點階層。
          </p>
          <button
            type="button"
            onClick={() => setShowDocxImport(true)}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white text-sm font-semibold"
          >
            <span className="material-symbols-rounded text-base">upload_file</span>
            從 Word 匯入
          </button>
        </div>
      )}

      {!isLoading && !error && totals.subthemes > 0 && (
        <>
          {grouped.upper.length > 0 && (
            <GradeSection band="upper" subthemes={grouped.upper} countsByUnit={countsByUnit} />
          )}
          {grouped.middle.length > 0 && (
            <GradeSection band="middle" subthemes={grouped.middle} countsByUnit={countsByUnit} />
          )}
          {grouped.lower.length > 0 && (
            <GradeSection band="lower" subthemes={grouped.lower} countsByUnit={countsByUnit} />
          )}
        </>
      )}

      {showDocxImport && (
        <DocxImportModal
          onClose={() => setShowDocxImport(false)}
          onSuccess={(r) => {
            const created = r.results.filter((x) => x.status === 'created').length;
            const merged = r.results.filter((x) => x.status === 'merged').length;
            const errors = r.results.filter((x) => x.status === 'error').length;
            const parts = [];
            if (created) parts.push(`新建 ${created} 個次主題`);
            if (merged) parts.push(`合併 ${merged} 個`);
            if (errors) parts.push(`失敗 ${errors} 個`);
            toast.success(`已匯入：${parts.join('、') || '無變更'}`);
          }}
        />
      )}
    </AdminLayout>
  );
}
