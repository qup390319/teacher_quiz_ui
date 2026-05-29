import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useToast } from '../../context/ToastContext';
import {
  useClass, useUpdateClass, useUpdateClassStudents,
  useDeleteClass, useArchiveClass, useUnarchiveClass,
} from '../../hooks/useClasses';
import { useResetStudentPassword, useStudent } from '../../hooks/useStudents';
import { ApiError } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { getSchoolYearOptions, formatSchoolYearLabel, formatSemesterLabel } from '../../utils/schoolYear';
import ClassFormModal from './ClassFormModal';
import DeleteClassModal from './DeleteClassModal';
import { useAssignments } from '../../hooks/useAssignments';
import DeleteStudentModal from './DeleteStudentModal';
import StudentExcelImport from '../../components/StudentExcelImport';

const COLOR_PRESETS = [
  { color: '#C8EAAE', textColor: '#3D5A3E' },
  { color: '#FFE0A3', textColor: '#7A5A2A' },
  { color: '#A8D8EA', textColor: '#2C5A6E' },
  { color: '#F4B6C2', textColor: '#7A3A48' },
  { color: '#D4C5F9', textColor: '#4A3A7A' },
  { color: '#F9E79F', textColor: '#7A5E0A' },
];

function findColorIdx(color) {
  const idx = COLOR_PRESETS.findIndex((p) => p.color.toLowerCase() === (color || '').toLowerCase());
  return idx >= 0 ? idx : 0;
}

/** 內嵌密碼揭露：點擊 eye 才呼叫 GET /students/{id} */
function PasswordCell({ studentId }) {
  const [reveal, setReveal] = useState(false);
  const { data, isFetching, error } = useStudent(studentId, { enabled: reveal });
  const resetMut = useResetStudentPassword();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleReset = async () => {
    if (!confirm(`確定將 ${studentId} 的密碼重設為預設值（= 帳號）？`)) return;
    try {
      await resetMut.mutateAsync(studentId);
      // 重設後強制再 fetch 一次以更新明文（若已揭露）
      if (reveal) await qc.invalidateQueries({ queryKey: ['students', studentId] });
      toast.success('密碼已重設為預設值');
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 404 ? '學生不存在' : '重設失敗';
      toast.error(msg);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <code className="text-sm font-mono text-[#5A3E22] bg-[#FBE9C7] border border-[#D9C58E] px-2 py-1 rounded-md min-w-[88px] inline-block text-center">
        {!reveal ? '••••••' : isFetching ? '…' : error ? '—' : (data?.password ?? '—')}
      </code>
      <button
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? '隱藏密碼' : '顯示密碼'}
        className="w-7 h-7 flex items-center justify-center rounded-full text-[#7A5232] hover:bg-[#FBE9C7]"
        title={reveal ? '隱藏密碼' : '顯示密碼'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {reveal ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3l18 18M10.585 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411M6.108 6.11C4.052 7.508 2.522 9.572 2 12c1.274 4.057 5.064 7 9 7 1.32 0 2.582-.226 3.749-.642" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <circle cx="12" cy="12" r="3" strokeWidth={2} />
            </>
          )}
        </svg>
      </button>
      {reveal && data && (
        <span className={`text-[15px] px-1.5 py-0.5 rounded ${data.passwordWasDefault ? 'bg-[#FCF0C2] text-[#B7950B]' : 'bg-[#E8F5E0] text-[#3D5A3E]'}`}>
          {data.passwordWasDefault ? '預設' : '已修改'}
        </span>
      )}
      <button
        onClick={handleReset}
        disabled={resetMut.isPending}
        className="px-2.5 py-1.5 text-sm font-semibold text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg hover:bg-[#F4DDA8] disabled:opacity-50"
        title="把密碼重設為預設值（= 帳號）"
      >
        {resetMut.isPending ? '處理中…' : '重設密碼'}
      </button>
    </div>
  );
}

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { currentSchoolYear, currentSemester } = useApp();
  const { toast } = useToast();
  const { data: cls, isLoading, error } = useClass(classId);
  const { data: assignments = [] } = useAssignments();
  const updateStudentsMut = useUpdateClassStudents();
  const updateClassMut = useUpdateClass();
  const deleteClassMut = useDeleteClass();
  const archiveClassMut = useArchiveClass();
  const unarchiveClassMut = useUnarchiveClass();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', seat: '' });
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [newForm, setNewForm] = useState({ name: '', seat: '' });
  const [newFormError, setNewFormError] = useState('');

  // Class-level 動作（編輯 / 刪除 班級）
  const [classEditOpen, setClassEditOpen] = useState(false);
  const [classForm, setClassForm] = useState(null);
  const [classFormError, setClassFormError] = useState('');
  const [deletingClass, setDeletingClass] = useState(false);

  const openClassEdit = () => {
    setClassForm({
      name: cls.name, grade: cls.grade, subject: cls.subject,
      note: cls.note ?? '', colorIdx: findColorIdx(cls.color),
      schoolYear: cls.schoolYear, semester: cls.semester,
    });
    setClassFormError('');
    setClassEditOpen(true);
  };

  const closeClassEdit = () => {
    setClassEditOpen(false);
    setClassForm(null);
    setClassFormError('');
  };

  const submitClassEdit = async (e) => {
    e.preventDefault();
    setClassFormError('');
    if (!classForm.name.trim()) { setClassFormError('請輸入班級名稱'); return; }
    const preset = COLOR_PRESETS[classForm.colorIdx];
    try {
      await updateClassMut.mutateAsync({
        classId: cls.id,
        name: classForm.name.trim(), grade: classForm.grade.trim(),
        subject: classForm.subject.trim(),
        color: preset.color, textColor: preset.textColor,
        note: classForm.note.trim() || null,
        schoolYear: classForm.schoolYear, semester: classForm.semester,
      });
      closeClassEdit();
      toast.success('班級資訊已儲存');
    } catch (err) {
      setClassFormError(err?.message || '儲存失敗');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(
      `將「${cls.name}」封存為歷史班級？\n\n` +
      '封存後：班級會從預設清單隱藏，但學生帳號、派題、作答、診斷報告全部保留。',
    )) return;
    try {
      await archiveClassMut.mutateAsync(cls.id);
      toast.success('班級已封存');
    } catch (err) {
      toast.error(err?.message || '封存失敗');
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveClassMut.mutateAsync(cls.id);
      toast.success('班級已還原為任教中');
    } catch (err) {
      toast.error(err?.message || '還原失敗');
    }
  };

  const handleDeleteClass = async () => {
    try {
      await deleteClassMut.mutateAsync(cls.id);
      navigate('/teacher/classes');
    } catch (err) {
      toast.error(err?.message || '刪除失敗');
    }
  };

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="p-8 text-center text-[#636E72]">載入中…</div>
      </TeacherLayout>
    );
  }
  if (error || !cls) {
    return (
      <TeacherLayout>
        <div className="p-8 text-center text-[#636E72]">找不到此班級</div>
      </TeacherLayout>
    );
  }

  const students = [...cls.students].sort((a, b) => a.seat - b.seat);

  const persistRoster = async (newRoster) => {
    try {
      await updateStudentsMut.mutateAsync({
        classId: cls.id,
        students: newRoster.map((s) => ({
          name: s.name, seat: s.seat,
          // existing students keep their account; new ones omit so backend auto-derives
          ...(s.id ? { account: s.id } : {}),
        })),
      });
    } catch (err) {
      console.error('[ClassDetail] save failed', err);
      toast.error('儲存失敗，請稍後再試');
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setEditForm({ name: student.name, seat: String(student.seat) });
  };
  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.seat) return;
    const updated = students.map((s) =>
      s.id === editingId ? { ...s, name: editForm.name.trim(), seat: Number(editForm.seat) } : s
    );
    setEditingId(null);
    await persistRoster(updated);
  };
  const cancelEdit = () => setEditingId(null);

  const confirmDelete = async () => {
    const updated = students.filter((s) => s.id !== deletingStudent.id);
    setDeletingStudent(null);
    await persistRoster(updated);
  };

  const handleAdd = async () => {
    setNewFormError('');
    if (!newForm.name.trim()) { setNewFormError('請輸入學生姓名'); return; }
    if (!newForm.seat || isNaN(Number(newForm.seat))) { setNewFormError('請輸入有效座號'); return; }
    const seatNum = Number(newForm.seat);
    if (students.some((s) => s.seat === seatNum)) {
      setNewFormError(`座號 ${seatNum} 已存在`);
      return;
    }
    const updated = [...students, { name: newForm.name.trim(), seat: seatNum }];
    setNewForm({ name: '', seat: '' });
    await persistRoster(updated);
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/teacher/classes')}
            className="flex items-center gap-1.5 text-sm text-[#636E72] hover:text-[#2D3436] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回班級管理
          </button>
          <span className="text-[#D5D8DC] hidden sm:inline">|</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436] truncate">{cls.name}</h1>
              {cls.status === 'archived' && (
                <span className="text-xs font-semibold text-[#7A5A2A] bg-[#FFE0A3] border border-[#D5A45D] rounded-full px-2 py-0.5">
                  已封存
                </span>
              )}
            </div>
            <p className="text-[#636E72] text-sm mt-0.5">
              {formatSchoolYearLabel(cls.schoolYear)} · {formatSemesterLabel(cls.semester)} · {cls.studentCount} 位學生
            </p>
          </div>

          {/* Class-level 操作 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openClassEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#2D3436] bg-white border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
              title="編輯班級資訊"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編輯班級
            </button>
            {cls.status === 'archived' ? (
              <button
                onClick={handleUnarchive}
                disabled={unarchiveClassMut.isPending}
                className="px-3 py-2 text-sm font-semibold text-[#3D5A3E] bg-[#EEF5E6] border border-[#BDC3C7] rounded-xl hover:bg-[#DCE9D2] transition-colors disabled:opacity-50"
              >
                還原
              </button>
            ) : (
              <button
                onClick={handleArchive}
                disabled={archiveClassMut.isPending}
                className="px-3 py-2 text-sm font-semibold text-[#7A5A2A] bg-white border border-[#BDC3C7] rounded-xl hover:bg-[#FFF6E0] transition-colors disabled:opacity-50"
                title="封存為歷史班級（歷史資料保留）"
              >
                封存
              </button>
            )}
            <button
              onClick={() => setDeletingClass(true)}
              className="p-2 text-[#95A5A6] hover:text-[#E74C5E] hover:bg-[#FDF2F2] border border-[#BDC3C7] rounded-xl transition-colors"
              title="刪除班級"
              aria-label="刪除班級"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {cls.status === 'archived' && (
          <div className="mb-4 bg-[#FFF6E0] border border-[#D5A45D] rounded-xl px-4 py-3 text-sm text-[#7A5A2A]">
            <span className="font-semibold">此為歷史班級。</span>學生名冊與派題作答紀錄完整保留，點上方「還原」可恢復為任教中。
          </div>
        )}

        <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {/* 預設密碼說明（適用於兩種新增方式） */}
          <div className="bg-[#F5F8F2] px-4 sm:px-6 pt-4 pb-1 flex items-center gap-1.5 text-sm text-[#636E72]">
            <span className="material-symbols-rounded text-base text-[#95A5A6]">info</span>
            無論單筆新增或批次匯入，學生預設密碼皆等於帳號。
          </div>
          {/* 新增學生：單筆新增 + 批次匯入（空班時並排顯示） */}
          <div className={`bg-[#F5F8F2] px-4 sm:px-6 pt-2 pb-4 grid gap-4 ${students.length === 0 ? 'md:grid-cols-2' : ''}`}>
            {/* 單筆新增 */}
            <div className="bg-[#EEF5E6] rounded-2xl border border-[#BDC3C7] p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#C8EAAE] text-[#3D5A3E]">
                  <span className="material-symbols-rounded text-xl">person_add</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-0.5 text-[#2D3436]">單筆新增學生</h3>
                  <p className="text-sm text-[#636E72]">輸入座號與姓名，系統會自動產生帳號。</p>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                <input
                  type="number"
                  placeholder="座號"
                  value={newForm.seat}
                  onChange={(e) => setNewForm((f) => ({ ...f, seat: e.target.value }))}
                  className="w-20 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#8FC87A] bg-white"
                />
                <input
                  type="text"
                  placeholder="學生姓名"
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  className="flex-1 min-w-[140px] border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FC87A] bg-white"
                />
                <button
                  onClick={handleAdd}
                  disabled={updateStudentsMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {updateStudentsMut.isPending ? '儲存中…' : '新增'}
                </button>
              </div>
              {newFormError && (
                <p className="text-sm text-[#E74C5E] mt-2">{newFormError}</p>
              )}
            </div>

            {/* 批次匯入（只在空班時顯示） */}
            {students.length === 0 && (
              <StudentExcelImport
                classId={cls.id}
                variant="teacher"
                onSuccess={() => toast.success('已從 Excel 匯入學生名冊')}
              />
            )}
          </div>

          <div className="border-t-2 border-[#BDC3C7] overflow-x-auto">
          {/* 表格標題 */}
          <div className="bg-[#C8EAAE] border-b border-[#BDC3C7] px-4 sm:px-6 py-3 grid grid-cols-[56px_minmax(120px,1fr)_140px_240px_140px] min-w-[760px] items-center gap-3">
            <span className="text-sm font-bold text-[#636E72] uppercase tracking-wide text-center">座號</span>
            <span className="text-sm font-bold text-[#636E72] uppercase tracking-wide">姓名</span>
            <span className="text-sm font-bold text-[#636E72] uppercase tracking-wide">帳號</span>
            <span className="text-sm font-bold text-[#636E72] uppercase tracking-wide">密碼</span>
            <span className="text-sm font-bold text-[#636E72] uppercase tracking-wide text-right">操作</span>
          </div>

          {/* 學生列表 */}
          <div className="divide-y divide-[#D5D8DC] min-w-[760px]">
            {students.map((student) => {
              const isEditing = editingId === student.id;
              return (
                <div
                  key={student.id}
                  className={`px-4 sm:px-6 py-3 ${isEditing ? '' : 'grid grid-cols-[56px_minmax(120px,1fr)_140px_240px_140px] items-center gap-3'} hover:bg-[#EEF5E6] transition-colors`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={editForm.seat}
                        onChange={(e) => setEditForm((f) => ({ ...f, seat: e.target.value }))}
                        className="w-14 border border-[#BDC3C7] rounded-xl px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                      />
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="flex-1 border border-[#BDC3C7] rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <div className="flex gap-1.5 ml-auto">
                        <button onClick={saveEdit} className="px-3 py-1.5 text-sm font-semibold bg-[#C8EAAE] text-[#3D5A3E] border border-[#BDC3C7] rounded-xl hover:bg-[#8FC87A]">儲存</button>
                        <button onClick={cancelEdit} className="px-3 py-1.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6]">取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-center text-sm font-mono text-[#636E72]">{student.seat}</span>
                      <span className="text-sm font-medium text-[#2D3436]">{student.name}</span>
                      <span className="text-sm font-mono text-[#3D5A3E]">{student.id}</span>
                      <PasswordCell studentId={student.id} />
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => startEdit(student)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold text-[#2E86C1] bg-[#BADDF4] border border-[#BDC3C7] rounded-xl hover:bg-[#A8D2EC] transition-colors"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeletingStudent(student)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors"
                        >
                          刪除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

          </div>
          </div>

          {students.length === 0 && (
            <div className="border-t-2 border-[#BDC3C7] px-6 py-10 text-center text-sm text-[#95A5A6]">
              目前沒有學生，請使用上方表單新增，或從 Excel 一次匯入整份名冊。
            </div>
          )}
        </div>
      </div>

      {deletingStudent && (
        <DeleteStudentModal
          student={deletingStudent}
          onConfirm={confirmDelete}
          onClose={() => setDeletingStudent(null)}
        />
      )}

      {classEditOpen && classForm && (
        <ClassFormModal
          form={classForm}
          setForm={setClassForm}
          error={classFormError}
          isEdit={true}
          isPending={updateClassMut.isPending}
          yearOptions={getSchoolYearOptions(5)}
          currentSchoolYear={currentSchoolYear}
          currentSemester={currentSemester}
          colorPresets={COLOR_PRESETS}
          onSubmit={submitClassEdit}
          onClose={closeClassEdit}
        />
      )}

      {deletingClass && (
        <DeleteClassModal
          cls={cls}
          assignmentCount={assignments.filter((a) => a.classId === cls.id).length}
          onConfirm={handleDeleteClass}
          onClose={() => setDeletingClass(false)}
          isPending={deleteClassMut.isPending}
        />
      )}
    </TeacherLayout>
  );
}
