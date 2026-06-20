import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useQuizzes, useSaveQuiz } from '../../../hooks/useQuizzes';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import { getNodeColor } from '../../../constants/theme';
import EditQuestionModal from '../../../components/teacher/quizEditor/EditQuestionModal';
import DeleteQuestionModal from '../../../components/teacher/quizEditor/DeleteQuestionModal';
import PreviewQuizModal from '../../../components/teacher/quizEditor/PreviewQuizModal';
import CoveragePanel from '../../../components/teacher/quizEditor/CoveragePanel';
import QuestionImportDrawer from '../../../components/teacher/quizEditor/QuestionImportDrawer';
import { sortQuestionsByNodeOrder } from '../../../utils/topoSortNodes';
import KnowledgeSkillTree from '../../../components/teacher/KnowledgeSkillTree';
import { useToast } from '../../../context/ToastContext';
import QuestionOptionsCell from '../../../components/teacher/quizEditor/QuestionOptionsCell';
import PublishValidationModal from '../../../components/teacher/quizEditor/PublishValidationModal';
import {
  buildQuestionForMisconception as buildQForMisconception,
  buildBlankQuestion,
  questionToApi,
  normalizeQuestionForEditor,
  validateQuestion,
} from '../../../data/twoTierAuthoring';

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

function formatTime(date) {
  if (!date) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function Step2Edit({ nodes = [], onBack }) {
  const {
    quizQuestions, setQuizQuestions, selectedNodeIds, nodeQuestionCounts,
    editingQuizId, setEditingQuizId,
    editingQuizStatus, setEditingQuizStatus,
    editingQuizTitle, setEditingQuizTitle,
    editingQuizMode, setEditingQuizMode,
    setIsWizardDirty,
  } = useApp();
  const { data: quizzes = [] } = useQuizzes();
  const saveQuizMut = useSaveQuiz();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getNode = (id) => nodes.find((n) => n.id === id);

  // 編輯既有：用原 title；複製：用「原title (複製)」；新建：用日期預設名。
  // 用 effect 在初次掛載時把預設名寫回 context；之後直接以 editingQuizTitle 為唯一來源，
  // 避免 step 1 ↔ step 2 切換造成本地 title 流失（也讓 buildPayload 永遠拿到最新值）。
  useEffect(() => {
    if (!editingQuizTitle) setEditingQuizTitle(generateDefaultTitle(quizzes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const quizTitle = editingQuizTitle;
  const setQuizTitle = setEditingQuizTitle;
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [publishProblems, setPublishProblems] = useState(null); // 發布前檢查未過的題目清單
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);

  // 自動暫存狀態
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');  // idle | saving | saved | error
  const isFirstSaveRef = useRef(true);

  // 編輯既有 published 卷時禁用自動暫存（避免降級為 draft）
  const autoSaveEnabled = editingQuizStatus !== 'published' && quizQuestions.length > 0;

  const getMisconceptionLabel = (nodeId, diagnosisId) => {
    if (diagnosisId === 'CORRECT') return null;
    const node = getNode(nodeId);
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
    const firstSelectedNode = nodes.find((n) => selectedNodeIds.includes(n.id)) || nodes[0];
    if (!firstSelectedNode) return;
    const newQ = buildBlankQuestion(editingQuizMode, firstSelectedNode, nextId);
    setQuizQuestions((prev) => [...prev, newQ]);
    setIsWizardDirty(true);
    setEditingQuestion(newQ);
  };

  const addQuestionForMisconception = (nodeId, misconceptionId) => {
    const nextId = quizQuestions.length + 1;
    const node = nodes.find((n) => n.id === nodeId);
    const newQ = buildQForMisconception(editingQuizMode, node, misconceptionId, quizQuestions, nextId);
    if (!newQ) return;
    setQuizQuestions((prev) => [...prev, newQ]);
    setIsWizardDirty(true);
    setEditingQuestion(newQ);
  };

  const handleImportQuestions = (questionsToImport) => {
    setQuizQuestions((prev) => renumber([
      ...prev,
      // 匯入題目可能是 API shape，先正規化成編輯器內部 shape；id 由 renumber 重排
      ...questionsToImport.map((q) => ({ ...normalizeQuestionForEditor(q), id: 0 })),
    ]));
    setIsWizardDirty(true);
    setShowImport(false);
  };

  const handleDragStart = (idx) => { setDragIdx(idx); };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || idx === dragIdx) { setDropIdx(null); return; }
    setDropIdx(idx);
  };
  const handleDragEnd = () => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      setQuizQuestions((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(dropIdx, 0, moved);
        return renumber(next);
      });
      setIsWizardDirty(true);
    }
    setDragIdx(null);
    setDropIdx(null);
  };

  const buildPayload = (status) => ({
    id: editingQuizId || undefined,
    title: quizTitle || generateDefaultTitle(quizzes),
    status,
    mode: editingQuizMode,
    knowledgeNodeIds: selectedNodeIds,
    questions: quizQuestions.map(questionToApi),
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
      toast.success('草稿已儲存');
    } catch (err) {
      toast.error('儲存草稿失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handlePublish = async () => {
    // 發布前整卷檢查：逐題驗證雙層次方法論，未過則擋下並指出第幾題。
    const problems = [];
    quizQuestions.forEach((q, idx) => {
      const errs = validateQuestion(q);
      if (errs.length > 0) problems.push({ no: idx + 1, errors: errs });
    });
    if (problems.length > 0) {
      setPublishProblems(problems);
      return;
    }
    try {
      await performSave('published');
      toast.success('題組已發佈');
      setEditingQuizId(null);
      setEditingQuizStatus(null);
      setEditingQuizTitle('');
      setEditingQuizMode('two-tier');
      navigate('/teacher/quizzes');
    } catch (err) {
      toast.error('儲存題組失敗：' + (err?.message ?? '未知錯誤'));
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
        <h2 className="text-xl font-bold text-[#2D3436] mb-1">步驟三：製作題組</h2>
        <p className="text-[#636E72] text-sm">請確認以下題目內容，可點擊「編輯」修改、「新增題目」加題、或從題庫挑現成題</p>
      </div>

      {/* 知識節點路徑圖（唯讀，標示步驟一已勾選的節點）— 可收合 */}
      <details className="mb-5 group" open>
        <summary className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#BDC3C7] text-sm font-semibold text-[#2D3436] hover:bg-[#F1F6EE] transition-colors list-none [&::-webkit-details-marker]:hidden">
          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          知識節點路徑（已勾選 {selectedNodeIds.length} 節點）
        </summary>
        <div className="mt-3">
          {/* selectable=true + 無 onToggle = 視覺上仍顯示「已勾選/未勾選」差異（已勾發光、未勾黯淡），但點擊無效，純檢視 */}
          <KnowledgeSkillTree nodes={nodes} selectable selectedNodeIds={selectedNodeIds} />
        </div>
      </details>

      <div data-tour="coverage-panel">
        <CoveragePanel
          nodes={nodes}
          questions={quizQuestions}
          selectedNodeIds={selectedNodeIds}
          nodeQuestionCounts={nodeQuestionCounts}
          onAddForMisconception={addQuestionForMisconception}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between mb-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]" data-tour="quiz-title-input">
          <label className="text-sm font-semibold text-[#2D3436] whitespace-nowrap">題組名稱</label>
          <input
            value={quizTitle}
            onChange={(e) => { setQuizTitle(e.target.value); setIsWizardDirty(true); }}
            placeholder="請輸入題組名稱"
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
            onClick={() => {
              const sorted = renumber(sortQuestionsByNodeOrder(quizQuestions, selectedNodeIds));
              setQuizQuestions(sorted);
              setIsWizardDirty(true);
            }}
            disabled={quizQuestions.length < 2}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#5B3D8F] border border-[#B39DDB] bg-[#EDE7F6] rounded-xl hover:bg-[#D1C4E9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="按知識節點的先備關係自動排序題目"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            自動排序
          </button>
          <button
            data-tour="add-question-area"
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

      <div data-tour="question-list" className="overflow-x-auto rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm border-collapse bg-white" style={{ minWidth: '900px' }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="w-10 px-1 py-3 text-center text-sm font-bold text-[#636E72] uppercase tracking-wide">排序</th>
              <th className="px-4 py-3 text-center text-sm font-bold text-[#636E72] uppercase tracking-wide w-14">題號</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-[#636E72] uppercase tracking-wide" style={{ minWidth: '160px' }}>對應知識節點</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-[#636E72] uppercase tracking-wide" style={{ minWidth: '220px' }}>題幹內容</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-[#636E72] uppercase tracking-wide" style={{ minWidth: '340px' }}>選項內容 / 對應迷思</th>
              <th className="px-4 py-3 text-center text-sm font-bold text-[#636E72] uppercase tracking-wide w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {quizQuestions.map((q, qIdx) => {
              const node = getNode(q.knowledgeNodeId);
              const isDragging = dragIdx === qIdx;
              const isDropTarget = dropIdx === qIdx;
              return (
                <tr
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(qIdx)}
                  onDragOver={(e) => handleDragOver(e, qIdx)}
                  onDragEnd={handleDragEnd}
                  className={`${qIdx % 2 === 0 ? 'bg-white' : 'bg-[#EEF5E6]'} ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'ring-2 ring-inset ring-[#8FC87A]' : ''} transition-all`}
                >
                  <td className="px-1 py-5 text-center cursor-grab active:cursor-grabbing group">
                    <div
                      className="inline-flex items-center justify-center w-7 h-9 rounded-lg bg-[#EEF5E6] border border-[#C8D6C9] text-[#5C8A2E] group-hover:bg-[#C8EAAE] group-hover:border-[#8FC87A] group-hover:text-[#3D5A3E] transition-colors"
                      title="拖拉這裡可調整題目順序"
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 20 }}>drag_indicator</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#C8EAAE] border border-[#BDC3C7] text-[#3D5A3E] text-sm font-bold">
                      {qIdx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-5 align-top">
                    {node && (() => {
                      const color = getNodeColor(node.id);
                      return (
                        <div className="flex items-start gap-2">
                          <div className={`flex-shrink-0 w-1 self-stretch rounded-full ${color.bar}`}></div>
                          <div>
                            <span className={`inline-flex items-center gap-1 text-[15px] font-mono font-semibold px-2 py-0.5 rounded-sm border-l-[3px] mb-1 ${color.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.bar}`}></span>
                              {node.id}
                            </span>
                            <p className="text-sm font-semibold text-[#2D3436]">{node.name}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-5 align-top">
                    <p className="text-sm text-[#2D3436] leading-relaxed">{q.stem}</p>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <QuestionOptionsCell question={q} getMisconceptionLabel={getMisconceptionLabel} />
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <div className="flex flex-col gap-2 items-center">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#2E86C1] bg-[#BADDF4] border border-[#BDC3C7] rounded-xl hover:bg-[#A8D2EC] transition-colors w-full justify-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        編輯
                      </button>
                      <button
                        onClick={() => setDeletingQuestion(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors w-full justify-center"
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
                <td colSpan={6} className="px-4 py-12 text-center text-[#95A5A6] text-sm">
                  目前沒有題目，請點擊「新增題目」開始出題，或點上方「從題庫挑題」匯入現成題目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-[#95A5A6]">
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
        <div className="flex gap-3" data-tour="save-buttons">
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
        <EditQuestionModal nodes={nodes} question={editingQuestion} selectedNodeIds={selectedNodeIds} onSave={handleSaveEdit} onClose={() => setEditingQuestion(null)} />
      )}
      {deletingQuestion && (
        <DeleteQuestionModal question={deletingQuestion} onConfirm={() => handleDelete(deletingQuestion.id)} onClose={() => setDeletingQuestion(null)} />
      )}
      {showPreview && (
        <PreviewQuizModal questions={quizQuestions} onClose={() => setShowPreview(false)} />
      )}
      {showImport && (
        <QuestionImportDrawer
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          excludeQuizId={editingQuizId}
          mode={editingQuizMode}
          onImport={handleImportQuestions}
          onClose={() => setShowImport(false)}
        />
      )}
      {publishProblems && (
        <PublishValidationModal problems={publishProblems} onClose={() => setPublishProblems(null)} />
      )}
    </div>
  );
}
