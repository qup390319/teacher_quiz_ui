import { useState } from 'react';
import DistractorSuggestPopover from '../DistractorSuggestPopover';
import { usePolishStem, useSuggestOptions } from '../../../hooks/useAdaptive';
import { getQuestionMode, getAnswerOptions, getReasonOptions } from '../../../data/twoTier';

/**
 * 題目編輯器。支援兩種題型：
 *  - single  ：一組選項，每個配「答案判定」下拉（CORRECT / 迷思）。
 *  - two-tier：第一層答案（radio 標正解）+ 第二層理由（每個理由配迷思下拉）。
 * 迷思住在哪一層，N6「建議」就放在那一層（single 在選項、two-tier 在理由）。
 */
export default function EditQuestionModal({ nodes = [], question, selectedNodeIds, onSave, onClose }) {
  const mode = getQuestionMode(question);
  const [stem, setStem] = useState(question.stem);
  const [nodeId, setNodeId] = useState(question.knowledgeNodeId);
  const [options, setOptions] = useState(
    mode === 'single' ? question.options.map((o) => ({ ...o })) : [],
  );
  const [answerOptions, setAnswerOptions] = useState(
    mode === 'two-tier'
      ? getAnswerOptions(question).map((o) => ({
          tag: o.tag,
          content: o.content,
          correct: typeof o.correct === 'boolean' ? o.correct : o.diagnosis === 'CORRECT',
        }))
      : [],
  );
  const [reasonOptions, setReasonOptions] = useState(
    mode === 'two-tier' ? getReasonOptions(question).map((o) => ({ ...o })) : [],
  );
  const [suggestForIdx, setSuggestForIdx] = useState(null);
  const polishMut = usePolishStem();
  const suggestOptsMut = useSuggestOptions();

  const currentNode = nodes.find((n) => n.id === nodeId);
  const availableMisconceptions = currentNode ? currentNode.misconceptions : [];
  const hasStem = stem.trim().length > 0;

  // 「承載迷思」的那一層（single=options，two-tier=reasonOptions）——N6 建議與下拉作用於此。
  const diagLayer = mode === 'two-tier' ? reasonOptions : options;
  const setDiagLayer = mode === 'two-tier' ? setReasonOptions : setOptions;
  const updateDiagOption = (idx, field, value) =>
    setDiagLayer((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));

  const updateAnswer = (idx, field, value) =>
    setAnswerOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  const markCorrect = (idx) =>
    setAnswerOptions((prev) => prev.map((o, i) => ({ ...o, correct: i === idx })));

  const suggestTarget = suggestForIdx !== null ? diagLayer[suggestForIdx] : null;
  const suggestMisconception = suggestTarget && suggestTarget.diagnosis !== 'CORRECT'
    ? availableMisconceptions.find((m) => m.id === suggestTarget.diagnosis)
    : null;

  // ── 雙層次方法論驗證（Treagust two-tier）──────────────────────────
  // 規則：第一層恰一正解、第二層恰一「正確理由」、錯誤理由各對應不同迷思、選項不留白。
  const answerCorrectCount = answerOptions.filter((o) => o.correct).length;
  const reasonCorrectCount = reasonOptions.filter((o) => o.diagnosis === 'CORRECT').length;
  const singleCorrectCount = options.filter((o) => o.diagnosis === 'CORRECT').length;
  const wrongReasonCodes = reasonOptions.filter((o) => o.diagnosis !== 'CORRECT').map((o) => o.diagnosis);
  const hasDupReasonMiscon = new Set(wrongReasonCodes).size !== wrongReasonCodes.length;
  const layerForBlank = mode === 'two-tier' ? [...answerOptions, ...reasonOptions] : options;
  const hasEmptyContent = layerForBlank.some((o) => !o.content.trim());

  const validationErrors = [];
  if (!hasStem) validationErrors.push('請填寫題幹內容。');
  if (hasEmptyContent) validationErrors.push('每個選項都要有內容，不能留白。');
  if (mode === 'two-tier') {
    if (answerCorrectCount !== 1) validationErrors.push('第一層（內容 What）必須剛好標示「一個」正解。');
    if (reasonCorrectCount !== 1) validationErrors.push('第二層（理由 Why）必須剛好有「一個」正確理由。');
    if (hasDupReasonMiscon) validationErrors.push('各個錯誤理由要對應到「不同」的迷思，請避免重複。');
    const coveredAnswers = new Set(reasonOptions.map((o) => o.answerTag).filter(Boolean));
    const uncoveredAnswers = answerOptions.map((o) => o.tag).filter((t) => !coveredAnswers.has(t));
    if (uncoveredAnswers.length > 0) validationErrors.push(`答案 ${uncoveredAnswers.join('、')} 還沒有理由對應（每個答案至少要一個）。`);
  } else if (singleCorrectCount !== 1) {
    validationErrors.push('必須剛好標示「一個」正確答案。');
  }
  const canSave = validationErrors.length === 0;

  const handleSave = () => {
    if (!canSave) return;
    if (mode === 'two-tier') {
      onSave({ ...question, mode: 'two-tier', stem, knowledgeNodeId: nodeId, answerOptions, reasonOptions });
    } else {
      onSave({ ...question, stem, knowledgeNodeId: nodeId, options });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#D5D8DC] px-6 py-4 flex items-center justify-between rounded-t-[32px]">
          <h3 className="text-base font-bold text-[#2D3436] flex items-center gap-2">
            編輯題目 #{question.id}
            {mode === 'two-tier' && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E4E73] bg-[#BFE0F5] border border-[#8FB8DE] px-2 py-0.5 rounded-full">
                <span className="material-symbols-rounded text-sm">stacked_bar_chart</span>雙層次
              </span>
            )}
          </h3>
          <button onClick={onClose} className="text-[#95A5A6] hover:text-[#636E72] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          {mode === 'two-tier' && (
            <div className="rounded-xl bg-[#EAF3FB] border border-[#BFE0F5] px-3 py-2.5 text-xs text-[#1E4E73] leading-relaxed">
              <span className="font-bold">雙層次設計：</span>第一層測「內容（What）」、第二層測「理由（Why）」。
              第二層需含 <span className="font-bold">1 個正確原理</span> ＋ 其餘各對應 1 條迷思。
              計分採 <span className="font-bold">兩層全對才算精熟（TT）</span>——只對一層代表死記或粗心。
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#2D3436]">
                題幹內容
                <span className="text-sm font-normal text-[#95A5A6] ml-2">（請先輸入題幹再產生選項建議）</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (!hasStem || !currentNode) return;
                  try {
                    const res = await polishMut.mutateAsync({
                      stem, nodeId: currentNode.id, nodeName: currentNode.name,
                    });
                    if (res?.polished) setStem(res.polished);
                  } catch { /* toast handled by react-query */ }
                }}
                disabled={!hasStem || polishMut.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold
                           text-[#5B3D8F] bg-[#EDE7F6] border border-[#B39DDB] rounded-lg
                           hover:bg-[#D1C4E9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="AI 會將題幹改寫為國小五年級學生更容易理解的語言"
              >
                <span aria-hidden="true">✨</span>
                {polishMut.isPending ? 'AI 潤飾中…' : 'AI 潤飾題幹'}
              </button>
            </div>
            <textarea
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={3}
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] resize-none"
            />
          </div>
          <div className="border-t border-[#EFF1F3] pt-5">
            <label className="block text-sm font-semibold text-[#2D3436] mb-2">對應知識節點</label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
            >
              {nodes
                .filter((n) => selectedNodeIds.includes(n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>{n.id} · {n.name}</option>
                ))}
            </select>
          </div>

          {/* ── 第一層：答案（two-tier）──────────────────────── */}
          {mode === 'two-tier' && (
            <div className="border-t border-[#EFF1F3] pt-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C8EAAE] text-[#3D5A3E] text-sm font-bold">1</span>
                  <label className="text-sm font-semibold text-[#2D3436]">第一層 · 內容（What）</label>
                  <span className="text-sm text-[#95A5A6]">測對事實／現象的理解，標一個正解</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!hasStem || !currentNode) return;
                    try {
                      const res = await suggestOptsMut.mutateAsync({
                        stem,
                        nodeId: currentNode.id,
                        nodeName: currentNode.name,
                        mode: 'two-tier',
                        misconceptions: availableMisconceptions.map((m) => ({
                          id: m.id, label: m.label, detail: m.detail,
                        })),
                      });
                      if (res?.options?.length) {
                        setAnswerOptions(res.options.map((o) => ({
                          tag: o.tag, content: o.content, correct: o.diagnosis === 'CORRECT',
                        })));
                      }
                      if (res?.reasonOptions?.length) {
                        setReasonOptions(res.reasonOptions.map((o) => ({
                          tag: o.tag, content: o.content, diagnosis: o.diagnosis, answerTag: o.answerTag ?? null,
                        })));
                      }
                    } catch { /* toast handled by react-query */ }
                  }}
                  disabled={!hasStem || suggestOptsMut.isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold
                             text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg
                             hover:bg-[#F4DDA8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="AI 依題幹與迷思概念，一次產生答案層與理由層"
                >
                  <span aria-hidden="true">✨</span>
                  {suggestOptsMut.isPending ? 'AI 產生中…' : 'AI 建議雙層選項'}
                </button>
              </div>
              <div className="space-y-3">
                {answerOptions.map((opt, idx) => (
                  <div key={opt.tag} className={`rounded-2xl p-4 border ${opt.correct ? 'bg-[#EEF8E4] border-[#A7D696]' : 'bg-[#EEF5E6] border-[#D5D8DC]'}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-white border border-[#BDC3C7] text-[#636E72] text-sm font-bold flex items-center justify-center flex-shrink-0">{opt.tag}</span>
                      <input
                        value={opt.content}
                        onChange={(e) => updateAnswer(idx, 'content', e.target.value)}
                        className="flex-1 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                      />
                      <label className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3D5A3E] cursor-pointer px-2">
                        <input type="radio" name="answer-correct" checked={!!opt.correct} onChange={() => markCorrect(idx)} className="w-4 h-4" />
                        正解
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 承載迷思那一層：single=選項 / two-tier=理由 ──── */}
          <div className="border-t border-[#EFF1F3] pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {mode === 'two-tier' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#BFE0F5] text-[#1E4E73] text-sm font-bold">2</span>}
                <label className="text-sm font-semibold text-[#2D3436]">
                  {mode === 'two-tier' ? '第二層 · 理由（Why）' : '選項內容與答案判定'}
                </label>
                {mode === 'two-tier' && <span className="text-sm text-[#95A5A6]">為什麼選上一題的答案？1 個正確原理＋其餘各對應一條迷思</span>}
              </div>
              {mode === 'single' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!hasStem || !currentNode) return;
                    try {
                      const res = await suggestOptsMut.mutateAsync({
                        stem,
                        nodeId: currentNode.id,
                        nodeName: currentNode.name,
                        misconceptions: availableMisconceptions.map((m) => ({
                          id: m.id, label: m.label, detail: m.detail,
                        })),
                      });
                      if (res?.options?.length === 4) {
                        setOptions(res.options.map((o) => ({
                          tag: o.tag, content: o.content, diagnosis: o.diagnosis,
                        })));
                      }
                    } catch { /* toast handled by react-query */ }
                  }}
                  disabled={!hasStem || suggestOptsMut.isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold
                             text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg
                             hover:bg-[#F4DDA8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="AI 根據題幹與迷思概念自動產生一組四選項"
                >
                  <span aria-hidden="true">✨</span>
                  {suggestOptsMut.isPending ? 'AI 產生中…' : 'AI 建議選項'}
                </button>
              )}
            </div>
            <div className="space-y-3">
              {diagLayer.map((opt, idx) => (
                <div key={opt.tag} className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#BDC3C7] text-[#636E72] text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {opt.tag}
                    </span>
                    <input
                      value={opt.content}
                      onChange={(e) => updateDiagOption(idx, 'content', e.target.value)}
                      className="flex-1 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                    />
                    <button
                      type="button"
                      onClick={() => setSuggestForIdx(idx)}
                      disabled={opt.diagnosis === 'CORRECT' || !hasStem}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold
                                 text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg
                                 hover:bg-[#F4DDA8] disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        opt.diagnosis === 'CORRECT'
                          ? '正解不需建議'
                          : !hasStem
                            ? '請先填寫題幹，建議才能與題幹內容相關'
                            : '從文獻檢索 3 條學生真實說法（N6）'
                      }
                    >
                      <span aria-hidden="true">✨</span>
                      建議
                    </button>
                  </div>
                  <div className="ml-9 space-y-2">
                    <div>
                      <label className="text-sm text-[#95A5A6] mb-1 block">
                        {mode === 'two-tier' ? '理由判定' : '答案判定'}
                      </label>
                      <select
                        value={opt.diagnosis}
                        onChange={(e) => updateDiagOption(idx, 'diagnosis', e.target.value)}
                        className={`w-full border border-[#BDC3C7] rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8FC87A] ${opt.diagnosis === 'CORRECT'
                            ? 'bg-[#C8EAAE] text-[#3D5A3E]'
                            : 'bg-[#FAC8CC] text-[#E74C5E]'
                          }`}
                      >
                        <option value="CORRECT">{mode === 'two-tier' ? '✓ 正確理由' : '✓ 正確答案'}</option>
                        {availableMisconceptions.map((m) => (
                          <option key={m.id} value={m.id}>{m.id}：{m.label}</option>
                        ))}
                      </select>
                    </div>
                    {mode === 'two-tier' && (
                      <div>
                        <label className="text-sm text-[#95A5A6] mb-1 block">對應第一層答案</label>
                        <select
                          value={opt.answerTag ?? ''}
                          onChange={(e) => updateDiagOption(idx, 'answerTag', e.target.value)}
                          className="w-full border border-[#BDC3C7] rounded-xl px-3 py-1.5 text-sm font-medium bg-white text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                        >
                          <option value="">（請選擇對應答案）</option>
                          {answerOptions.map((a) => (
                            <option key={a.tag} value={a.tag}>{a.tag}：{a.content}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#D5D8DC] px-6 py-4 rounded-b-[32px]">
          {!canSave && (
            <ul className="mb-3 rounded-xl bg-[#FDECEC] border border-[#F5B8BA] px-3 py-2 text-xs text-[#C0392B] space-y-0.5 list-disc list-inside">
              {validationErrors.map((err) => <li key={err}>{err}</li>)}
            </ul>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors">
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-5 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              儲存變更
            </button>
          </div>
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
          stem={stem}
          onAdopt={(text) => {
            updateDiagOption(suggestForIdx, 'content', text);
            setSuggestForIdx(null);
          }}
          onClose={() => setSuggestForIdx(null)}
        />
      )}
      {suggestForIdx !== null && !suggestMisconception && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 cursor-pointer"
          onClick={() => setSuggestForIdx(null)}
        >
          <div
            className="bg-white border border-[#BDC3C7] rounded-2xl p-6 max-w-sm text-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[#636E72] mb-4">
              此項目前對應「正確{mode === 'two-tier' ? '理由' : '答案'}」，無法產生迷思建議。
              <br />請先把判定改為某條迷思後再試。
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
