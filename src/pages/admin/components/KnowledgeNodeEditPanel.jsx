import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import {
  useCreateMisconception,
  useDeleteKnowledgeNode,
  useDeleteMisconception,
  useUpdateKnowledgeNode,
  useUpdateMisconception,
} from '../../../hooks/useAdminKnowledgeNodes';

/**
 * 右側編輯側邊欄：顯示選中節點的詳細欄位 + 該節點下的迷思清單與 CRUD。
 * - ID 永遠唯讀（避免破壞既有 FK 引用）
 * - 系統 seed 節點不可刪
 */

function FieldRow({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">
        {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function MisconceptionItem({ m, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(m.label);
  const [detail, setDetail] = useState(m.detail || '');
  const [studentDetail, setStudentDetail] = useState(m.studentDetail || '');
  const [confirmQ, setConfirmQ] = useState(m.confirmQuestion || '');
  const updateMut = useUpdateMisconception();
  const deleteMut = useDeleteMisconception();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        id: m.id, label, detail: detail || null,
        studentDetail: studentDetail || null,
        confirmQuestion: confirmQ || null,
      });
      toast.success('已儲存');
      setEditing(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || '儲存失敗');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`確定刪除「${m.label}」？`)) return;
    try {
      await deleteMut.mutateAsync(m.id);
      toast.success('已刪除');
      onDeleted?.();
    } catch (err) {
      toast.error(err?.message || '刪除失敗');
    }
  };

  if (!editing) {
    return (
      <div className="border border-[#E5E7EB] rounded-xl p-3 bg-white">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1F2937]">{m.label}</div>
            <div className="text-xs text-[#6B7280] font-mono mt-0.5">{m.id}</div>
            {m.detail && <div className="text-xs text-[#4B5563] mt-1 line-clamp-2">{m.detail}</div>}
            {m.source && (
              <div className="text-[11px] text-[#9CA3AF] mt-1 line-clamp-2" title={m.source}>
                <span className="material-symbols-rounded text-xs align-middle mr-0.5">menu_book</span>
                {m.source}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setEditing(true)}
                  className="text-xs text-[#1E40AF] hover:underline shrink-0">編輯</button>
          <button type="button" onClick={handleDelete}
                  className="text-xs text-[#B91C1C] hover:underline shrink-0">刪除</button>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-[#7DD3A8] rounded-xl p-3 bg-[#F4F8F6] space-y-2">
      <div className="text-xs text-[#6B7280] font-mono">{m.id}</div>
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
             placeholder="迷思短標"
             className="w-full px-2 py-1 rounded-md border border-[#E5E7EB] text-sm" />
      <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2}
                placeholder="教師視角描述"
                className="w-full px-2 py-1 rounded-md border border-[#E5E7EB] text-sm" />
      <textarea value={studentDetail} onChange={(e) => setStudentDetail(e.target.value)} rows={2}
                placeholder="學生視角描述"
                className="w-full px-2 py-1 rounded-md border border-[#E5E7EB] text-sm" />
      <textarea value={confirmQ} onChange={(e) => setConfirmQ(e.target.value)} rows={2}
                placeholder="AI 二次確認問句"
                className="w-full px-2 py-1 rounded-md border border-[#E5E7EB] text-sm" />
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => setEditing(false)} disabled={updateMut.isPending}
                className="text-xs px-2 py-1 rounded-md border border-[#E5E7EB] bg-white">取消</button>
        <button type="button" onClick={handleSave} disabled={updateMut.isPending}
                className="text-xs px-2 py-1 rounded-md bg-[#7DD3A8] text-white font-semibold">
          {updateMut.isPending ? '儲存中…' : '儲存'}
        </button>
      </div>
    </div>
  );
}

function AddMisconceptionInline({ nodeId, existingIds, onAdded }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const createMut = useCreateMisconception();
  const { toast } = useToast();

  const submit = async () => {
    if (!id.trim() || !label.trim()) return;
    if (existingIds.includes(id.trim())) {
      toast.error('迷思 ID 已存在');
      return;
    }
    try {
      await createMut.mutateAsync({ nodeId, id: id.trim(), label: label.trim() });
      toast.success('已新增迷思');
      setId(''); setLabel(''); setOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error(err?.message || '新增失敗');
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
              className="w-full py-2 rounded-xl border border-dashed border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F4F8F6] hover:border-[#7DD3A8] transition-colors">
        + 新增迷思概念
      </button>
    );
  }
  return (
    <div className="border border-[#7DD3A8] rounded-xl p-3 bg-[#F4F8F6] space-y-2">
      <input type="text" value={id} onChange={(e) => setId(e.target.value)}
             placeholder="ID（例：M01-5）"
             className="w-full px-2 py-1 rounded-md border border-[#E5E7EB] text-sm font-mono" />
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
             placeholder="迷思短標"
             className="w-full px-2 py-1 rounded-md border border-[#E5E7EB] text-sm" />
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => { setOpen(false); setId(''); setLabel(''); }}
                disabled={createMut.isPending}
                className="text-xs px-2 py-1 rounded-md border border-[#E5E7EB] bg-white">取消</button>
        <button type="button" onClick={submit} disabled={createMut.isPending || !id.trim() || !label.trim()}
                className="text-xs px-2 py-1 rounded-md bg-[#7DD3A8] text-white font-semibold disabled:opacity-50">
          {createMut.isPending ? '新增中…' : '新增'}
        </button>
      </div>
      <div className="text-xs text-[#6B7280]">建立後可點「編輯」補上詳細描述、學生視角、確認問句。</div>
    </div>
  );
}

function NodeEditForm({ node, units, onClose }) {
  const [name, setName] = useState(node.name || '');
  const [parentCode, setParentCode] = useState(node.parentCode || '');
  const [parentName, setParentName] = useState(node.parentName || '');
  const [learningOrder, setLearningOrder] = useState(node.learningOrder ?? 1);
  const [unitId, setUnitId] = useState(node.unitId || '');
  const [description, setDescription] = useState(node.description || '');
  const [videoTitle, setVideoTitle] = useState(node.videoTitle || '');
  const [videoUrl, setVideoUrl] = useState(node.videoUrl || '');
  const updateMut = useUpdateKnowledgeNode();
  const deleteMut = useDeleteKnowledgeNode();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        id: node.id,
        name, parentCode: parentCode || null, parentName: parentName || null,
        learningOrder, unitId: unitId || null,
        description: description || null,
        videoTitle: videoTitle || null, videoUrl: videoUrl || null,
      });
      toast.success('已儲存節點');
    } catch (err) {
      toast.error(err?.message || '儲存失敗');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`確定刪除節點「${node.name}」？此操作不可復原。`)) return;
    try {
      await deleteMut.mutateAsync(node.id);
      toast.success('已刪除節點');
      onClose?.();
    } catch (err) {
      if (err?.code === 'NODE_IS_SYSTEM_SEED') {
        toast.error('系統節點不可刪除');
      } else {
        toast.error(err?.message || '刪除失敗');
      }
    }
  };

  return (
    <aside className="w-96 border-l border-[#E5E7EB] bg-white overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <div className="p-5 space-y-4">
        {/* 標題列 */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1F2937] mb-1">編輯節點</div>
            <div className="font-mono text-xs text-[#6B7280] break-all">{node.id}</div>
          </div>
          {node.isSystemSeed && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1E40AF] shrink-0">
              系統節點
            </span>
          )}
        </div>

        {/* 基本資訊 */}
        <FieldRow label="名稱" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                 className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm" />
        </FieldRow>

        <FieldRow label="所屬單元">
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm bg-white">
            <option value="">（未分配）</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="大節點 / 學習內容（子主題）">
          <input type="text" value={parentCode} onChange={(e) => setParentCode(e.target.value)}
                 placeholder="例：INe-Ⅱ-3"
                 className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm font-mono mb-1" />
          <textarea value={parentName} onChange={(e) => setParentName(e.target.value)}
                    rows={2} placeholder="大節點描述"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm" />
        </FieldRow>

        <FieldRow label="學習順序">
          <input type="number" value={learningOrder}
                 onChange={(e) => setLearningOrder(Number(e.target.value) || 0)}
                 className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm" />
        </FieldRow>

        <FieldRow label="說明">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm" />
        </FieldRow>

        <FieldRow label="影片標題">
          <input type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)}
                 className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm" />
        </FieldRow>

        <FieldRow label="影片網址">
          <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                 className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm font-mono" />
        </FieldRow>

        <FieldRow label={`先備節點（${node.prerequisites?.length || 0}）`}>
          <div className="text-xs text-[#6B7280] mb-1">在畫布上拖線即可調整</div>
          <div className="flex flex-wrap gap-1">
            {(node.prerequisites || []).map((p) => (
              <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-[#F4F8F6] text-[#1F2937] border border-[#E5E7EB]">
                {p}
              </span>
            ))}
            {!(node.prerequisites?.length) && (
              <span className="text-xs text-[#9CA3AF]">無</span>
            )}
          </div>
        </FieldRow>

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          {!node.isSystemSeed && (
            <button type="button" onClick={handleDelete} disabled={deleteMut.isPending}
                    className="px-3 py-2 rounded-xl text-sm font-medium border border-[#E5E7EB] bg-white hover:bg-[#FEE2E2] text-[#B91C1C] disabled:opacity-50">
              刪除節點
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={updateMut.isPending}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white disabled:opacity-50">
            {updateMut.isPending ? '儲存中…' : '儲存節點'}
          </button>
        </div>

        {/* 迷思清單 */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <div className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">
            迷思概念 <span className="text-[#1F2937]">{node.misconceptions?.length || 0}</span> 條
          </div>
          <div className="space-y-2">
            {(node.misconceptions || []).map((m) => (
              <MisconceptionItem key={m.id} m={m} />
            ))}
            <AddMisconceptionInline
              nodeId={node.id}
              existingIds={(node.misconceptions || []).map((m) => m.id)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Wrapper：當切換節點時用 key={node.id} 強制 remount，避免在 effect 裡 setState。
 */
export default function KnowledgeNodeEditPanel({ node, units, onClose }) {
  if (!node) {
    return (
      <aside className="w-80 border-l border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
        從左側點選小節點以編輯。
      </aside>
    );
  }
  return <NodeEditForm key={node.id} node={node} units={units} onClose={onClose} />;
}
