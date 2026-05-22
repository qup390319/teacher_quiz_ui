/**
 * 班級新增 / 編輯 Modal（從 ClassManagement.jsx 抽出避免單檔超 500 行）。
 * 受控元件：父層持有 form / error / isPending；本元件純呈現 + 觸發 callback。
 */

import { formatSchoolYearLabel, formatSemesterLabel } from '../../utils/schoolYear';

const GRADES = ['一年級', '二年級', '三年級', '四年級', '五年級'];

export default function ClassFormModal({
  form, setForm, error, isEdit, isPending,
  yearOptions, currentSchoolYear, currentSemester,
  colorPresets, onSubmit, onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
        <form onSubmit={onSubmit}>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">學年度</label>
                <select
                  value={form.schoolYear ?? currentSchoolYear}
                  onChange={(e) => setForm({ ...form, schoolYear: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E] bg-white"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{formatSchoolYearLabel(y)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">學期</label>
                <select
                  value={form.semester ?? currentSemester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E] bg-white"
                >
                  <option value="first">{formatSemesterLabel('first')}</option>
                  <option value="second">{formatSemesterLabel('second')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">
                備註 <span className="text-sm font-normal text-[#95A5A6]">（選填）</span>
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="例：王老師班、A 組"
                maxLength={200}
                className="w-full px-4 py-2.5 text-sm border border-[#BDC3C7] rounded-2xl focus:outline-none focus:border-[#3D5A3E]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2D3436] mb-1.5">代表色</label>
              <div className="flex gap-2 flex-wrap">
                {colorPresets.map((p, i) => (
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
              onClick={onClose}
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
  );
}
