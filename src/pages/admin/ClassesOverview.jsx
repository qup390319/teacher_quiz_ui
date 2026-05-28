import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAdminClasses } from '../../hooks/useAdminClasses';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { formatSchoolYearLabel, formatSemesterLabel } from '../../utils/schoolYear';
import AdminNewClassModal from './components/AdminNewClassModal';

/**
 * /admin/classes — 班級總覽（spec-02 §3.4、spec-14）。
 * - 跨教師列表，支援篩選：教師 / 學年 / 學期 / 狀態
 * - 點任一列進入 `/admin/classes/:id` 詳情頁
 */

function StatusPill({ status }) {
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">
        已封存
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
      使用中
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-[#6B7280] text-sm">
      {text}
    </div>
  );
}

export default function ClassesOverview() {
  const [teacherId, setTeacherId] = useState('');
  const [classStatus, setClassStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [showNewClassModal, setShowNewClassModal] = useState(false);

  const { data, isLoading, error } = useAdminClasses({
    teacherId: teacherId || undefined,
    status: classStatus,
  });
  // For teacher filter dropdown
  const { data: teachersList } = useAdminUsers({ role: 'teacher' });

  const items = useMemo(() => {
    const raw = data ?? [];
    if (!keyword.trim()) return raw;
    const k = keyword.trim().toLowerCase();
    return raw.filter((c) =>
      (c.name || '').toLowerCase().includes(k) ||
      (c.id || '').toLowerCase().includes(k),
    );
  }, [data, keyword]);

  const teachers = useMemo(() => teachersList?.items ?? [], [teachersList]);
  const teacherNameById = useMemo(() => {
    const map = new Map();
    teachers.forEach((t) => map.set(t.id, t.name || t.account));
    return map;
  }, [teachers]);

  return (
    <AdminLayout title="班級總覽" breadcrumb="Dashboard / 班級總覽">
      {showNewClassModal && (
        <AdminNewClassModal onClose={() => setShowNewClassModal(false)} />
      )}

      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜尋班級名或 ID"
            className="pl-9 pr-3 py-2 w-56 rounded-xl border border-[#E5E7EB] bg-white text-sm
                       placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
          />
        </div>

        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
        >
          <option value="">所有教師</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name || t.account} ({t.account})</option>
          ))}
        </select>

        <select
          value={classStatus}
          onChange={(e) => setClassStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
        >
          <option value="all">全部狀態</option>
          <option value="active">使用中</option>
          <option value="archived">已封存</option>
        </select>

        <div className="flex-1" />
        <span className="text-sm text-[#6B7280]">
          {isLoading ? '載入中…' : error ? '載入失敗' : `共 ${items.length} 班`}
        </span>
        <button
          type="button"
          onClick={() => setShowNewClassModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E]
                     text-white font-semibold text-sm transition-colors"
        >
          <span className="material-symbols-rounded text-base">add</span>
          新增班級
        </button>
      </div>

      {/* 表格 */}
      {!isLoading && !error && (
        items.length === 0 ? (
          <EmptyState text="目前沒有班級資料" />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-[#F4F8F6] text-[#6B7280] text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">班級</th>
                    <th className="text-left px-5 py-3 font-medium">所屬教師</th>
                    <th className="text-left px-5 py-3 font-medium">學年 / 學期</th>
                    <th className="text-left px-5 py-3 font-medium">學生數</th>
                    <th className="text-left px-5 py-3 font-medium">狀態</th>
                    <th className="text-right px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F4F8F6]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-6 rounded-sm shrink-0"
                            style={{ background: c.color }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-[#1F2937]">{c.name}</div>
                            <div className="text-xs text-[#6B7280] font-mono">{c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#4B5563]">
                        {teacherNameById.get(c.teacherId) || (c.teacherId ? <span className="font-mono">{c.teacherId}</span> : <span className="text-[#9CA3AF]">—</span>)}
                      </td>
                      <td className="px-5 py-3 text-[#4B5563]">
                        {formatSchoolYearLabel(c.schoolYear)} · {formatSemesterLabel(c.semester)}
                      </td>
                      <td className="px-5 py-3 text-[#4B5563]">{c.studentCount} 位</td>
                      <td className="px-5 py-3"><StatusPill status={c.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/admin/classes/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#DCFCE7] text-[#15803D]"
                        >
                          詳情 <span className="material-symbols-rounded text-sm">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </AdminLayout>
  );
}
