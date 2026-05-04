import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import { useScenario, useSaveScenario } from '../../../hooks/useScenarios';
import { knowledgeNodes, getNodeById } from '../../../data/knowledgeGraph';

/* 情境考卷出題精靈（spec-08 §5.1）
 * 單頁式表單；一份考卷可有多題情境；每題含 情境敘述、開場提問、專家示範、目標迷思。
 * 同時支援新建（路由 /teacher/scenarios/create）與編輯（/teacher/scenarios/:scenarioQuizId/edit）。
 */
const TODAY = new Date().toISOString().slice(0, 10);

const blankQuestion = (idx) => ({
  index: idx,
  title: `論證議題 ${idx}`,
  scenarioText: '',
  scenarioImages: [],
  initialMessage: '',
  expertModel: '',
  targetMisconceptions: [],
});

export default function ScenarioCreateWizard() {
  const { scenarioQuizId } = useParams();
  const isEditing = Boolean(scenarioQuizId);
  const navigate = useNavigate();
  const { data: existing, isLoading: existingLoading } = useScenario(scenarioQuizId);
  const saveScenarioMut = useSaveScenario();

  const [draft, setDraft] = useState(() => ({
    id: undefined,
    title: '',
    status: 'draft',
    targetNodeId: '',
    targetMisconceptions: [],
    createdAt: TODAY,
    questions: [blankQuestion(1)],
  }));

  // bootstrap edit mode once data arrives — sync external (server) data into local form draft.
  // This is the documented "sync external state into form draft" pattern when data is lazy-loaded.
  useEffect(() => {
    if (isEditing && existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(structuredClone(existing));
    }
  }, [isEditing, existing]);

  const targetNode = getNodeById(draft.targetNodeId);
  const availableMisconceptions = targetNode?.misconceptions ?? [];

  const updateField = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  /* 切目標節點時：同步清空非該節點的已選迷思 */
  const updateTargetNode = (newNodeId) => {
    const node = getNodeById(newNodeId);
    const validIds = new Set((node?.misconceptions ?? []).map((m) => m.id));
    setDraft((d) => ({
      ...d,
      targetNodeId: newNodeId,
      targetMisconceptions: d.targetMisconceptions.filter((mid) => validIds.has(mid)),
    }));
  };

  const toggleMisconception = (mid) => {
    setDraft((d) => ({
      ...d,
      targetMisconceptions: d.targetMisconceptions.includes(mid)
        ? d.targetMisconceptions.filter((m) => m !== mid)
        : [...d.targetMisconceptions, mid],
    }));
  };

  const updateQuestion = (idx, patch) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.index === idx ? { ...q, ...patch } : q)),
    }));
  };

  const addQuestion = () => {
    setDraft((d) => ({
      ...d,
      questions: [...d.questions, blankQuestion(d.questions.length + 1)],
    }));
  };

  const removeQuestion = (idx) => {
    setDraft((d) => {
      if (d.questions.length === 1) return d;
      return {
        ...d,
        questions: d.questions
          .filter((q) => q.index !== idx)
          .map((q, i) => ({ ...q, index: i + 1, title: q.title.replace(/\d+/, String(i + 1)) })),
      };
    });
  };

  const handleSave = async (status) => {
    if (!draft.title.trim()) {
      alert('請填寫考卷標題');
      return;
    }
    if (!draft.targetNodeId) {
      alert('請選擇目標節點');
      return;
    }
    try {
      await saveScenarioMut.mutateAsync({ ...draft, status });
      navigate('/teacher/scenarios');
    } catch (err) {
      console.error('[ScenarioCreateWizard] save failed', err);
      alert('儲存失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  if (isEditing && existingLoading) {
    return (
      <TeacherLayout>
        <div className="p-8 text-[#636E72]">載入中…</div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
        {/* 頁首 */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">
              {isEditing ? '編輯情境考卷' : '新增情境考卷'}
            </h1>
            <p className="text-[#636E72] mt-1 text-sm">
              情境考卷的每一題都會由 AI 用「主張・證據・推理・修正」引導學生對話（認知師徒制）
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/teacher/scenarios')}
            className="px-4 py-2 text-sm text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-white transition"
          >
            取消
          </button>
        </div>

        {/* 基本資訊 */}
        <section className="bg-white rounded-2xl border border-[#BDC3C7] p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-bold text-[#2D3436] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#5BA47A] rounded-full" />
            基本資訊
          </h2>
          <div className="space-y-4">
            <Field label="標題" required>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="例：情境治療 · 溶解現象判斷"
                className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40 focus:border-[#5BA47A]"
              />
            </Field>
            <Field label="目標知識節點" required>
              <select
                value={draft.targetNodeId}
                onChange={(e) => updateTargetNode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40 focus:border-[#5BA47A]"
              >
                <option value="">請選擇節點...</option>
                {knowledgeNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}・{n.name}
                  </option>
                ))}
              </select>
            </Field>
            {targetNode && (
              <Field label="目標迷思（從節點下的 4 條中勾選想治療的）">
                <div className="flex flex-wrap gap-2">
                  {availableMisconceptions.map((m) => {
                    const checked = draft.targetMisconceptions.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMisconception(m.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition
                                   ${checked
                                     ? 'bg-[#FFF1D8] border-[#F0B962] text-[#7A4A18]'
                                     : 'bg-white border-[#BDC3C7] text-[#636E72] hover:border-[#F0B962]'}`}
                        title={m.detail}
                      >
                        {m.id}・{m.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </div>
        </section>

        {/* 題目列表 */}
        <section className="bg-white rounded-2xl border border-[#BDC3C7] p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#2D3436] flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#5BA47A] rounded-full" />
              情境題目（共 {draft.questions.length} 題）
            </h2>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-[#3F8B5E]
                         border border-[#5BA47A] rounded-xl hover:bg-[#EEF5E6] transition"
            >
              + 新增情境題
            </button>
          </div>

          <div className="space-y-4">
            {draft.questions.map((q) => (
              <QuestionEditor
                key={q.index}
                question={q}
                availableMisconceptions={availableMisconceptions}
                canRemove={draft.questions.length > 1}
                onUpdate={(patch) => updateQuestion(q.index, patch)}
                onRemove={() => removeQuestion(q.index)}
              />
            ))}
          </div>
        </section>

        {/* 儲存按鈕 */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="px-5 py-2.5 text-sm font-semibold text-[#636E72] bg-white border border-[#BDC3C7]
                       rounded-2xl hover:bg-[#FCF0C2] transition"
          >
            儲存為草稿
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5BA47A] border border-[#3F8B5E]
                       rounded-2xl hover:bg-[#3F8B5E] transition shadow-[0_2px_8px_rgba(63,139,94,0.3)]"
          >
            儲存並發佈
          </button>
        </div>
      </div>
    </TeacherLayout>
  );
}

/* ── Field 包裝 ─────────────────────────────────── */
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#636E72] mb-1.5">
        {label}
        {required && <span className="text-[#E74C5E] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── 圖片上傳（前端 Mock，存 base64 Data URL）─────
 * 支援多張、可移除、可拖放（檔案選擇器）
 * 未來接後端時，把 readAsDataURL 換成 fetch upload，介面不用改。
 */
const MAX_IMAGES = 2;

function ImageUploader({ images, onChange }) {
  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const files = Array.from(fileList).slice(0, remaining);
    Promise.all(
      files.map(
        (f) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          })
      )
    ).then((dataUrls) => {
      onChange([...images, ...dataUrls]);
    });
  };

  const removeAt = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const atMax = images.length >= MAX_IMAGES;

  return (
    <div>
      {/* 預覽列 */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((src, idx) => (
            <div
              key={`${idx}-${src.slice(-12)}`}
              className="relative group rounded-xl border-2 border-[#5BA47A] bg-white overflow-hidden"
            >
              <img
                src={src}
                alt={`情境圖 ${idx + 1}`}
                className="block max-h-32 max-w-[180px] object-contain"
              />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                aria-label="移除圖片"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#E74C5E] text-white text-xs font-bold
                           flex items-center justify-center
                           shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                           hover:scale-110 transition-transform"
              >
                ✕
              </button>
              <span className="absolute bottom-0 left-0 right-0 px-2 py-0.5 text-[10px] font-bold
                               bg-black/45 text-white text-center">
                圖片 {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 上傳區（檔案選擇 + 拖放） */}
      <label
        className={`block border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition
                   ${atMax
                     ? 'border-[#D5D8DC] bg-[#F4F6F4] cursor-not-allowed opacity-60'
                     : 'border-[#5BA47A] bg-white hover:bg-[#EEF5E6]'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (atMax) return;
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={atMax}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-bold text-[#3F8B5E]">
            {atMax ? '已達上限（最多 2 張）' : '點擊或拖放圖片到這裡'}
          </p>
          <p className="text-xs text-[#95A5A6]">
            {atMax ? '請先移除一張再上傳' : `支援 PNG / JPG / GIF・目前 ${images.length}/${MAX_IMAGES} 張`}
          </p>
        </div>
      </label>
    </div>
  );
}

/* ── 單題編輯器 ────────────────────────────────── */
function QuestionEditor({ question, availableMisconceptions, canRemove, onUpdate, onRemove }) {
  const toggleMid = (mid) => {
    onUpdate({
      targetMisconceptions: question.targetMisconceptions.includes(mid)
        ? question.targetMisconceptions.filter((m) => m !== mid)
        : [...question.targetMisconceptions, mid],
    });
  };

  return (
    <div className="border border-[#BDC3C7] rounded-2xl p-5 bg-[#F9FBF7]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#3F8B5E]">{question.title}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-[#E74C5E] hover:underline"
          >
            移除此題
          </button>
        )}
      </div>
      <div className="space-y-3">
        <Field label="情境敘述">
          <textarea
            rows={5}
            value={question.scenarioText}
            onChange={(e) => onUpdate({ scenarioText: e.target.value })}
            placeholder="例：小華將 10 公克的砂糖加入 100 公克的水中..."
            className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] bg-white text-sm leading-6
                       focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40 focus:border-[#5BA47A]"
          />
        </Field>
        <Field label="情境圖片（選填，可上傳 1~2 張，學生對話時可放大檢視）">
          <ImageUploader
            images={question.scenarioImages ?? []}
            onChange={(imgs) => onUpdate({ scenarioImages: imgs })}
          />
        </Field>
        <Field label="AI 開場提問（學生看到的第一句話）">
          <textarea
            rows={2}
            value={question.initialMessage}
            onChange={(e) => onUpdate({ initialMessage: e.target.value })}
            placeholder="例：請根據剛才的情境，說說你的想法..."
            className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] bg-white text-sm leading-6
                       focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40 focus:border-[#5BA47A]"
          />
        </Field>
        <Field label="專家示範範文（apprenticeship 階段 AI 會引述）">
          <textarea
            rows={3}
            value={question.expertModel}
            onChange={(e) => onUpdate({ expertModel: e.target.value })}
            placeholder="例：我來示範專家的思考：我主張...證據是...推理是..."
            className="w-full px-3 py-2 rounded-xl border border-[#BDC3C7] bg-white text-sm leading-6
                       focus:outline-none focus:ring-2 focus:ring-[#5BA47A]/40 focus:border-[#5BA47A]"
          />
        </Field>
        {availableMisconceptions.length > 0 && (
          <Field label="本題針對的迷思">
            <div className="flex flex-wrap gap-1.5">
              {availableMisconceptions.map((m) => {
                const checked = question.targetMisconceptions.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMid(m.id)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition
                               ${checked
                                 ? 'bg-[#FFF1D8] border-[#F0B962] text-[#7A4A18]'
                                 : 'bg-white border-[#BDC3C7] text-[#95A5A6]'}`}
                  >
                    {m.id}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}
