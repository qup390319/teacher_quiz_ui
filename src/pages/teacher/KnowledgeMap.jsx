import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { knowledgeNodes, mergeCustomsIntoNode } from '../../data/knowledgeGraph';
import {
  useCustomMisconceptions,
  useCreateCustomMisconception,
  useDeleteCustomMisconception,
} from '../../hooks/useCustomMisconceptions';
import AddCustomMisconceptionModal from '../../components/teacher/AddCustomMisconceptionModal';

const STAGE_COLORS = {
  blue:   { bg: 'bg-[#BADDF4]', text: 'text-[#2E86C1]', border: 'border-[#BDC3C7]' },
  pink:   { bg: 'bg-[#FAC8CC]', text: 'text-[#E74C5E]', border: 'border-[#BDC3C7]' },
  green:  { bg: 'bg-[#C8EAAE]', text: 'text-[#3D5A3E]', border: 'border-[#BDC3C7]' },
  yellow: { bg: 'bg-[#FCF0C2]', text: 'text-[#B7950B]', border: 'border-[#BDC3C7]' },
  mint:   { bg: 'bg-[#A8E6CF]', text: 'text-[#1E8449]', border: 'border-[#BDC3C7]' },
  purple: { bg: 'bg-[#F3E5F5]', text: 'text-[#7D3C98]', border: 'border-[#BDC3C7]' },
};

// 子主題 A：水溶液中的變化（溶解）— 5 個節點，5 個階段（線性）
const SUBTOPIC_A_STAGES = [
  { ids: ['INe-II-3-01'], color: 'blue',   nextArrow: 'single' },
  { ids: ['INe-II-3-02'], color: 'pink',   nextArrow: 'single' },
  { ids: ['INe-II-3-03'], color: 'green',  nextArrow: 'single' },
  { ids: ['INe-II-3-05'], color: 'yellow', nextArrow: 'single' },
  { ids: ['INe-II-3-04'], color: 'purple', nextArrow: null },
];

// 子主題 B：酸鹼反應 — 7 個節點，6 個階段（5-5、5-6 為平行階段）
const SUBTOPIC_B_STAGES = [
  { ids: ['INe-Ⅲ-5-1'], color: 'blue',   nextArrow: 'single' },
  { ids: ['INe-Ⅲ-5-2'], color: 'pink',   nextArrow: 'single' },
  { ids: ['INe-Ⅲ-5-3'], color: 'green',  nextArrow: 'single' },
  { ids: ['INe-Ⅲ-5-4'], color: 'yellow', nextArrow: 'multi' },
  { ids: ['INe-Ⅲ-5-5', 'INe-Ⅲ-5-6'], color: 'mint', nextArrow: 'multi' },
  { ids: ['INe-Ⅲ-5-7'], color: 'purple', nextArrow: null },
];

function Arrow({ multi = false }) {
  if (multi) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center self-stretch px-1">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-px flex-1 bg-[#BDC3C7]"></div>
          <svg className="w-4 h-4 text-[#95A5A6] flex-shrink-0 my-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="w-px flex-1 bg-[#BDC3C7]"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex items-center px-1">
      <svg className="w-4 h-4 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

function NodePill({ node, colorClass }) {
  return (
    <div className={`rounded-xl border px-3 py-1.5 min-w-[128px] ${colorClass.bg} ${colorClass.border}`}>
      <p className="text-xs font-mono text-[#95A5A6] leading-tight">{node.id}</p>
      <p className={`text-sm font-semibold leading-snug ${colorClass.text}`}>{node.name}</p>
    </div>
  );
}

function PathStage({ stage, nodes }) {
  const colorClass = STAGE_COLORS[stage.color];
  return (
    <>
      <div className="flex-shrink-0 flex flex-col gap-1.5">
        {nodes(stage.ids).map((node) => (
          <NodePill key={node.id} node={node} colorClass={colorClass} />
        ))}
      </div>
      {stage.nextArrow === 'multi' && <Arrow multi />}
      {stage.nextArrow === 'single' && <Arrow />}
    </>
  );
}

export default function KnowledgeMap() {
  const navigate = useNavigate();
  const { data: customs = [] } = useCustomMisconceptions();
  const createMut = useCreateCustomMisconception();
  const deleteMut = useDeleteCustomMisconception();
  const [addModalNodeId, setAddModalNodeId] = useState(null);

  // 把自訂迷思合併進每個節點
  const mergedNodes = knowledgeNodes.map((n) => mergeCustomsIntoNode(n, customs));
  const totalDefault = knowledgeNodes.reduce((s, n) => s + n.misconceptions.length, 0);
  const totalCustom = customs.length;

  const rows = [];
  let nodeGroupIndex = 0;
  mergedNodes.forEach((node) => {
    node.misconceptions.forEach((m, mIdx) => {
      rows.push({
        node,
        nodeRowSpan: node.misconceptions.length,
        isFirstOfNode: mIdx === 0,
        misconception: m,
        nodeGroupIndex,
      });
    });
    nodeGroupIndex++;
  });

  const nodes = (ids) => knowledgeNodes.filter((n) => ids.includes(n.id));

  const handleSubmitCustom = async (payload) => {
    try {
      await createMut.mutateAsync(payload);
      setAddModalNodeId(null);
    } catch (err) {
      alert('新增失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleDelete = async (customId, label) => {
    if (!window.confirm(`確定要刪除自訂迷思「${label}」嗎？此操作無法還原。`)) return;
    try {
      await deleteMut.mutateAsync(customId);
    } catch (err) {
      alert('刪除失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁面標題 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/teacher')}
              className="text-[#95A5A6] hover:text-[#636E72] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">知識節點與迷思概念總覽</h1>
          </div>
          <p className="text-sm text-[#636E72] ml-8">
            水溶液單元 · 因材網對應節點 INe-II-3-01 至 INe-Ⅲ-5-7 ·
            <span className="ml-2 font-medium text-[#2D3436]">{knowledgeNodes.length} 個知識節點</span>
            <span className="mx-1 text-[#BDC3C7]">·</span>
            <span className="font-medium text-[#2D3436]">{totalDefault} 個系統預設迷思</span>
            {totalCustom > 0 && (
              <>
                <span className="mx-1 text-[#BDC3C7]">·</span>
                <span className="font-medium text-[#D08B2E]">+ {totalCustom} 個您的自訂迷思</span>
              </>
            )}
          </p>
          <div className="ml-8 mt-3">
            <button
              type="button"
              onClick={() => setAddModalNodeId('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-sm font-semibold
                         hover:bg-[#FBE9C7] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增自訂迷思
            </button>
            <span className="ml-2 text-xs text-[#95A5A6]">
              （只儲存在您的帳戶，其他老師看不到）
            </span>
          </div>
        </div>

        {/* A 區：知識路徑圖（兩個子主題各一條） */}
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-5 mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold text-[#95A5A6] uppercase tracking-wide mb-4">知識學習路徑</p>

          {/* 子主題 A */}
          <p className="text-sm font-semibold text-[#2D3436] mb-2">子主題 A：水溶液中的變化（溶解）</p>
          <div className="flex items-center gap-0 overflow-x-auto pb-3 mb-4">
            {SUBTOPIC_A_STAGES.map((stage, idx) => (
              <PathStage key={`A-${idx}`} stage={stage} nodes={nodes} />
            ))}
          </div>

          {/* 子主題 B */}
          <p className="text-sm font-semibold text-[#2D3436] mb-2 pt-3 border-t border-[#D5D8DC]">子主題 B：酸鹼反應</p>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {SUBTOPIC_B_STAGES.map((stage, idx) => (
              <PathStage key={`B-${idx}`} stage={stage} nodes={nodes} />
            ))}
          </div>
        </div>

        {/* B 區：表格 */}
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#C8EAAE] border-b-2 border-[#BDC3C7]">
                <th className="border-r border-[#BDC3C7] px-4 py-3 text-left font-semibold text-[#2D3436] w-[24%]">知識節點</th>
                <th className="border-r border-[#BDC3C7] px-4 py-3 text-left font-semibold text-[#2D3436] w-[28%]">迷思概念</th>
                <th className="border-r border-[#BDC3C7] px-4 py-3 text-left font-semibold text-[#2D3436] w-[36%]">學生常見想法</th>
                <th className="px-2 py-3 text-center font-semibold text-[#2D3436] w-[12%]">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const isLastRow = rowIdx === rows.length - 1;
                const isLastOfNode = row.isFirstOfNode && !isLastRow
                  ? false
                  : row.node.misconceptions[row.node.misconceptions.length - 1].id === row.misconception.id;

                return (
                  <tr
                    key={`${row.misconception.id}-${rowIdx}`}
                    className={`${row.nodeGroupIndex % 2 === 0 ? 'bg-white' : 'bg-[#EEF5E6]'} ${isLastOfNode && !isLastRow ? 'border-b-2 border-[#BDC3C7]' : 'border-b border-[#D5D8DC]'}`}
                  >
                    {row.isFirstOfNode && (
                      <td
                        rowSpan={row.nodeRowSpan}
                        className={`border-r border-[#BDC3C7] px-4 py-3 align-top ${row.nodeGroupIndex % 2 === 0 ? 'bg-white' : 'bg-[#EEF5E6]'}`}
                      >
                        <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{row.node.id}</p>
                        <p className="font-semibold text-[#2D3436] mb-1">{row.node.name}</p>
                        <p className="text-xs text-[#636E72] leading-relaxed mb-2">{row.node.description}</p>
                        <button
                          type="button"
                          onClick={() => setAddModalNodeId(row.node.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#7A4A18]
                                     bg-[#FFF1D8] border border-[#F0B962] rounded-lg px-2 py-0.5
                                     hover:bg-[#FBE9C7]"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          自訂迷思
                        </button>
                      </td>
                    )}
                    <td className="border-r border-[#BDC3C7] px-4 py-2.5 align-top font-medium text-[#2D3436]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{row.misconception.label}</span>
                        {row.misconception.isCustom && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md
                                           bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-[10px] font-bold">
                            自訂
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-r border-[#BDC3C7] px-4 py-2.5 align-top text-[#636E72] leading-relaxed">
                      {row.misconception.detail}
                    </td>
                    <td className="px-2 py-2.5 align-top text-center">
                      {row.misconception.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row.misconception.id, row.misconception.label)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#E74C5E]
                                     bg-[#FAC8CC] border border-[#F5B8BA] rounded-lg px-2 py-1
                                     hover:bg-[#F5B8BA]"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          刪除
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addModalNodeId !== null && (
        <AddCustomMisconceptionModal
          initialNodeId={addModalNodeId}
          isPending={createMut.isPending}
          onSubmit={handleSubmitCustom}
          onClose={() => setAddModalNodeId(null)}
        />
      )}
    </TeacherLayout>
  );
}
