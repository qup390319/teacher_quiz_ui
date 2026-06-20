import { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useUnits } from '../../../hooks/useAdminUnits';
import { useAllKnowledgeNodes, nodesForUnit } from '../../../hooks/useKnowledgeNodes';

/**
 * 步驟一：選擇單元。
 * - 列出「使用中」單元卡片；每張顯示節點數 / 迷思數。
 * - 未建好（沒節點或沒迷思）的單元標「建置中」、不可點選，點到時提示。
 * - 一份題組只綁一個單元 → 單選。切換單元會清空已選節點與已編題目（先確認）。
 */

function StatCount({ icon, value, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[#636E72]">
      <span className="material-symbols-rounded text-base text-[#8FC87A]">{icon}</span>
      <span className="font-bold text-[#2D3436]">{value}</span>
      {label}
    </span>
  );
}

export default function Step0Unit({ onNext }) {
  const {
    selectedUnitId, setSelectedUnitId,
    selectedNodeIds, setSelectedNodeIds,
    quizQuestions, setQuizQuestions,
    setIsWizardDirty,
  } = useApp();

  // 只取教學單元（type='unit'），與管理員「單元管理」一致；排除 type='subtheme' 的次主題
  const { data: units = [], isLoading: unitsLoading, error: unitsError } = useUnits({ type: 'unit' });
  const { data: allNodes = [], isLoading: nodesLoading } = useAllKnowledgeNodes();

  const [pendingUnit, setPendingUnit] = useState(null);   // 切換單元確認
  const [buildingNotice, setBuildingNotice] = useState(null); // 點到建置中單元的提示

  // 每個教學單元的節點數 / 迷思數（依該單元的大節點 parentNodes 反查節點）
  const statsByUnit = useMemo(() => {
    const map = {};
    units.forEach((u) => {
      const ns = nodesForUnit(u, allNodes);
      map[u.id] = {
        nodes: ns.length,
        misconceptions: ns.reduce((sum, n) => sum + (n.misconceptions?.length ?? 0), 0),
      };
    });
    return map;
  }, [units, allNodes]);

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name)),
    [units],
  );

  const isReady = (unit) => {
    const s = statsByUnit[unit.id];
    return !!s && s.nodes > 0 && s.misconceptions > 0;
  };

  const applyUnit = (unit) => {
    setSelectedUnitId(unit.id);
    setSelectedNodeIds([]);
    setQuizQuestions([]);
    setIsWizardDirty(false);
    setPendingUnit(null);
  };

  const handleSelect = (unit) => {
    setBuildingNotice(null);
    if (!isReady(unit)) {
      setBuildingNotice(unit.name);
      return;
    }
    if (unit.id === selectedUnitId) {
      onNext();
      return;
    }
    const hasWork = selectedNodeIds.length > 0 || quizQuestions.length > 0;
    if (hasWork) {
      setPendingUnit(unit);
      return;
    }
    applyUnit(unit);
  };

  const canProceed = selectedUnitId
    && sortedUnits.some((u) => u.id === selectedUnitId && isReady(u));

  const loading = unitsLoading || nodesLoading;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#2D3436] mb-1">步驟一：選擇單元</h2>
        <p className="text-[#636E72] text-[15px]">
          先選擇要出題的單元，下一步會顯示該單元的知識節點供你勾選。一份題組只對應一個單元。
        </p>
      </div>

      {/* 點到建置中單元的提示 */}
      {buildingNotice && (
        <div className="mb-5 bg-[#FCF0C2] border border-[#F5D669] rounded-2xl p-4 flex gap-3">
          <span className="material-symbols-rounded text-[#B7950B]">info</span>
          <p className="text-sm text-[#B7950B] leading-relaxed">
            「{buildingNotice}」尚在建置中（還沒有完整的知識節點與迷思概念），暫時無法出題。
            請聯絡系統管理員補齊內容後再試。
          </p>
        </div>
      )}

      {/* 題型：固定雙層次（two-tier）。本系統教師端只出雙層次題。spec-04、spec-11。 */}
      <div className="mb-6">
        <p className="text-sm font-bold text-[#2D3436] mb-2">題型</p>
        <div className="rounded-2xl border border-[#8FC87A] bg-[#EEF5E6] p-4">
          <span className="flex items-center gap-2 mb-1">
            <span className="material-symbols-rounded text-base text-[#5C8A2E]">stacked_bar_chart</span>
            <span className="text-sm font-bold text-[#2D3436]">雙層次（two-tier）</span>
            <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#8FC87A] px-2 py-0.5 rounded-full">
              <span className="material-symbols-rounded text-sm">check</span>本系統題型
            </span>
          </span>
          <p className="text-sm text-[#636E72] leading-relaxed">先選答案、再選理由，四象限判定。</p>
        </div>
      </div>

      {/* 分隔線 + 單元區塊標題 */}
      <div className="border-t border-[#E5E7EB] mb-4" />
      <p className="text-sm font-bold text-[#2D3436] mb-2">單元</p>

      {loading && <div className="text-sm text-[#636E72] py-12 text-center">載入單元中…</div>}
      {unitsError && <div className="text-sm text-[#E74C5E] py-12 text-center">載入單元失敗，請稍後再試。</div>}

      {!loading && !unitsError && sortedUnits.length === 0 && (
        <div className="bg-white rounded-[24px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="text-[#636E72] font-medium">目前沒有可出題的單元</p>
          <p className="text-sm text-[#95A5A6] mt-1">請聯絡系統管理員建立單元與知識節點。</p>
        </div>
      )}

      {!loading && !unitsError && sortedUnits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedUnits.map((unit) => {
            const ready = isReady(unit);
            const stats = statsByUnit[unit.id] ?? { nodes: 0, misconceptions: 0 };
            const isSelected = ready && unit.id === selectedUnitId;
            return (
              <button
                key={unit.id}
                type="button"
                onClick={() => handleSelect(unit)}
                aria-disabled={!ready}
                className={`text-left rounded-2xl border px-4 py-3 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${
                  isSelected
                    ? 'border-[#8FC87A] bg-[#EEF5E6] ring-2 ring-[#8FC87A]'
                    : ready
                      ? 'border-[#BDC3C7] bg-white hover:bg-[#F1F6EE] hover:border-[#8FC87A] cursor-pointer'
                      : 'border-[#E5E7EB] bg-[#F7F8F9] opacity-80 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className={`text-base font-bold ${ready ? 'text-[#2D3436]' : 'text-[#95A5A6]'}`}>
                    {unit.name}
                  </h3>
                  {ready ? (
                    isSelected && (
                      <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#8FC87A] px-2 py-0.5 rounded-full flex-shrink-0">
                        <span className="material-symbols-rounded text-base">check</span>
                        已選
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-full flex-shrink-0">
                      <span className="material-symbols-rounded text-base">construction</span>
                      建置中
                    </span>
                  )}
                </div>
                {unit.description && (
                  <p className={`text-sm leading-snug mb-2 line-clamp-1 ${ready ? 'text-[#636E72]' : 'text-[#A0A6AB]'}`}>
                    {unit.description}
                  </p>
                )}
                <div className="flex items-center gap-4 flex-wrap">
                  <StatCount icon="account_tree" value={stats.nodes} label="節點" />
                  <StatCount icon="psychology_alt" value={stats.misconceptions} label="迷思" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 頁底「下一步」 */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all border-2 ${
            canProceed
              ? 'bg-[#8FC87A] text-[#2D3436] border-[#5C8A2E] hover:bg-[#76B563] shadow-[0_2px_8px_rgba(143,200,122,0.4)]'
              : 'bg-[#EEF5E6] text-[#95A5A6] border-[#D5D8DC] cursor-not-allowed'
          }`}
        >
          下一步：選擇節點
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 切換單元確認 */}
      {pendingUnit && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-[#FCF0C2] border border-[#F5D669] rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-rounded text-[#B7950B]">swap_horiz</span>
              </div>
              <div>
                <h3 className="font-bold text-[#2D3436]">切換到「{pendingUnit.name}」？</h3>
                <p className="text-sm text-[#636E72] mt-0.5">一份題組只能對應一個單元</p>
              </div>
            </div>
            <p className="text-sm text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3 mb-5 leading-relaxed">
              切換單元會清空目前已勾選的節點與已編輯的題目，且無法復原。確定要切換嗎？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingUnit(null)}
                className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => applyUnit(pendingUnit)}
                className="flex-1 py-2.5 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#5C8A2E] rounded-xl hover:bg-[#76B563] transition-colors"
              >
                確認切換
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
