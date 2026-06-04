import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import {
  useAdminUnits,
  useArchiveUnit,
  useDeleteUnit,
  useUnarchiveUnit,
} from '../../hooks/useAdminUnits';
import AdminConfirmModal from './components/AdminConfirmModal';
import UnitFormModal from './components/UnitFormModal';
import UnitParentNodesModal from './components/UnitParentNodesModal';

/**
 * /admin/units — 單元管理（spec-02 §3.7、spec-14）。
 *
 * - 單一清單，依 display_order 排序（不再分年段）
 * - 「水溶液」標 is_system_current，不可封存 / 刪除（後端 409 防呆 + 前端按鈕 disabled）
 * - 新增 / 編輯 / 封存 / 啟用 / 刪除
 */

const UNIT_BAR_COLOR = '#7DD3A8';

function StatusPill({ status }) {
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">
        已封存
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
      使用中
    </span>
  );
}

function SystemBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1E40AF]" title="系統現有知識節點所屬單元，不可封存或刪除">
      <span className="material-symbols-rounded text-sm">verified</span>
      系統內建
    </span>
  );
}

function ParentNodeChips({ nodes }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-[11px] text-[#9CA3AF] mt-1">尚未綁定大節點</div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      <span className="text-[11px] text-[#6B7280]">
        包含 <strong className="text-[#15803D]">{nodes.length}</strong> 個大節點
      </span>
      {nodes.map((n) => (
        <span
          key={n.parentNodeId}
          title={n.name}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#F0FAF4] text-[#15803D] border border-[#D1F0DE]"
        >
          {n.code}
        </span>
      ))}
    </div>
  );
}

function UnitRow({ unit, onEdit, onArchive, onUnarchive, onDelete, onManageParents }) {
  const isSystem = unit.isSystemCurrent;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${unit.status === 'archived' ? 'border-[#E5E7EB] bg-[#F9FAFB] opacity-75' : 'border-[#E5E7EB] bg-white hover:bg-[#F4F8F6]'} transition-colors`}>
      <span
        className="w-1 h-10 rounded-full shrink-0"
        style={{ background: UNIT_BAR_COLOR }}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold text-[#1F2937]">{unit.name}</div>
          {isSystem && <SystemBadge />}
          <StatusPill status={unit.status} />
        </div>
        {unit.description && (
          <div className="text-xs text-[#4B5563] mt-1 line-clamp-2">{unit.description}</div>
        )}
        <ParentNodeChips nodes={unit.parentNodes} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onManageParents(unit)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#DCFCE7] text-[#15803D]"
          title="管理本單元下的大節點（課綱內容細目）"
        >
          <span className="material-symbols-rounded text-sm">account_tree</span>
          管理大節點
        </button>
        <button
          type="button"
          onClick={() => onEdit(unit)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#DBEAFE] text-[#1E40AF]"
        >
          編輯
        </button>
        {unit.status === 'active' ? (
          <button
            type="button"
            onClick={() => onArchive(unit)}
            disabled={isSystem}
            title={isSystem ? '系統內建單元不可封存' : '封存此單元'}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#FEF3C7] text-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            封存
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUnarchive(unit)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#DCFCE7] text-[#15803D]"
          >
            啟用
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(unit)}
          disabled={isSystem}
          title={isSystem ? '系統內建單元不可刪除' : '永久刪除（不可復原）'}
          className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-rounded text-lg">delete</span>
        </button>
      </div>
    </div>
  );
}

function UnitList({ units, onEdit, onArchive, onUnarchive, onDelete, onManageParents }) {
  if (units.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-6 text-center text-sm text-[#9CA3AF]">
        尚未建立單元
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {units.map((u) => (
        <UnitRow
          key={u.id}
          unit={u}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
          onManageParents={onManageParents}
        />
      ))}
    </div>
  );
}

export default function UnitsManagement() {
  const { data: units = [], isLoading, error } = useAdminUnits({ type: 'unit' });
  const { toast } = useToast();
  const archiveMut = useArchiveUnit();
  const unarchiveMut = useUnarchiveUnit();
  const deleteMut = useDeleteUnit();

  const [showCreate, setShowCreate] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, unit }
  const [includeArchived, setIncludeArchived] = useState(true);
  const [managingParents, setManagingParents] = useState(null); // unit obj or null

  const visibleUnits = useMemo(() => {
    const filtered = includeArchived ? units : units.filter((u) => u.status === 'active');
    return [...filtered].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
    );
  }, [units, includeArchived]);

  const counts = useMemo(() => ({
    total: units.length,
    active: units.filter((u) => u.status === 'active').length,
    archived: units.filter((u) => u.status === 'archived').length,
  }), [units]);

  const performConfirm = async () => {
    if (!confirmAction) return;
    const { type, unit } = confirmAction;
    try {
      if (type === 'archive') {
        await archiveMut.mutateAsync(unit.id);
        toast.success(`已封存「${unit.name}」`);
      } else if (type === 'unarchive') {
        await unarchiveMut.mutateAsync(unit.id);
        toast.success(`已啟用「${unit.name}」`);
      } else if (type === 'delete') {
        await deleteMut.mutateAsync(unit.id);
        toast.success(`已刪除「${unit.name}」`);
      }
      setConfirmAction(null);
    } catch (err) {
      if (err?.code === 'UNIT_IS_SYSTEM_CURRENT') {
        toast.error('系統內建單元不可封存或刪除');
      } else {
        toast.error(err?.message || '操作失敗');
      }
    }
  };

  const confirmMeta = (() => {
    if (!confirmAction) return null;
    const { type, unit } = confirmAction;
    if (type === 'archive') {
      return {
        title: `封存單元「${unit.name}」`,
        message: '封存後此單元不會出現在教師端的選擇器中，但既有題組（如有）仍可正常運作。\n隨時可重新啟用。',
        confirmLabel: '確認封存',
        variant: 'primary',
      };
    }
    if (type === 'unarchive') {
      return {
        title: `啟用單元「${unit.name}」`,
        message: '啟用後此單元會回到教師端選擇器中。',
        confirmLabel: '確認啟用',
        variant: 'primary',
      };
    }
    return {
      title: `永久刪除「${unit.name}」`,
      message: '刪除後不可復原。若此單元下還有知識節點或題組，建議先封存而非直接刪除。',
      confirmLabel: '確認刪除',
      variant: 'danger',
    };
  })();

  return (
    <AdminLayout title="單元管理" breadcrumb="Dashboard / 單元管理">
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="text-sm text-[#1F2937]">
          共 <strong>{counts.total}</strong> 個單元 · 使用中 <strong className="text-[#15803D]">{counts.active}</strong> · 已封存 <strong className="text-[#6B7280]">{counts.archived}</strong>
        </div>
        <label className="inline-flex items-center gap-1.5 text-sm text-[#4B5563]">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="accent-[#7DD3A8] w-4 h-4"
          />
          顯示已封存
        </label>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold transition-colors"
        >
          <span className="material-symbols-rounded text-lg">add</span>
          新增單元
        </button>
      </div>

      {isLoading && <div className="text-sm text-[#6B7280] py-12 text-center">載入中…</div>}
      {error && <div className="text-sm text-[#B91C1C] py-12 text-center">載入失敗</div>}

      {!isLoading && !error && (
        <UnitList
          units={visibleUnits}
          onEdit={setEditingUnit}
          onArchive={(u) => setConfirmAction({ type: 'archive', unit: u })}
          onUnarchive={(u) => setConfirmAction({ type: 'unarchive', unit: u })}
          onDelete={(u) => setConfirmAction({ type: 'delete', unit: u })}
          onManageParents={setManagingParents}
        />
      )}

      {showCreate && (
        <UnitFormModal
          onClose={() => setShowCreate(false)}
          onSuccess={(u) => toast.success(`已新增單元「${u.name}」`)}
        />
      )}

      {editingUnit && (
        <UnitFormModal
          isEdit
          initial={editingUnit}
          onClose={() => setEditingUnit(null)}
          onSuccess={(u) => toast.success(`已更新「${u.name}」`)}
        />
      )}

      {managingParents && (
        <UnitParentNodesModal
          unit={managingParents}
          onClose={() => setManagingParents(null)}
        />
      )}

      {confirmAction && confirmMeta && (
        <AdminConfirmModal
          {...confirmMeta}
          isPending={archiveMut.isPending || unarchiveMut.isPending || deleteMut.isPending}
          onConfirm={performConfirm}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </AdminLayout>
  );
}
