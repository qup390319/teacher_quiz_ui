import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useQuizzes, useSaveQuiz } from '../../../hooks/useQuizzes';
import { knowledgeNodes, getNodeById } from '../../../data/knowledgeGraph';
import DistractorSuggestPopover from '../../../components/teacher/DistractorSuggestPopover';

// Coverage Panel
function CoveragePanel({ questions, selectedNodeIds }) {
  const nodeCoverage = knowledgeNodes
    .filter((n) => selectedNodeIds.includes(n.id))
    .map((node) => {
      const nodeQuestions = questions.filter((q) => q.knowledgeNodeId === node.id);
      const coveredMisconceptionIds = new Set();
      nodeQuestions.forEach((q) => {
        q.options.forEach((o) => {
          if (o.diagnosis !== 'CORRECT') coveredMisconceptionIds.add(o.diagnosis);
        });
      });
      return {
        node,
        questionCount: nodeQuestions.length,
        coveredCount: coveredMisconceptionIds.size,
        totalCount: node.misconceptions.length,
      };
    });

  return (
    <div className="bg-white border border-[#BDC3C7] rounded-2xl p-4 mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-sm font-bold text-[#2D3436]">出題涵蓋狀況</h3>
        <span className="text-xs text-[#95A5A6]">每個知識節點有多個學生常見迷思，此處顯示您的題目涵蓋了多少（新增或刪除題目時自動更新）</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {nodeCoverage.map(({ node, questionCount, coveredCount, totalCount }) => {
          const pct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;
          return (
            <div key={node.id} className="flex-1 min-w-[180px] bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-[#95A5A6]">{node.id}</span>
                <span className="text-xs text-[#636E72]">{questionCount} 題</span>
              </div>
              <p className="text-xs font-semibold text-[#2D3436] mb-2 leading-tight">{node.name}</p>
              <div className="w-full bg-[#D5D8DC] rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full transition-all ${pct >= 75 ? 'bg-[#8FC87A]' : pct >= 50 ? 'bg-[#F4D03F]' : 'bg-[#F28B95]'}`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
              <p className="text-xs text-[#636E72]">已出題涵蓋 {coveredCount} 個迷思（共 {totalCount} 個）</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Edit Modal
function EditModal({ question, selectedNodeIds, onSave, onClose }) {
  const [stem, setStem] = useState(question.stem);
  const [nodeId, setNodeId] = useState(question.knowledgeNodeId);
  const [options, setOptions] = useState(question.options.map((o) => ({ ...o })));
  const [suggestForIdx, setSuggestForIdx] = useState(null); // 開啟 N6 popover 的 option index

  const currentNode = getNodeById(nodeId);
  const availableMisconceptions = currentNode ? currentNode.misconceptions : [];

  const updateOption = (idx, field, value) => {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  const suggestTarget = suggestForIdx !== null ? options[suggestForIdx] : null;
  const suggestMisconception = suggestTarget && suggestTarget.diagnosis !== 'CORRECT'
    ? availableMisconceptions.find((m) => m.id === suggestTarget.diagnosis)
    : null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#D5D8DC] px-6 py-4 flex items-center justify-between rounded-t-[32px]">
          <h3 className="text-base font-bold text-[#2D3436]">編輯題目 #{question.id}</h3>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#2D3436] mb-2">題幹內容</label>
            <textarea
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={3}
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2D3436] mb-2">對應知識節點</label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            >
              {knowledgeNodes
                .filter((n) => selectedNodeIds.includes(n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>{n.id} · {n.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2D3436] mb-3">選項內容與答案判定</label>
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={opt.tag} className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#BDC3C7] text-[#636E72] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {opt.tag}
                    </span>
                    <input
                      value={opt.content}
                      onChange={(e) => updateOption(idx, 'content', e.target.value)}
                      className="flex-1 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                    />
                    <button
                      type="button"
                      onClick={() => setSuggestForIdx(idx)}
                      disabled={opt.diagnosis === 'CORRECT'}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold
                                 text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg
                                 hover:bg-[#F4DDA8] disabled:opacity-40 disabled:cursor-not-allowed"
                      title={opt.diagnosis === 'CORRECT' ? '正解選項不需建議' : '從文獻檢索 3 條學生真實說法（N6）'}
                    >
                      <span aria-hidden="true">✨</span>
                      建議
                    </button>
                  </div>
                  <div className="ml-9">
                    <label className="text-xs text-[#95A5A6] mb-1 block">答案判定</label>
                    <select
                      value={opt.diagnosis}
                      onChange={(e) => updateOption(idx, 'diagnosis', e.target.value)}
                      className={`w-full border border-[#BDC3C7] rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8FC87A] ${opt.diagnosis === 'CORRECT'
                          ? 'bg-[#C8EAAE] text-[#3D5A3E]'
                          : 'bg-[#FAC8CC] text-[#E74C5E]'
                        }`}
                    >
                      <option value="CORRECT">✓ 正確答案</option>
                      {availableMisconceptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.id}：{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#D5D8DC] px-6 py-4 flex gap-3 justify-end rounded-b-[32px]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors">
            取消
          </button>
          <button
            onClick={() => onSave({ ...question, stem, knowledgeNodeId: nodeId, options })}
            className="px-5 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors"
          >
            儲存變更
          </button>
        </div>
      </div>

      {suggestForIdx !== null && suggestMisconception && currentNode && (
        <DistractorSuggestPopover
          nodeId={currentNode.id}
          nodeName={currentNode.name}
          misconceptionId={suggestMisconception.id}
          misconceptionLabel={suggestMisconception.label}
          misconceptionDetail={suggestMisconception.detail}
          currentText={suggestTarget.content}
          onAdopt={(text) => {
            updateOption(suggestForIdx, 'content', text);
            setSuggestForIdx(null);
          }}
          onClose={() => setSuggestForIdx(null)}
        />
      )}
      {suggestForIdx !== null && !suggestMisconception && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSuggestForIdx(null)}
        >
          <div
            className="bg-white border border-[#BDC3C7] rounded-2xl p-6 max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[#636E72] mb-4">
              此選項目前對應「正確答案」，無法產生干擾選項建議。
              <br />請先把「答案判定」改為某條迷思後再試。
            </p>
            <button
              onClick={() => setSuggestForIdx(null)}
              className="px-4 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563]"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Delete Confirm Modal
function DeleteModal({ question, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#FAC8CC] border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#E74C5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#2D3436]">確認刪除題目 #{question.id}？</h3>
            <p className="text-sm text-[#636E72] mt-0.5">此操作無法復原</p>
          </div>
        </div>
        <p className="text-sm text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3 mb-5 leading-relaxed">
          {question.stem}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold bg-[#FAC8CC] text-[#E74C5E] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors">
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}

// Preview Modal
function PreviewModal({ questions, onClose }) {
  const [previewStep, setPreviewStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const currentQ = questions[previewStep];

  const handleSelect = (opt) => {
    setSelected(opt);
    setTimeout(() => {
      setSelected(null);
      if (previewStep < questions.length - 1) setPreviewStep((p) => p + 1);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D5D8DC]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#8FC87A] rounded-full"></div>
            <span className="text-sm font-semibold text-[#2D3436]">學生端預覽模式</span>
          </div>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 bg-[#EEF5E6] min-h-[400px] rounded-b-[32px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[#95A5A6]">題目 {previewStep + 1}/{questions.length}</span>
            <div className="flex-1 bg-[#D5D8DC] rounded-full h-1.5">
              <div className="bg-[#8FC87A] h-1.5 rounded-full transition-all" style={{ width: `${((previewStep) / questions.length) * 100}%` }}></div>
            </div>
          </div>
          {previewStep < questions.length ? (
            <>
              <div className="bg-white border border-[#BDC3C7] rounded-2xl p-4 mb-4 chat-bubble-in shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="text-sm text-[#636E72] mb-1">🤖 科學偵探系統</p>
                <p className="text-sm text-[#2D3436] leading-relaxed">{currentQ.stem}</p>
              </div>
              <div className="space-y-2">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.tag}
                    onClick={() => !selected && handleSelect(opt)}
                    className={`w-full text-left p-3 rounded-2xl text-sm transition-all border ${selected?.tag === opt.tag
                        ? opt.diagnosis === 'CORRECT'
                          ? 'bg-[#C8EAAE] border-[#8FC87A] text-[#3D5A3E]'
                          : 'bg-[#FAC8CC] border-[#F28B95] text-[#E74C5E]'
                        : 'bg-white border-[#BDC3C7] hover:bg-[#EEF5E6] text-[#2D3436]'
                      }`}
                  >
                    {opt.content}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-[#2D3436] mb-1">作答完成！</p>
              <p className="text-sm text-[#636E72]">學生將看到個人診斷書</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateDefaultTitle(quizzes) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const base = `迷思診斷卷 ${yyyy}/${mm}/${dd}`;
  const sameDay = quizzes.filter((q) => q.title === base || q.title.startsWith(`${base} (`));
  if (sameDay.length === 0) return base;
  return `${base} (${sameDay.length + 1})`;
}

export default function Step2Edit({ onBack }) {
  const { quizQuestions, setQuizQuestions, selectedNodeIds } = useApp();
  const { data: quizzes = [] } = useQuizzes();
  const saveQuizMut = useSaveQuiz();
  const navigate = useNavigate();

  const [quizTitle, setQuizTitle] = useState(() => generateDefaultTitle(quizzes));
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const getMisconceptionLabel = (nodeId, diagnosisId) => {
    if (diagnosisId === 'CORRECT') return null;
    const node = getNodeById(nodeId);
    if (!node) return diagnosisId;
    const m = node.misconceptions.find((m) => m.id === diagnosisId);
    return m ? m.label : diagnosisId;
  };

  const handleSaveEdit = (updated) => {
    setQuizQuestions((prev) => prev.map((q) => q.id === updated.id ? updated : q));
    setEditingQuestion(null);
  };

  const handleDelete = (questionId) => {
    setQuizQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setDeletingQuestion(null);
  };

  const addNewQuestion = () => {
    const newId = Math.max(...quizQuestions.map((q) => q.id), 0) + 1;
    const firstSelectedNode = knowledgeNodes.find((n) => selectedNodeIds.includes(n.id));
    const newQ = {
      id: newId,
      stem: '（請輸入題幹）',
      knowledgeNodeId: firstSelectedNode?.id || knowledgeNodes[0].id,
      options: [
        { tag: 'A', content: '（請輸入選項 A）', diagnosis: firstSelectedNode?.misconceptions[0]?.id || 'M01-1' },
        { tag: 'B', content: '（請輸入選項 B）', diagnosis: 'CORRECT' },
        { tag: 'C', content: '（請輸入選項 C）', diagnosis: firstSelectedNode?.misconceptions[1]?.id || 'M01-2' },
        { tag: 'D', content: '（請輸入選項 D）', diagnosis: firstSelectedNode?.misconceptions[2]?.id || 'M01-3' },
      ],
    };
    setQuizQuestions((prev) => [...prev, newQ]);
    setEditingQuestion(newQ);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#2D3436] mb-1">步驟二：製作考卷</h2>
        <p className="text-[#636E72] text-sm">請確認以下題目內容，可點擊「編輯」修改或「新增題目」加入更多題</p>
      </div>

      <CoveragePanel questions={quizQuestions} selectedNodeIds={selectedNodeIds} />

      <div className="flex flex-wrap items-center justify-between mb-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <label className="text-sm font-semibold text-[#2D3436] whitespace-nowrap">考卷名稱</label>
          <input
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="請輸入考卷名稱"
            className="flex-1 min-w-0 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
          />
        </div>
        <button
          onClick={addNewQuestion}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#3D5A3E] border border-[#BDC3C7] bg-[#C8EAAE] rounded-xl hover:bg-[#8FC87A] transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新增題目
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm border-collapse bg-white" style={{ minWidth: '900px' }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase tracking-wide w-14">題號</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase tracking-wide" style={{ minWidth: '220px' }}>題幹內容</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase tracking-wide" style={{ minWidth: '160px' }}>對應知識節點</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase tracking-wide" style={{ minWidth: '340px' }}>選項內容 / 對應迷思</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase tracking-wide w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {quizQuestions.map((q, qIdx) => {
              const node = getNodeById(q.knowledgeNodeId);
              return (
                <tr key={q.id} className={qIdx % 2 === 0 ? 'bg-white' : 'bg-[#EEF5E6]'}>
                  <td className="px-4 py-5 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#C8EAAE] border border-[#BDC3C7] text-[#3D5A3E] text-sm font-bold">
                      {qIdx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <p className="text-sm text-[#2D3436] leading-relaxed">{q.stem}</p>
                  </td>
                  <td className="px-4 py-5 align-top">
                    {node && (
                      <div>
                        <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{node.id}</p>
                        <p className="text-sm font-semibold text-[#2D3436]">{node.name}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-5 align-top">
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isCorrect = opt.diagnosis === 'CORRECT';
                        const misconLabel = getMisconceptionLabel(q.knowledgeNodeId, opt.diagnosis);
                        return (
                          <div key={opt.tag} className="flex items-start gap-2">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border ${isCorrect ? 'bg-[#C8EAAE] border-[#BDC3C7] text-[#3D5A3E]' : 'bg-[#EEF5E6] border-[#D5D8DC] text-[#636E72]'}`}>
                              {opt.tag}
                            </span>
                            <div className="flex-1">
                              <span className="text-sm text-[#2D3436]">{opt.content}</span>
                              <div className="mt-0.5">
                                {isCorrect ? (
                                  <span className="inline-block text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] px-2 py-0.5 rounded-full">
                                    ✓ 正確答案
                                  </span>
                                ) : (
                                  <span className="inline-block text-xs font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#F5B8BA] px-2 py-0.5 rounded-full">
                                    迷思：{misconLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <div className="flex flex-col gap-2 items-center">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2E86C1] bg-[#BADDF4] border border-[#BDC3C7] rounded-xl hover:bg-[#A8D2EC] transition-colors w-full justify-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        編輯
                      </button>
                      <button
                        onClick={() => setDeletingQuestion(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors w-full justify-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {quizQuestions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#95A5A6] text-sm">
                  目前沒有題目，請點擊「新增題目」開始出題
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm text-[#636E72] border border-[#BDC3C7] hover:bg-[#EEF5E6] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回上一步
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm text-[#3D5A3E] border border-[#BDC3C7] bg-[#C8EAAE] hover:bg-[#8FC87A] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            預覽學生端
          </button>
          <button
            onClick={async () => {
              try {
                await saveQuizMut.mutateAsync({
                  title: quizTitle || generateDefaultTitle(quizzes),
                  status: 'published',
                  knowledgeNodeIds: selectedNodeIds,
                  questions: quizQuestions,
                });
                navigate('/teacher/quizzes');
              } catch (err) {
                console.error('[Step2Edit] save failed', err);
                alert('儲存考卷失敗：' + (err?.message ?? '未知錯誤'));
              }
            }}
            disabled={saveQuizMut.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-semibold text-sm bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] hover:bg-[#76B563] transition-all disabled:opacity-50"
          >
            {saveQuizMut.isPending ? '儲存中…' : '儲存考卷'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {editingQuestion && (
        <EditModal question={editingQuestion} selectedNodeIds={selectedNodeIds} onSave={handleSaveEdit} onClose={() => setEditingQuestion(null)} />
      )}
      {deletingQuestion && (
        <DeleteModal question={deletingQuestion} onConfirm={() => handleDelete(deletingQuestion.id)} onClose={() => setDeletingQuestion(null)} />
      )}
      {showPreview && (
        <PreviewModal questions={quizQuestions} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
