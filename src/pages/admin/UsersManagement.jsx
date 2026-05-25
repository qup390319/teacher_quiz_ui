import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import {
  useAdminResetPassword,
  useAdminUsers,
  useDisableUser,
  useEnableUser,
} from '../../hooks/useAdminUsers';
import AdminConfirmModal from './components/AdminConfirmModal';
import NewTeacherModal from './components/NewTeacherModal';
import PasswordRevealButton from './components/PasswordRevealButton';

/**
 * /admin/users — 帳號管理（spec-02 §2、spec-14）。
 * - Tab：教師 / 學生（也支援「全部」）
 * - 搜尋：帳號或姓名（後端模糊比對）
 * - 狀態：全部 / 啟用中 / 已停用
 * - 操作：停用 / 啟用 / 重設密碼 / 顯示明文密碼
 * - 新增按鈕只在 「教師」 tab 顯示（學生由教師端 ClassDetail 管理；W3 整合 Excel 匯入）
 */

const ROLE_TABS = [
  { value: 'teacher', label: '教師' },
  { value: 'student', label: '學生' },
];

const ACTIVE_FILTERS = [
  { value: 'all', label: '全部狀態' },
  { value: 'active', label: '啟用中' },
  { value: 'disabled', label: '已停用' },
];

function StatusPill({ isActive }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
        啟用中
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#B91C1C]">
      已停用
    </span>
  );
}

function RoleTabs({ value, onChange }) {
  return (
    <div className="inline-flex bg-[#F4F8F6] rounded-xl p-1">
      {ROLE_TABS.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-white text-[#15803D] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ActionMenu({ user, onDisable, onEnable, onReset }) {
  const isAdmin = user.role === 'admin';
  return (
    <div className="flex justify-end gap-1.5">
      {user.isActive ? (
        <button
          type="button"
          onClick={() => onDisable(user)}
          disabled={isAdmin}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#FEF3C7] text-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed"
          title={isAdmin ? '管理員帳號不可停用' : '停用此帳號'}
        >
          停用
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onEnable(user)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#DCFCE7] text-[#15803D]"
        >
          啟用
        </button>
      )}
      <button
        type="button"
        onClick={() => onReset(user)}
        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#DBEAFE] text-[#1E40AF]"
        title="把密碼重設為與帳號相同"
      >
        重設密碼
      </button>
    </div>
  );
}

function TeacherTable({ items, onDisable, onEnable, onReset }) {
  if (items.length === 0) {
    return <EmptyState text="查無教師" />;
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-[#F4F8F6] text-[#6B7280] text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">帳號</th>
              <th className="text-left px-5 py-3 font-medium">姓名</th>
              <th className="text-left px-5 py-3 font-medium">班級</th>
              <th className="text-left px-5 py-3 font-medium">學生</th>
              <th className="text-left px-5 py-3 font-medium">密碼</th>
              <th className="text-left px-5 py-3 font-medium">狀態</th>
              <th className="text-right px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {items.map((u) => (
              <tr key={u.id} className={`hover:bg-[#F4F8F6] ${u.isActive ? '' : 'opacity-60'}`}>
                <td className="px-5 py-3 font-mono text-[#1F2937]">{u.account}</td>
                <td className="px-5 py-3 text-[#1F2937]">{u.name || '—'}</td>
                <td className="px-5 py-3 text-[#4B5563]">{u.classCount ?? 0} 班</td>
                <td className="px-5 py-3 text-[#4B5563]">{u.studentCount ?? 0} 位</td>
                <td className="px-5 py-3"><PasswordRevealButton userId={u.id} /></td>
                <td className="px-5 py-3"><StatusPill isActive={u.isActive} /></td>
                <td className="px-5 py-3"><ActionMenu user={u} onDisable={onDisable} onEnable={onEnable} onReset={onReset} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentTable({ items, onDisable, onEnable, onReset }) {
  if (items.length === 0) {
    return <EmptyState text="查無學生" />;
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-[#F4F8F6] text-[#6B7280] text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">帳號</th>
              <th className="text-left px-5 py-3 font-medium">姓名</th>
              <th className="text-left px-5 py-3 font-medium">班級</th>
              <th className="text-left px-5 py-3 font-medium">座號</th>
              <th className="text-left px-5 py-3 font-medium">密碼</th>
              <th className="text-left px-5 py-3 font-medium">狀態</th>
              <th className="text-right px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {items.map((u) => (
              <tr key={u.id} className={`hover:bg-[#F4F8F6] ${u.isActive ? '' : 'opacity-60'}`}>
                <td className="px-5 py-3 font-mono text-[#1F2937]">{u.account}</td>
                <td className="px-5 py-3 text-[#1F2937]">{u.name || '—'}</td>
                <td className="px-5 py-3 text-[#4B5563]">{u.className || '—'}</td>
                <td className="px-5 py-3 text-[#4B5563]">{u.seat ?? '—'}</td>
                <td className="px-5 py-3"><PasswordRevealButton userId={u.id} /></td>
                <td className="px-5 py-3"><StatusPill isActive={u.isActive} /></td>
                <td className="px-5 py-3"><ActionMenu user={u} onDisable={onDisable} onEnable={onEnable} onReset={onReset} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-[#6B7280] text-sm">
      {text}
    </div>
  );
}

export default function UsersManagement() {
  const [role, setRole] = useState('teacher');
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const [showNewTeacher, setShowNewTeacher] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, user }
  const { toast } = useToast();

  const queryParams = useMemo(() => ({ role, q: q.trim(), active }), [role, q, active]);
  const { data, isLoading, error } = useAdminUsers(queryParams);

  const disableMut = useDisableUser();
  const enableMut = useEnableUser();
  const resetMut = useAdminResetPassword();

  const items = data?.items ?? [];

  const closeConfirm = () => setConfirmAction(null);

  const performConfirm = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    try {
      if (type === 'disable') {
        await disableMut.mutateAsync(user.id);
        toast.success(`已停用 ${user.account}`);
      } else if (type === 'enable') {
        await enableMut.mutateAsync(user.id);
        toast.success(`已啟用 ${user.account}`);
      } else if (type === 'reset') {
        const res = await resetMut.mutateAsync(user.id);
        toast.success(`已重設 ${user.account} 的密碼為「${res.password}」`);
      }
      closeConfirm();
    } catch (err) {
      toast.error(err?.message || '操作失敗');
    }
  };

  const confirmMeta = (() => {
    if (!confirmAction) return null;
    const { type, user } = confirmAction;
    if (type === 'disable') {
      return {
        title: `停用帳號「${user.account}」`,
        message: `停用後此帳號將無法登入，但相關歷史資料（班級 / 題組 / 派題 / 作答）完整保留。\n你可以隨時再次啟用。`,
        confirmLabel: '確認停用',
        variant: 'danger',
      };
    }
    if (type === 'enable') {
      return {
        title: `啟用帳號「${user.account}」`,
        message: '啟用後此帳號可立即登入。',
        confirmLabel: '確認啟用',
        variant: 'primary',
      };
    }
    return {
      title: `重設「${user.account}」的密碼`,
      message: `重設後密碼會回到預設值（與帳號相同：${user.account}）。\n使用者下次登入後可自行修改。`,
      confirmLabel: '確認重設',
      variant: 'primary',
    };
  })();

  return (
    <AdminLayout title="帳號管理" breadcrumb="Dashboard / 帳號管理">
      {/* 工具列 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <RoleTabs value={role} onChange={setRole} />

        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋帳號或姓名"
            className="pl-9 pr-3 py-2 w-56 rounded-xl border border-[#E5E7EB] bg-white text-sm
                       placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
          />
        </div>

        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#7DD3A8] focus:border-transparent"
        >
          {ACTIVE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <div className="flex-1" />

        {role === 'teacher' && (
          <button
            type="button"
            onClick={() => setShowNewTeacher(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold transition-colors"
          >
            <span className="material-symbols-rounded text-lg">add</span>
            新增教師
          </button>
        )}
      </div>

      {/* 計數 */}
      <div className="text-sm text-[#6B7280] mb-3">
        {isLoading ? '載入中…' : error ? '載入失敗' : `共 ${items.length} 筆`}
      </div>

      {/* 表格 */}
      {!isLoading && !error && (
        role === 'teacher'
          ? <TeacherTable items={items} onDisable={(u) => setConfirmAction({ type: 'disable', user: u })} onEnable={(u) => setConfirmAction({ type: 'enable', user: u })} onReset={(u) => setConfirmAction({ type: 'reset', user: u })} />
          : <StudentTable items={items} onDisable={(u) => setConfirmAction({ type: 'disable', user: u })} onEnable={(u) => setConfirmAction({ type: 'enable', user: u })} onReset={(u) => setConfirmAction({ type: 'reset', user: u })} />
      )}

      {showNewTeacher && (
        <NewTeacherModal
          onClose={() => setShowNewTeacher(false)}
          onCreated={(u) => toast.success(`已新增教師「${u.account}」`)}
        />
      )}

      {confirmAction && confirmMeta && (
        <AdminConfirmModal
          {...confirmMeta}
          isPending={disableMut.isPending || enableMut.isPending || resetMut.isPending}
          onConfirm={performConfirm}
          onClose={closeConfirm}
        />
      )}
    </AdminLayout>
  );
}
