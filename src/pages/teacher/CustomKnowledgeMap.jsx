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
import KnowledgeSkillTree from '../../components/teacher/KnowledgeSkillTree';

export default function CustomKnowledgeMap() {
  const navigate = useNavigate();
  const { data: customs = [] } = useCustomMisconceptions();
  const createMut = useCreateCustomMisconception();
  const deleteMut = useDeleteCustomMisconception();
  const [addModalNodeId, setAddModalNodeId] = useState(null);

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
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">(自定義) 知識節點與迷思概念總覽</h1>
          </div>
          <p className="text-sm text-[#636E72] ml-8">
            水溶液單元 · {knowledgeNodes.length} 個知識節點 ·
            <span className="ml-1 font-medium text-[#95A5A6]">{totalDefault} 個系統預設迷思</span>
            <span className="mx-1 text-[#BDC3C7]">·</span>
            <span className="font-medium text-[#D08B2E]">{totalCustom} 個您的自訂迷思</span>
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
            <span className="ml-2 text-sm text-[#95A5A6]">
              （只儲存在您的帳戶，其他老師看不到）
            </span>
          </div>
        </div>

        {/* A 區：知識路徑技能樹（與預設總覽共用同一元件） */}
        <div className="mb-6">
          <KnowledgeSkillTree />
        </div>

        {/* B 區：表格（預設 + 自訂混合顯示） */}
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {/* 圖例 */}
          <div className="px-4 py-3 border-b border-[#D5D8DC] bg-[#FAFAFA] flex items-center gap-4 text-sm">
            <span className="text-[#636E72] font-medium">圖例：</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#F0F0F0] border border-[#D5D8DC] text-[#95A5A6] text-[15px] font-bold">預設</span>
              <span className="text-[#95A5A6]">系統預設迷思（不可修改）</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-[15px] font-bold">自訂</span>
              <span className="text-[#636E72]">您新增的迷思概念</span>
            </span>
          </div>

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
                const isCustom = row.misconception.isCustom;

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
                        <p className="text-sm font-mono text-[#95A5A6] mb-0.5">{row.node.id}</p>
                        <p className="font-semibold text-[#2D3436] mb-1">{row.node.name}</p>
                        <p className="text-sm text-[#636E72] leading-relaxed mb-2">{row.node.description}</p>
                        <button
                          type="button"
                          onClick={() => setAddModalNodeId(row.node.id)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#7A4A18]
                                     bg-[#FFF1D8] border border-[#F0B962] rounded-lg px-2 py-0.5
                                     hover:bg-[#FBE9C7]"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          新增自訂
                        </button>
                      </td>
                    )}
                    <td className={`border-r border-[#BDC3C7] px-4 py-2.5 align-top font-medium ${isCustom ? 'text-[#2D3436]' : 'text-[#95A5A6]'}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{row.misconception.label}</span>
                        {isCustom ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md
                                           bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18] text-[15px] font-bold">
                            自訂
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md
                                           bg-[#F0F0F0] border border-[#D5D8DC] text-[#95A5A6] text-[15px] font-bold">
                            預設
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`border-r border-[#BDC3C7] px-4 py-2.5 align-top leading-relaxed ${isCustom ? 'text-[#636E72]' : 'text-[#BDC3C7]'}`}>
                      {row.misconception.detail}
                    </td>
                    <td className="px-2 py-2.5 align-top text-center">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row.misconception.id, row.misconception.label)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#E74C5E]
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
