import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useQuizzes, useSaveQuiz } from '../../../hooks/useQuizzes';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import { knowledgeNodes, getNodeById } from '../../../data/knowledgeGraph';
import EditQuestionModal from '../../../components/teacher/quizEditor/EditQuestionModal';
import DeleteQuestionModal from '../../../components/teacher/quizEditor/DeleteQuestionModal';
import PreviewQuizModal from '../../../components/teacher/quizEditor/PreviewQuizModal';
import CoveragePanel from '../../../components/teacher/quizEditor/CoveragePanel';
import QuestionImportDrawer from '../../../components/teacher/quizEditor/QuestionImportDrawer';

const AUTO_SAVE_DELAY_MS = 30000;

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

/** 重新編號 questions（1..N），用於匯入或新增後保持 order_index 連續 */
function renumber(questions) {
  return questions.map((q, idx) => ({ ...q, id: idx + 1 }));
}

/**
 * 為某個節點 + 某條迷思，建立預填的新題目骨架。
 * - 對應節點鎖定為 nodeId
 * - 4 個選項：B 為正解、A 設為使用者點的迷思，C/D 從該節點剩餘且尚未被覆蓋的迷思補滿；不夠則 fallback 該節點任意迷思
 */
function buildQuestionForMisconception(nodeId, misconceptionId, existingQuestions, nextId) {
  const node = getNodeById(nodeId);
  if (!node) return null;
  const coveredIds = new Set();
  existingQuestions
    .filter((q) => q.knowledgeNodeId === nodeId)
    .forEach((q) => q.options.forEach((o) => {
      if (o.diagnosis !== 'CORRECT') coveredIds.add(o.diagnosis);
    }));
  const remaining = node.misconceptions.filter((m) => m.id !== misconceptionId && !coveredIds.has(m.id));
  const fallback = node.misconceptions.filter((m) => m.id !== misconceptionId);
  const pickRemaining = (i) => (remaining[i] || fallback[i % fallback.length] || node.misconceptions[0]).id;
  return {
    id: nextId,
    stem: '（請輸入題幹）',
    knowledgeNodeId: nodeId,
    options: [
      { tag: 'A', content: '（請輸入選項 A）', diagnosis: misconceptionId },
      { tag: 'B', content: '（請輸入選項 B，此為正確答案）', diagnosis: 'CORRECT' },
      { tag: 'C', content: '（請輸入選項 C）', diagnosis: pickRemaining(0) },
      { tag: 'D', content: '（請輸入選項 D）', diagnosis: pickRemaining(1) },
    ],
  };
}

function formatTime(date) {
  if (!date) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function Step2Edit({ onBack }) {
  const {
    quizQuestions, setQuizQuestions, selectedNodeIds,
    editingQuizId, setEditingQuizId,
    editingQuizStatus, setEditingQuizStatus,
    setIsWizardDirty,
  } = useApp();
  const { data: quizzes = [] } = useQuizzes();
  const saveQuizMut = useSaveQuiz();
  const navigate = useNavigate();

  const [quizTitle, setQuizTitle] = useState(() => generateDefaultTitle(quizzes));
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // 自動暫存狀態
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');  // idle | saving | saved | error
  const isFirstSaveRef = useRef(true);

  // 編輯既有 published 卷時禁用自動暫存（避免降級為 draft）
  const autoSaveEnabled = editingQuizStatus !== 'published' && quizQuestions.length > 0;

  const getMisconceptionLabel = (nodeId, diagnosisId) => {
    if (diagnosisId === 'CORRECT') return null;
    const node = getNodeById(nodeId);
    if (!node) return diagnosisId;
    const m = node.misconceptions.find((m) => m.id === diagnosisId);
    return m ? m.label : diagnosisId;
  };

  const handleSaveEdit = (updated) => {
    setQuizQuestions((prev) => prev.map((q) => q.id === updated.id ? updated : q));
    setIsWizardDirty(true);
    setEditingQuestion(null);
  };

  const handleDelete = (questionId) => {
    setQuizQuestions((prev) => renumber(prev.filter((q) => q.id !== questionId)));
    setIsWizardDirty(true);
    setDeletingQuestion(null);
  };

  const addNewQuestion = () => {
    const nextId = quizQuestions.length + 1;
    const firstSelectedNode = knowledgeNodes.find((n) => selectedNodeIds.includes(n.id));
    const newQ = {
      id: nextId,
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
    setIsWizardDirty(true);
    setEditingQuestion(newQ);
  };

  const addQuestionForMisconception = (nodeId, misconceptionId) => {
    const nextId = quizQuestions.length + 1;
    const newQ = buildQuestionForMisconception(nodeId, misconceptionId, quizQuestions, nextId);
    if (!newQ) return;
    setQuizQuestions((prev) => [...prev, newQ]);
    setIsWizardDirty(true);
    setEditingQuestion(newQ);
  };

  const handleImportQuestions = (questionsToImport) => {
    setQuizQuestions((prev) => renumber([
      ...prev,
      ...questionsToImport.map((q) => ({ ...q, id: 0 })),  // id 由 renumber 重排
    ]));
    setIsWizardDirty(true);
    setShowImport(false);
  };

  const buildPayload = (status) => ({
    id: editingQuizId || undefined,
    title: quizTitle || generateDefaultTitle(quizzes),
    status,
    knowledgeNodeIds: selectedNodeIds,
    questions: quizQuestions,
  });

  const performSave = async (status, { silent = false } = {}) => {
    if (!silent) setAutoSaveStatus('saving');
    try {
      const result = await saveQuizMut.mutateAsync(buildPayload(status));
      if (result?.id && !editingQuizId) {
        setEditingQuizId(result.id);
        setEditingQuizStatus(status);
      } else if (result?.id && editingQuizId) {
        setEditingQuizStatus(status);
      }
      setLastSavedAt(new Date());
      setAutoSaveStatus('saved');
      setIsWizardDirty(false);
      return result;
    } catch (err) {
      console.error('[Step2Edit] save failed', err);
      setAutoSaveStatus('error');
      throw err;
    }
  };

  // 自動暫存（僅 draft）
  useDebouncedEffect(
    () => {
      if (isFirstSaveRef.current) {
        isFirstSaveRef.current = false;
        return;
      }
      performSave('draft', { silent: true }).catch(() => {/* surfaced via state */});
    },
    AUTO_SAVE_DELAY_MS,
    [quizTitle, quizQuestions, selectedNodeIds],
    autoSaveEnabled,
  );

  // 進入頁面時若是新建（沒有 editingQuizId），重置 firstSave flag 讓首次自動存能跑
  useEffect(() => {
    if (!editingQuizId) isFirstSaveRef.current = true;
  }, [editingQuizId]);

  const handleSaveDraft = async () => {
    try {
      await performSave('draft');
    } catch (err) {
      alert('儲存草稿失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handlePublish = async () => {
    try {
      await performSave('published');
      setEditingQuizId(null);
      setEditingQuizStatus(null);
      navigate('/teacher/quizzes');
    } catch (err) {
      alert('儲存考卷失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const renderAutoSaveLabel = () => {
    if (!autoSaveEnabled) return '此卷已發布，自動暫存停用';
    if (autoSaveStatus === 'saving') return '儲存中…';
    if (autoSaveStatus === 'error') return '自動暫存失敗，請手動儲存';
    if (lastSavedAt) return `已自動儲存於 ${formatTime(lastSavedAt)}`;
    return `${AUTO_SAVE_DELAY_MS / 1000} 秒未操作會自動暫存草稿`;
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#2D3436] mb-1">步驟二：製作考卷</h2>
        <p className="text-[#636E72] text-sm">請確認以下題目內容，可點擊「編輯」修改、「新增題目」加題、或從題庫挑現成題</p>
      </div>

      <CoveragePanel
        questions={quizQuestions}
        selectedNodeIds={selectedNodeIds}
        onAddForMisconception={addQuestionForMisconception}
      />

      <div className="flex flex-wrap items-center justify-between mb-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <label className="text-sm font-semibold text-[#2D3436] whitespace-nowrap">考卷名稱</label>
          <input
            value={quizTitle}
            onChange={(e) => { setQuizTitle(e.target.value); setIsWizardDirty(true); }}
            placeholder="請輸入考卷名稱"
            className="flex-1 min-w-0 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2E86C1] border border-[#BDC3C7] bg-[#BADDF4] rounded-xl hover:bg-[#A8D2EC] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            從題庫挑題
          </button>
          <button
            onClick={addNewQuestion}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#3D5A3E] border border-[#BDC3C7] bg-[#C8EAAE] rounded-xl hover:bg-[#8FC87A] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增題目
          </button>
        </div>
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
                  目前沒有題目，請點擊「新增題目」開始出題，或點上方「從題庫挑題」匯入現成題目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-[#95A5A6]">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {renderAutoSaveLabel()}
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
            onClick={handleSaveDraft}
            disabled={saveQuizMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm text-[#7A5232] border border-[#D9C58E] bg-[#FBE9C7] hover:bg-[#F4DDA8] transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            儲存草稿
          </button>
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
            onClick={handlePublish}
            disabled={saveQuizMut.isPending || quizQuestions.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-semibold text-sm bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] hover:bg-[#76B563] transition-all disabled:opacity-50"
          >
            {saveQuizMut.isPending ? '儲存中…' : '儲存並發布'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {editingQuestion && (
        <EditQuestionModal question={editingQuestion} selectedNodeIds={selectedNodeIds} onSave={handleSaveEdit} onClose={() => setEditingQuestion(null)} />
      )}
      {deletingQuestion && (
        <DeleteQuestionModal question={deletingQuestion} onConfirm={() => handleDelete(deletingQuestion.id)} onClose={() => setDeletingQuestion(null)} />
      )}
      {showPreview && (
        <PreviewQuizModal questions={quizQuestions} onClose={() => setShowPreview(false)} />
      )}
      {showImport && (
        <QuestionImportDrawer
          selectedNodeIds={selectedNodeIds}
          excludeQuizId={editingQuizId}
          onImport={handleImportQuestions}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
