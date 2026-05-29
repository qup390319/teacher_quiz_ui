import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import TeacherLayout from '../../components/TeacherLayout';
import SchoolYearFilter from '../../components/SchoolYearFilter';
import ClassCategorySection from './ClassCategorySection';
import ClassFormModal from './ClassFormModal';
import { useClasses, useCreateClass, useUpdateClass } from '../../hooks/useClasses';
import {
  useClassCategories,
  useCreateClassCategory,
  useRenameClassCategory,
  useDeleteClassCategory,
} from '../../hooks/useClassCategories';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
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

const LEGACY_KEY_PREFIX = 'teacher_class_categories_v1';

/**
 * 一次性把 localStorage 內舊版分類資料搬到後端。
 * 之前版本以 localStorage 暫存，正式化後若教師曾使用過舊版需自動遷移。
 * 遷移完成後清掉 localStorage key，避免日後重跑。
 */
async function migrateLegacyCategories({ teacherId, qc }) {
  const oldKey = `${LEGACY_KEY_PREFIX}:${teacherId ?? 'anon'}`;
  const raw = window.localStorage.getItem(oldKey);
  if (!raw) return;

  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    window.localStorage.removeItem(oldKey);
    return;
  }
  const oldCats = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const oldMap = parsed?.classToCategory && typeof parsed.classToCategory === 'object'
    ? parsed.classToCategory : {};
  if (oldCats.length === 0 && Object.keys(oldMap).length === 0) {
    window.localStorage.removeItem(oldKey);
    return;
  }

  // 取得後端目前的分類，重名直接重用
  const serverCats = await api.get('/class-categories');
  const byName = new Map(serverCats.map((c) => [c.name, c]));

  const idMap = {};
  const sorted = [...oldCats].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const oc of sorted) {
    const name = String(oc?.name ?? '').trim();
    if (!name || !oc?.id) continue;
    const existing = byName.get(name);
    if (existing) {
      idMap[oc.id] = existing.id;
      continue;
    }
    try {
      const created = await api.post('/class-categories', { name });
      idMap[oc.id] = created.id;
      byName.set(name, created);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_NAME') {
        // race：剛好後端同名出現，再抓一次
        const refresh = await api.get('/class-categories');
        const hit = refresh.find((c) => c.name === name);
        if (hit) idMap[oc.id] = hit.id;
      } else {
        console.warn('[migration] create category failed', name, err);
      }
    }
  }

  for (const [classId, oldCatId] of Object.entries(oldMap)) {
    const newCatId = idMap[oldCatId];
    if (!newCatId) continue;
    try {
      await api.patch(`/classes/${classId}`, { categoryId: newCatId });
    } catch (err) {
      console.warn('[migration] move class failed', classId, err);
    }
  }

  window.localStorage.removeItem(oldKey);
  qc.invalidateQueries({ queryKey: ['class-categories'] });
  qc.invalidateQueries({ queryKey: ['classes'] });
}

export default function ClassManagement() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentSchoolYear, currentSemester } = useApp();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { startTour } = useTour();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();

  // 本頁只負責「建立班級」與「列出/瀏覽班級」；
  // 編輯 / 封存 / 刪除等 class-level 動作都在 ClassDetail 頁面執行
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  // 「新增分類」modal 狀態
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');

  // 班級分類（後端版，spec-04 §5.1）
  const { data: categories = [] } = useClassCategories();
  const createCategoryMut = useCreateClassCategory();
  const renameCategoryMut = useRenameClassCategory();
  const deleteCategoryMut = useDeleteClassCategory();

  // 舊版 localStorage 資料 → 一次性遷移到後端
  useEffect(() => {
    if (!currentUser) return;
    migrateLegacyCategories({ teacherId: currentUser.id, qc })
      .catch((err) => console.warn('[class-categories] legacy migration failed', err));
  }, [currentUser, qc]);

  // 依分類分組（含「未分類」）
  const grouped = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, []]));
    const uncategorized = [];
    classes.forEach((cls) => {
      const catId = cls.categoryId;
      if (catId && map.has(catId)) {
        map.get(catId).push(cls);
      } else {
        uncategorized.push(cls);
      }
    });
    return {
      sections: categories.map((c) => ({ category: c, classes: map.get(c.id) ?? [] })),
      uncategorized,
    };
  }, [classes, categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const getCategoryIdForClass = (classId) => {
    const c = classes.find((x) => x.id === classId);
    return c?.categoryId ?? null;
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const classId = active.id;
    let targetCategoryId;
    const overType = over.data.current?.type;
    if (overType === 'category') {
      targetCategoryId = over.data.current.categoryId ?? null;
    } else if (overType === 'class') {
      targetCategoryId = getCategoryIdForClass(over.id);
    } else {
      return;
    }
    if (targetCategoryId === getCategoryIdForClass(classId)) return;
    updateClass.mutate({ classId, categoryId: targetCategoryId });
  };

  const openCategoryModal = () => {
    setCategoryDraft('');
    setCategoryModalOpen(true);
  };

  const submitNewCategory = (e) => {
    e?.preventDefault();
    const trimmed = categoryDraft.trim();
    if (!trimmed) return;
    createCategoryMut.mutate(trimmed, {
      onSuccess: () => {
        toast.success(`已新增分類「${trimmed}」`);
        setCategoryModalOpen(false);
        setCategoryDraft('');
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'DUPLICATE_NAME') {
          toast.error(`分類「${trimmed}」已經存在，請換個名稱`);
        } else {
          toast.error(`新增分類失敗：${err?.message ?? '未知錯誤'}`);
        }
      },
    });
  };

  const handleRenameCategory = (id, newName) => {
    renameCategoryMut.mutate({ id, name: newName }, {
      onSuccess: () => toast.success('分類已重新命名'),
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'DUPLICATE_NAME') {
          toast.error(`分類「${newName}」已經存在，請換個名稱`);
        } else {
          toast.error(`改名失敗：${err?.message ?? '未知錯誤'}`);
        }
      },
    });
  };

  const handleDeleteCategory = (id) => {
    deleteCategoryMut.mutate(id, {
      onSuccess: () => toast.success('分類已刪除，該分類下的班級已回到「未分類」'),
      onError: (err) => toast.error(`刪除失敗：${err?.message ?? '未知錯誤'}`),
    });
  };

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
          <button
            type="button"
            onClick={openCategoryModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-white border border-[#C8D6C9] text-[#3D5A3E] hover:bg-[#EEF5E6] transition-colors"
            title="新增分類"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>create_new_folder</span>
            新增分類
          </button>
        </div>

        {classesLoading && (
          <div className="text-[#636E72] text-sm">載入中…</div>
        )}

        {/* 班級分類視圖 */}
        {classes.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div data-tour="class-list" className="space-y-4">
              {grouped.sections.map(({ category, classes: catClasses }) => (
                <ClassCategorySection
                  key={category.id}
                  category={category}
                  classes={catClasses}
                  onOpenClass={(cls) => navigate(`/teacher/classes/${cls.id}`)}
                  onRename={handleRenameCategory}
                  onDelete={handleDeleteCategory}
                />
              ))}
              <ClassCategorySection
                key="__uncategorized__"
                category={{ id: null, name: '未分類' }}
                classes={grouped.uncategorized}
                onOpenClass={(cls) => navigate(`/teacher/classes/${cls.id}`)}
              />
            </div>
            <p className="text-xs text-[#95A5A6] mt-3">
              拖曳班級卡片可移動到其他分類。分類資料儲存在帳號下，換裝置仍會保留。
            </p>
          </DndContext>
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

      {/* 新增分類 modal（取代 window.prompt，iframe 沙箱中也能用） */}
      {categoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !createCategoryMut.isPending && setCategoryModalOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitNewCategory}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
          >
            <h2 className="text-lg font-bold text-[#2D3436] mb-1">新增分類</h2>
            <p className="text-sm text-[#636E72] mb-4">輸入分類名稱（例：五年級主帶、社團班）</p>
            <input
              autoFocus
              type="text"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              maxLength={64}
              placeholder="分類名稱"
              className="w-full border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FC87A] bg-white"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                disabled={createCategoryMut.isPending}
                className="px-4 py-2 text-sm font-medium border border-[#BDC3C7] text-[#636E72] rounded-xl hover:bg-[#EEF5E6] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!categoryDraft.trim() || createCategoryMut.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#3D5A3E] rounded-xl hover:bg-[#2F4530] disabled:opacity-50"
              >
                {createCategoryMut.isPending ? '建立中…' : '建立'}
              </button>
            </div>
          </form>
        </div>
      )}
    </TeacherLayout>
  );
}
