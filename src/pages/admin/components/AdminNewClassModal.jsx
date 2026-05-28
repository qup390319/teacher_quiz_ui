import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { useAdminCreateClass } from '../../../hooks/useAdminClasses';
import { getSchoolYearOptions, formatSchoolYearLabel, getCurrentSchoolYear, getCurrentSemester } from '../../../utils/schoolYear';

const COLOR_PRESETS = [
  { bg: '#7DD3A8', text: '#065F46' },
  { bg: '#60A5FA', text: '#1E3A5F' },
  { bg: '#A78BFA', text: '#312E81' },
  { bg: '#FB923C', text: '#7C2D12' },
  { bg: '#FCD34D', text: '#78350F' },
  { bg: '#F472B6', text: '#831843' },
  { bg: '#2DD4BF', text: '#134E4A' },
  { bg: '#F87171', text: '#7F1D1D' },
  { bg: '#818CF8', text: '#1E1B4B' },
  { bg: '#34D399', text: '#064E3B' },
  { bg: '#94A3B8', text: '#1E293B' },
  { bg: '#FCA5A5', text: '#7F1D1D' },
];

const GRADE_OPTIONS = ['一年級', '二年級', '三年級', '四年級', '五年級', '六年級'];

const FIELD_CLS = `w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm
  text-[#1F2937] placeholder:text-[#9CA3AF]
  focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent`;

function Label({ children, required }) {
  return (
    <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
      {children}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
  );
}

export default function AdminNewClassModal({ onClose }) {
  const navigate = useNavigate();
  const schoolYearOptions = getSchoolYearOptions(3);

  const [teacherId, setTeacherId] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('五年級');
  const [subject, setSubject] = useState('自然科學');
  const [colorIdx, setColorIdx] = useState(0);
  const [schoolYear, setSchoolYear] = useState(String(getCurrentSchoolYear()));
  const [semester, setSemester] = useState(getCurrentSemester());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data: teachersList } = useAdminUsers({ role: 'teacher' });
  const teachers = teachersList?.items ?? [];

  const { mutateAsync: createClass, isPending } = useAdminCreateClass();

  const selectedColor = COLOR_PRESETS[colorIdx];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!teacherId) { setError('請選擇所屬教師'); return; }
    if (!name.trim()) { setError('請輸入班級名稱'); return; }
    try {
      const result = await createClass({
        teacherId,
        name: name.trim(),
        grade,
        subject: subject.trim(),
        color: selectedColor.bg,
        textColor: selectedColor.text,
        schoolYear: parseInt(schoolYear, 10),
        semester,
        note: note.trim() || null,
      });
      navigate(`/admin/classes/${result.id}`);
    } catch (err) {
      if (err.code === 'TEACHER_NOT_FOUND') setError('找不到此教師，請重新選擇');
      else setError(err.message || '建立失敗，請稍後再試');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-[#E5E7EB] shadow-xl overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-base font-bold text-[#1F2937]">新增班級</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F4F8F6] text-[#6B7280]"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* 所屬教師 */}
          <div>
            <Label required>所屬教師</Label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className={FIELD_CLS}
              required
            >
              <option value="">— 請選擇教師 —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.account}（{t.account}）
                </option>
              ))}
            </select>
          </div>

          {/* 班級名稱 */}
          <div>
            <Label required>班級名稱</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：五年甲班"
              maxLength={64}
              className={FIELD_CLS}
              required
            />
          </div>

          {/* 年級 / 科目 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>年級</Label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className={FIELD_CLS}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <Label required>科目</Label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例：自然科學"
                maxLength={32}
                className={FIELD_CLS}
              />
            </div>
          </div>

          {/* 學年度 / 學期 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>學年度</Label>
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className={FIELD_CLS}
              >
                {schoolYearOptions.map((y) => (
                  <option key={y} value={y}>{formatSchoolYearLabel(y)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label required>學期</Label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={FIELD_CLS}
              >
                <option value="first">上學期</option>
                <option value="second">下學期</option>
              </select>
            </div>
          </div>

          {/* 班級顏色 */}
          <div>
            <Label required>班級顏色</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_PRESETS.map((c, i) => (
                <button
                  key={c.bg}
                  type="button"
                  onClick={() => setColorIdx(i)}
                  className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                    i === colorIdx ? 'border-[#1F2937] scale-110 shadow' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c.bg }}
                  aria-label={c.bg}
                />
              ))}
            </div>
            {/* Preview */}
            <div
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: selectedColor.bg, color: selectedColor.text }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: selectedColor.text }} />
              {name || '班級名稱預覽'}
            </div>
          </div>

          {/* 備註 */}
          <div>
            <Label>備註（選填）</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="選填"
              className={`${FIELD_CLS} resize-none`}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6]
                       text-[#1F2937] font-medium text-sm disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            form=""
            disabled={isPending || !teacherId || !name.trim()}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white
                       font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '建立中…' : '建立班級'}
          </button>
        </div>
      </div>
    </div>
  );
}
