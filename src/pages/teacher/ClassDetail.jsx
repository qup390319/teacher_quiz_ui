import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useClass, useUpdateClassStudents } from '../../hooks/useClasses';
import { useResetStudentPassword, useStudent } from '../../hooks/useStudents';
import { ApiError } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

// 刪除確認 Modal
function DeleteModal({ student, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#FAC8CC] border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#E74C5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-[#2D3436]">確認刪除學生？</h3>
            <p className="text-sm text-[#636E72] mt-0.5">此操作無法復原</p>
          </div>
        </div>
        <div className="bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3 mb-5">
          <p className="text-sm text-[#2D3436]">
            座號 <span className="font-bold">{student.seat}</span> · <span className="font-bold">{student.name}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold bg-[#FAC8CC] text-[#E74C5E] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}

/** 內嵌密碼揭露：點擊 eye 才呼叫 GET /students/{id} */
function PasswordCell({ studentId }) {
  const [reveal, setReveal] = useState(false);
  const { data, isFetching, error } = useStudent(studentId, { enabled: reveal });
  const resetMut = useResetStudentPassword();
  const qc = useQueryClient();

  const handleReset = async () => {
    if (!confirm(`確定將 ${studentId} 的密碼重設為預設值（= 帳號）？`)) return;
    try {
      await resetMut.mutateAsync(studentId);
      // 重設後強制再 fetch 一次以更新明文（若已揭露）
      if (reveal) await qc.invalidateQueries({ queryKey: ['students', studentId] });
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 404 ? '學生不存在' : '重設失敗';
      alert(msg);
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
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${data.passwordWasDefault ? 'bg-[#FCF0C2] text-[#B7950B]' : 'bg-[#E8F5E0] text-[#3D5A3E]'}`}>
          {data.passwordWasDefault ? '預設' : '已修改'}
        </span>
      )}
      <button
        onClick={handleReset}
        disabled={resetMut.isPending}
        className="px-2.5 py-1.5 text-xs font-semibold text-[#7A5232] bg-[#FBE9C7] border border-[#D9C58E] rounded-lg hover:bg-[#F4DDA8] disabled:opacity-50"
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
  const { data: cls, isLoading, error } = useClass(classId);
  const updateStudentsMut = useUpdateClassStudents();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', seat: '' });
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [newForm, setNewForm] = useState({ name: '', seat: '' });
  const [newFormError, setNewFormError] = useState('');

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
      alert('儲存失敗，請稍後再試');
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
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">{cls.name}</h1>
            <p className="text-[#636E72] text-sm mt-0.5">
              {cls.studentCount} 位學生
              <span className="ml-2 text-[#95A5A6]">· 預設密碼與帳號相同</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto">
          {/* 表格標題 */}
          <div className="bg-[#C8EAAE] border-b border-[#BDC3C7] px-4 sm:px-6 py-3 grid grid-cols-[56px_minmax(120px,1fr)_140px_240px_140px] min-w-[760px] items-center gap-3">
            <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide text-center">座號</span>
            <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">姓名</span>
            <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">帳號</span>
            <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">密碼</span>
            <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide text-right">操作</span>
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
                        <button onClick={saveEdit} className="px-3 py-1.5 text-xs font-semibold bg-[#C8EAAE] text-[#3D5A3E] border border-[#BDC3C7] rounded-xl hover:bg-[#8FC87A]">儲存</button>
                        <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6]">取消</button>
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
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#2E86C1] bg-[#BADDF4] border border-[#BDC3C7] rounded-xl hover:bg-[#A8D2EC] transition-colors"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeletingStudent(student)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors"
                        >
                          刪除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-[#95A5A6]">
                目前沒有學生，請使用下方表單新增
              </div>
            )}
          </div>
          </div>

          {/* 新增學生 */}
          <div className="border-t-2 border-[#BDC3C7] bg-[#EEF5E6] px-4 sm:px-6 py-4">
            <p className="text-xs font-semibold text-[#636E72] uppercase tracking-wide mb-3">新增學生</p>
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
              <p className="text-xs text-[#E74C5E] mt-2">{newFormError}</p>
            )}
            <p className="text-[11px] text-[#95A5A6] mt-2">
              新增 / 編輯 / 刪除會即時呼叫 PUT /api/classes/{cls.id}/students 整批替換名冊。
            </p>
          </div>
        </div>
      </div>

      {deletingStudent && (
        <DeleteModal
          student={deletingStudent}
          onConfirm={confirmDelete}
          onClose={() => setDeletingStudent(null)}
        />
      )}
    </TeacherLayout>
  );
}
