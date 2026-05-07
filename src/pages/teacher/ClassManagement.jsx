import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useClasses, useCreateClass, useUpdateClass } from '../../hooks/useClasses';
import { useAssignments } from '../../hooks/useAssignments';
import { useQuizzes } from '../../hooks/useQuizzes';

const COLOR_PRESETS = [
  { color: '#C8EAAE', textColor: '#3D5A3E' },
  { color: '#FFE0A3', textColor: '#7A5A2A' },
  { color: '#A8D8EA', textColor: '#2C5A6E' },
  { color: '#F4B6C2', textColor: '#7A3A48' },
  { color: '#D4C5F9', textColor: '#4A3A7A' },
  { color: '#F9E79F', textColor: '#7A5E0A' },
];

const GRADES = ['一年級', '二年級', '三年級', '四年級', '五年級'];

const EMPTY_FORM = { name: '', grade: '五年級', subject: '自然科學', note: '', colorIdx: 0 };

function findColorIdx(color) {
  const idx = COLOR_PRESETS.findIndex((p) => p.color.toLowerCase() === (color || '').toLowerCase());
  return idx >= 0 ? idx : 0;
}

export default function ClassManagement() {
  const navigate = useNavigate();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const { data: assignments = [] } = useAssignments();
  const { data: quizzes = [] } = useQuizzes();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();

  // mode: null = closed; { kind: 'create' } or { kind: 'edit', classId }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModal({ kind: 'create' });
  };

  const openEdit = (cls) => {
    setForm({
      name: cls.name,
      grade: cls.grade,
      subject: cls.subject,
      note: cls.note ?? '',
      colorIdx: findColorIdx(cls.color),
    });
    setError('');
    setModal({ kind: 'edit', classId: cls.id });
  };

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('請輸入班級名稱');
      return;
    }
    const preset = COLOR_PRESETS[form.colorIdx];
    const payload = {
      name: form.name.trim(),
      grade: form.grade.trim(),
      subject: form.subject.trim(),
      color: preset.color,
      textColor: preset.textColor,
      note: form.note.trim() || null,
    };
    try {
      if (modal.kind === 'create') {
        await createClass.mutateAsync(payload);
      } else {
        await updateClass.mutateAsync({ classId: modal.classId, ...payload });
      }
      closeModal();
    } catch (err) {
      setError(err?.message || '儲存失敗');
    }
  };

  const getLastAssignment = (classId) => {
    const clsAssignments = assignments.filter((a) => a.classId === classId);
    if (clsAssignments.length === 0) return null;
    return clsAssignments.reduce((latest, a) =>
      a.assignedAt > latest.assignedAt ? a : latest
    );
  };

  const isPending = createClass.isPending || updateClass.isPending;
  const isEdit = modal?.kind === 'edit';

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">班級管理</h1>
            <p className="text-[#636E72] mt-1 text-sm">管理各班級的學生名單與相關資訊</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#3D5A3E] rounded-2xl hover:bg-[#2F4530] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增班級
          </button>
        </div>

        {classesLoading && (
          <div className="text-[#636E72] text-sm">載入中…</div>
        )}

        {/* 班級卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {classes.map((cls) => {
            const lastAssignment = getLastAssignment(cls.id);
            const lastQuiz = lastAssignment ? quizzes.find((q) => q.id === lastAssignment.quizId) : null;

            return (
              <div
                key={cls.id}
                className="bg-white rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <div className="h-2" style={{ backgroundColor: cls.color }} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#2D3436] truncate">{cls.name}</h3>
                        <button
                          onClick={() => openEdit(cls)}
                          className="p-1 text-[#95A5A6] hover:text-[#3D5A3E] hover:bg-[#EEF5E6] rounded-lg transition-colors flex-shrink-0"
                          aria-label="編輯班級"
                          title="編輯班級資訊"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-[#636E72] mt-0.5">{cls.grade} · {cls.subject}</p>
                      {cls.note && (
                        <p className="text-xs text-[#95A5A6] mt-1 truncate">{cls.note}</p>
                      )}
                    </div>
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ml-2"
                      style={{ backgroundColor: cls.color }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ color: cls.textColor }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-3 text-center">
                      <p className="text-xl font-bold text-[#2D3436]">{cls.studentCount}</p>
                      <p className="text-xs text-[#636E72] mt-0.5">位學生</p>
                    </div>
                    <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-3 text-center">
                      <p className="text-xl font-bold text-[#2D3436]">
                        {assignments.filter((a) => a.classId === cls.id).length}
                      </p>
                      <p className="text-xs text-[#636E72] mt-0.5">筆派題</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    {lastAssignment ? (
                      <div className="bg-[#EEF5E6] rounded-xl border border-[#D5D8DC] px-3 py-2.5">
                        <p className="text-xs text-[#95A5A6] mb-0.5">最近派題</p>
                        <p className="text-xs font-medium text-[#2D3436] truncate">{lastQuiz?.title ?? lastAssignment.quizId}</p>
                        <p className="text-xs text-[#636E72] mt-0.5">{lastAssignment.assignedAt}</p>
                      </div>
                    ) : (
                      <div className="bg-[#EEF5E6] rounded-xl border border-[#D5D8DC] px-3 py-2.5">
                        <p className="text-xs text-[#95A5A6]">尚未有派題記錄</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#2D3436] border border-[#BDC3C7] rounded-2xl hover:bg-[#EEF5E6] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    管理成員
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 新增 / 編輯 班級 Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-[#ECEFF1]">
                <h2 className="text-lg font-bold text-[#2D3436]">
                  {isEdit ? '編輯班級' : '新增班級'}
                </h2>
                <p className="text-sm text-[#636E72] mt-1">
                  {isEdit ? '更新班級資訊（學生名單請於「管理成員」維護）' : '建立空班，建立後再到「管理成員」加入學生'}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">班級名稱</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="例：五年丁班"
                    className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E]"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">年級</label>
                    <select
                      value={GRADES.includes(form.grade) ? form.grade : '五年級'}
                      onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E] bg-white"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">科目</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">
                    備註 <span className="text-xs font-normal text-[#95A5A6]">（選填，方便跨年區分）</span>
                  </label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="例：114 學年度上學期、王老師班"
                    maxLength={200}
                    className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">代表色</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map((p, i) => (
                      <button
                        type="button"
                        key={p.color}
                        onClick={() => setForm({ ...form, colorIdx: i })}
                        className={`w-10 h-10 rounded-2xl border-2 transition-all ${
                          form.colorIdx === i ? 'border-[#2D3436] scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: p.color }}
                        aria-label={`color-${i}`}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[#C0392B]">{error}</p>
                )}
              </div>

              <div className="p-6 border-t border-[#ECEFF1] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-semibold text-[#636E72] border border-[#BDC3C7] rounded-2xl hover:bg-[#EEF5E6] transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#3D5A3E] rounded-2xl hover:bg-[#2F4530] transition-colors disabled:opacity-60"
                >
                  {isPending ? '儲存中…' : (isEdit ? '儲存變更' : '建立班級')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
