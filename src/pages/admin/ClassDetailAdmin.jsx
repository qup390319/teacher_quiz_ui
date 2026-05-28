import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import StudentExcelImport from '../../components/StudentExcelImport';
import { useToast } from '../../context/ToastContext';
import { useAdminClass, useAdminClassTeacher, useAdminAddStudent } from '../../hooks/useAdminClasses';
import { formatSchoolYearLabel, formatSemesterLabel } from '../../utils/schoolYear';

/**
 * /admin/classes/:classId — 班級詳情（管理員視角；spec-02 §3.5、spec-14）。
 *
 * - 顯示班級基本資訊 + 所屬教師
 * - 顯示學生名冊（唯讀；個別帳號管理請走 /admin/users）
 * - 空班時顯示 Excel 匯入元件；有學生時改提示「已有學生，匯入功能停用」
 */

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#6B7280] mb-1">{label}</div>
      <div className="text-sm text-[#1F2937]">{children}</div>
    </div>
  );
}

function AddStudentForm({ classId }) {
  const { toast } = useToast();
  const [seat, setSeat] = useState('');
  const [name, setName] = useState('');
  const [addError, setAddError] = useState('');
  const { mutateAsync: addStudent, isPending } = useAdminAddStudent(classId);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    const seatNum = parseInt(seat, 10);
    if (!seatNum || seatNum <= 0) { setAddError('請輸入有效座號（正整數）'); return; }
    if (!name.trim()) { setAddError('請輸入學生姓名'); return; }
    try {
      await addStudent({ seat: seatNum, name: name.trim() });
      toast.success(`已新增：座號 ${seatNum}，${name.trim()}`);
      setSeat('');
      setName('');
    } catch (err) {
      if (err.code === 'DUPLICATE_SEAT') setAddError(`座號 ${seatNum} 已存在`);
      else if (err.code?.startsWith('ACCOUNT_ALREADY_EXISTS'))
        setAddError(`自動產生的帳號已被佔用：${err.code.split(':')[1]}`);
      else setAddError(err.message || '新增失敗');
    }
  };

  return (
    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
      <div>
        <div className="text-xs text-[#6B7280] mb-1">座號</div>
        <input
          type="number"
          min="1"
          max="99"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
          placeholder="1"
          className="w-20 px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
        />
      </div>
      <div className="flex-1 min-w-32">
        <div className="text-xs text-[#6B7280] mb-1">姓名</div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="學生姓名"
          maxLength={64}
          className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? '新增中…' : '新增'}
      </button>
      {addError && (
        <div className="w-full mt-1 px-3 py-2 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#B91C1C]">
          {addError}
        </div>
      )}
    </form>
  );
}

export default function ClassDetailAdmin() {
  const { classId } = useParams();
  const { toast } = useToast();
  const { data: cls, isLoading, error, refetch } = useAdminClass(classId);
  const { data: teacherInfo } = useAdminClassTeacher(classId);

  if (isLoading) {
    return (
      <AdminLayout title="班級詳情" breadcrumb="Dashboard / 班級總覽 / 載入中">
        <div className="py-12 text-center text-[#6B7280] text-sm">載入中…</div>
      </AdminLayout>
    );
  }
  if (error || !cls) {
    return (
      <AdminLayout title="班級詳情" breadcrumb="Dashboard / 班級總覽 / 找不到">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-[#6B7280] text-sm">
          找不到此班級
        </div>
      </AdminLayout>
    );
  }

  const students = cls.students ?? [];
  const isEmpty = students.length === 0;
  const teacherLabel = teacherInfo?.teacherName
    || teacherInfo?.teacherAccount
    || (cls.teacherId ? `(${cls.teacherId})` : '無');

  return (
    <AdminLayout
      title={cls.name}
      breadcrumb={(
        <span>
          <Link to="/admin/classes" className="hover:text-[#15803D]">班級總覽</Link>
          {' / '}
          <span className="text-[#1F2937]">{cls.name}</span>
        </span>
      )}
    >
      {/* 基本資訊卡 */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-3 h-10 rounded-sm shrink-0"
            style={{ background: cls.color }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[#1F2937]">{cls.name}</h2>
            <div className="text-xs text-[#6B7280] font-mono">{cls.id}</div>
          </div>
          {cls.status === 'archived' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">
              已封存
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="所屬教師">
            {teacherLabel}
            {teacherInfo?.teacherId && (
              <span className="ml-1.5 text-xs text-[#9CA3AF] font-mono">({teacherInfo.teacherId})</span>
            )}
          </Field>
          <Field label="學年 / 學期">
            {formatSchoolYearLabel(cls.schoolYear)} · {formatSemesterLabel(cls.semester)}
          </Field>
          <Field label="年級 / 科目">{cls.grade} · {cls.subject}</Field>
          <Field label="學生數">{cls.studentCount} 位</Field>
        </div>
      </div>

      {/* 學生管理 */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2937] mb-3">學生管理</h3>

        {/* Excel 匯入（僅空班） */}
        {isEmpty ? (
          <StudentExcelImport
            classId={cls.id}
            variant="admin"
            onSuccess={() => { toast.success('已從 Excel 匯入學生名冊'); refetch(); }}
          />
        ) : (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#F4F8F6] text-sm text-[#4B5563]">
            <span className="material-symbols-rounded text-[#9CA3AF] text-base mt-0.5 shrink-0">info</span>
            <span>
              Excel 批次匯入僅在空班時可用。個別帳號管理請至
              {' '}<Link to="/admin/users" className="text-[#15803D] hover:underline">帳號管理</Link>。
            </span>
          </div>
        )}

        {/* 手動新增單一學生（空班 / 非空班均可） */}
        <AddStudentForm classId={cls.id} />
      </div>

      {/* 學生名冊（唯讀） */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[#1F2937]">學生名冊</h3>
          <span className="text-xs text-[#6B7280]">共 {students.length} 位</span>
        </div>
        {students.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#9CA3AF]">尚未匯入或建立任何學生</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F8F6] text-[#6B7280] text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5 font-medium w-20">座號</th>
                  <th className="text-left px-5 py-2.5 font-medium">姓名</th>
                  <th className="text-left px-5 py-2.5 font-medium">帳號</th>
                  <th className="text-left px-5 py-2.5 font-medium">密碼狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F4F8F6]">
                    <td className="px-5 py-2.5 font-mono text-[#1F2937]">{s.seat}</td>
                    <td className="px-5 py-2.5 text-[#1F2937]">{s.name}</td>
                    <td className="px-5 py-2.5 font-mono text-[#4B5563]">{s.id}</td>
                    <td className="px-5 py-2.5">
                      {s.passwordWasDefault ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309]">預設</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">已修改</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
