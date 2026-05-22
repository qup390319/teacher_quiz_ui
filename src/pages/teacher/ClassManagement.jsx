import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import SchoolYearFilter from '../../components/SchoolYearFilter';
import ClassListRow from './ClassListRow';
import ClassCardItem from './ClassCardItem';
import ClassFormModal from './ClassFormModal';
import { useClasses, useCreateClass } from '../../hooks/useClasses';
import { useApp } from '../../context/AppContext';
import { getSchoolYearOptions } from '../../utils/schoolYear';
import { useTour } from '../../context/TourContext';
import { Icon } from '../../components/ui/woodKit';

const COLOR_PRESETS = [
  { color: '#C8EAAE', textColor: '#3D5A3E' },
  { color: '#FFE0A3', textColor: '#7A5A2A' },
  { color: '#A8D8EA', textColor: '#2C5A6E' },
  { color: '#F4B6C2', textColor: '#7A3A48' },
  { color: '#D4C5F9', textColor: '#4A3A7A' },
  { color: '#F9E79F', textColor: '#7A5E0A' },
];

const EMPTY_FORM = {
  name: '', grade: '五年級', subject: '自然科學', note: '', colorIdx: 0,
  schoolYear: null, semester: null, // null = 沿用 AppContext 預設
};

export default function ClassManagement() {
  const navigate = useNavigate();
  const { currentSchoolYear, currentSemester } = useApp();
  const { startTour } = useTour();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const createClass = useCreateClass();

  // 本頁只負責「建立班級」與「列出/瀏覽班級」；
  // 編輯 / 封存 / 刪除等 class-level 動作都在 ClassDetail 頁面執行
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  // 顯示模式 — 列表 / 卡片
  const [viewMode, setViewMode] = useState('list');

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, schoolYear: currentSchoolYear, semester: currentSemester });
    setError('');
    setCreateOpen(true);
  };

  const closeModal = () => {
    setCreateOpen(false);
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
    try {
      await createClass.mutateAsync({
        name: form.name.trim(),
        grade: form.grade.trim(),
        subject: form.subject.trim(),
        color: preset.color,
        textColor: preset.textColor,
        note: form.note.trim() || null,
        schoolYear: form.schoolYear,
        semester: form.semester,
      });
      closeModal();
    } catch (err) {
      setError(err?.message || '建立失敗');
    }
  };

  const yearOptions = getSchoolYearOptions(5);

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div data-tour="class-page-header" className="flex items-center justify-between mb-4 sm:mb-6 gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">班級管理</h1>
              <button
                type="button"
                onClick={() => startTour('class-management')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                title="瞭解功能"
              >
                <Icon name="tour" className="text-base" />
                操作導覽
              </button>
            </div>
            <p className="text-[#636E72] mt-1 text-sm">管理各班級的學生名單與相關資訊</p>
          </div>
          <button
            data-tour="class-new-btn"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#3D5A3E] rounded-2xl hover:bg-[#2F4530] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增班級
          </button>
        </div>

        {/* 學年篩選器（與 DashboardLayout 共用 AppContext 狀態，spec-05 §1.5） */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <SchoolYearFilter />
          {/* 顯示模式切換（與儀表板 ClassesPage 一致） */}
          <div className="inline-flex items-center bg-[#EEF5E6] border border-[#C8D6C9] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-[#3D5A3E] shadow-sm' : 'text-[#5A6663] hover:text-[#2D3436]'
              }`}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>view_list</span>
              列表
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'cards' ? 'bg-white text-[#3D5A3E] shadow-sm' : 'text-[#5A6663] hover:text-[#2D3436]'
              }`}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>dashboard</span>
              完整卡片
            </button>
          </div>
        </div>

        {classesLoading && (
          <div className="text-[#636E72] text-sm">載入中…</div>
        )}

        {/* 班級列表（list 模式）— Google Classroom 風，整列可點進詳情頁 */}
        {viewMode === 'list' && classes.length > 0 && (
          <div data-tour="class-list" className="bg-white rounded-2xl border border-[#E1E6E2] shadow-[0_2px_8px_rgba(0,0,0,0.04)] divide-y divide-[#EEF1ED] overflow-hidden">
            {classes.map((cls) => (
              <ClassListRow
                key={cls.id}
                cls={cls}
                isArchived={cls.status === 'archived'}
                onOpen={() => navigate(`/teacher/classes/${cls.id}`)}
              />
            ))}
          </div>
        )}

        {/* 班級卡片（cards 模式）— 同樣只顯示色塊+名稱+副標，整張可點 */}
        {viewMode === 'cards' && classes.length > 0 && (
          <div data-tour="class-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {classes.map((cls) => (
              <ClassCardItem
                key={cls.id}
                cls={cls}
                isArchived={cls.status === 'archived'}
                onOpen={() => navigate(`/teacher/classes/${cls.id}`)}
              />
            ))}
          </div>
        )}

        {!classesLoading && classes.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E1E6E2] p-8 text-center text-sm text-[#95A5A6]">
            目前學年/學期沒有班級。點右上「新增班級」建立第一個班級，或勾選「顯示已封存班級」查閱歷史。
          </div>
        )}
      </div>

      {createOpen && (
        <ClassFormModal
          form={form}
          setForm={setForm}
          error={error}
          isEdit={false}
          isPending={createClass.isPending}
          yearOptions={yearOptions}
          currentSchoolYear={currentSchoolYear}
          currentSemester={currentSemester}
          colorPresets={COLOR_PRESETS}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </TeacherLayout>
  );
}
