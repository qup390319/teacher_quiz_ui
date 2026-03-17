import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';

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

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { classes, updateClassStudents } = useApp();

  const cls = classes.find((c) => c.id === classId);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', seat: '' });
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [newForm, setNewForm] = useState({ name: '', seat: '' });
  const [newFormError, setNewFormError] = useState('');

  if (!cls) {
    return (
      <TeacherLayout>
        <div className="p-8 text-center text-[#636E72]">找不到此班級</div>
      </TeacherLayout>
    );
  }

  const students = [...cls.students].sort((a, b) => a.seat - b.seat);

  const startEdit = (student) => {
    setEditingId(student.id);
    setEditForm({ name: student.name, seat: String(student.seat) });
  };

  const saveEdit = () => {
    if (!editForm.name.trim() || !editForm.seat) return;
    const updated = cls.students.map((s) =>
      s.id === editingId
        ? { ...s, name: editForm.name.trim(), seat: Number(editForm.seat) }
        : s
    );
    updateClassStudents(cls.id, updated);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const confirmDelete = () => {
    const updated = cls.students.filter((s) => s.id !== deletingStudent.id);
    updateClassStudents(cls.id, updated);
    setDeletingStudent(null);
  };

  const handleAdd = () => {
    setNewFormError('');
    if (!newForm.name.trim()) {
      setNewFormError('請輸入學生姓名');
      return;
    }
    if (!newForm.seat || isNaN(Number(newForm.seat))) {
      setNewFormError('請輸入有效座號');
      return;
    }
    const seatNum = Number(newForm.seat);
    if (cls.students.some((s) => s.seat === seatNum)) {
      setNewFormError(`座號 ${seatNum} 已存在`);
      return;
    }
    const newId = Math.max(0, ...cls.students.map((s) => s.id)) + 1;
    const updated = [...cls.students, { id: newId, name: newForm.name.trim(), seat: seatNum }];
    updateClassStudents(cls.id, updated);
    setNewForm({ name: '', seat: '' });
  };

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* 頁首 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/teacher/classes')}
            className="flex items-center gap-1.5 text-sm text-[#636E72] hover:text-[#2D3436] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回班級管理
          </button>
          <span className="text-[#D5D8DC]">|</span>
          <div>
            <h1 className="text-2xl font-bold text-[#2D3436]">{cls.name}</h1>
            <p className="text-[#636E72] text-sm mt-0.5">{cls.students.length} 位學生</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {/* 表格標題 */}
          <div className="bg-[#C8EAAE] border-b border-[#BDC3C7] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide w-14 text-center">座號</span>
              <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">姓名</span>
            </div>
            <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">操作</span>
          </div>

          {/* 學生列表 */}
          <div className="divide-y divide-[#D5D8DC]">
            {students.map((student) => (
              <div key={student.id} className="px-6 py-3 flex items-center gap-3 hover:bg-[#EEF5E6] transition-colors">
                {editingId === student.id ? (
                  // 編輯模式
                  <>
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
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#C8EAAE] text-[#3D5A3E] border border-[#BDC3C7] rounded-xl hover:bg-[#8FC87A] transition-colors"
                      >
                        儲存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-xs font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  // 一般模式
                  <>
                    <span className="w-14 text-center text-sm font-mono text-[#636E72] flex-shrink-0">{student.seat}</span>
                    <span className="flex-1 text-sm font-medium text-[#2D3436]">{student.name}</span>
                    <div className="flex gap-1.5 ml-auto">
                      <button
                        onClick={() => startEdit(student)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#2E86C1] bg-[#BADDF4] border border-[#BDC3C7] rounded-xl hover:bg-[#A8D2EC] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        編輯
                      </button>
                      <button
                        onClick={() => setDeletingStudent(student)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#E74C5E] bg-[#FAC8CC] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {students.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-[#95A5A6]">
                目前沒有學生，請使用下方表單新增
              </div>
            )}
          </div>

          {/* 新增學生 */}
          <div className="border-t-2 border-[#BDC3C7] bg-[#EEF5E6] px-6 py-4">
            <p className="text-xs font-semibold text-[#636E72] uppercase tracking-wide mb-3">新增學生</p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  placeholder="座號"
                  value={newForm.seat}
                  onChange={(e) => setNewForm((f) => ({ ...f, seat: e.target.value }))}
                  className="w-20 border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#8FC87A] bg-white"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="學生姓名"
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  className="border border-[#BDC3C7] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FC87A] bg-white"
                />
              </div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors flex-shrink-0 mt-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增
              </button>
            </div>
            {newFormError && (
              <p className="text-xs text-[#E74C5E] mt-2">{newFormError}</p>
            )}
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
