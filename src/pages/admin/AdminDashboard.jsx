import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';

/**
 * 管理員後台首頁（spec-14）。
 * W1 階段提供統計 donut + 4 個功能入口卡的骨架；
 * 真實資料串接於 W2 ~ W6 完成。
 */

function DonutStat({ label, value, total, color = '#7DD3A8', unit = '位' }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const C = 2 * Math.PI * 40; // r=40
  const dash = (pct / 100) * C;
  return (
    <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 flex items-center justify-between">
      <div>
        <div className="text-sm text-[#6B7280] mb-1">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[#1F2937]">{value}</span>
          <span className="text-sm text-[#6B7280]">/ {total} {unit}</span>
        </div>
        <div className="text-xs text-[#6B7280] mt-2">已啟用比例 {pct}%</div>
      </div>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" stroke="#E5E7EB" strokeWidth="10" fill="none" />
          <circle
            cx="50" cy="50" r="40"
            stroke={color} strokeWidth="10" fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#1F2937]">
          {pct}%
        </div>
      </div>
    </div>
  );
}

function EntryCard({ to, icon, title, desc, status }) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-3xl border border-[#E5E7EB] p-5 hover:border-[#7DD3A8] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
          <span className="material-symbols-rounded text-2xl">{icon}</span>
        </div>
        {status && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309]">
            {status}
          </span>
        )}
      </div>
      <div className="text-base font-semibold text-[#1F2937] mb-1 group-hover:text-[#15803D] transition-colors">
        {title}
      </div>
      <div className="text-sm text-[#6B7280] leading-relaxed">{desc}</div>
    </Link>
  );
}

export default function AdminDashboard() {
  // W1 階段：先 placeholder，W2 後改為真實 API 拉取
  const stats = {
    teachers: { value: 2, total: 2 },
    students: { value: 60, total: 60 },
    classes: { value: 3, total: 3 },
    quizzes: { value: 2, total: 2 },
  };

  return (
    <AdminLayout title="後台首頁" breadcrumb="Dashboard">
      {/* 系統狀態統計 */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1F2937]">系統狀態</h2>
          <span className="text-xs text-[#6B7280]">即時概況</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <DonutStat label="教師帳號" value={stats.teachers.value} total={stats.teachers.total} />
          <DonutStat label="學生帳號" value={stats.students.value} total={stats.students.total} />
          <DonutStat label="班級總數" value={stats.classes.value} total={stats.classes.total} unit="班" />
          <DonutStat label="共用題組" value={stats.quizzes.value} total={stats.quizzes.total} unit="份" />
        </div>
      </section>

      {/* 功能入口 */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1F2937]">管理功能</h2>
          <span className="text-xs text-[#6B7280]">點擊進入</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <EntryCard
            to="/admin/users"
            icon="group"
            title="帳號管理"
            desc="新增教師、停用 / 啟用帳號、重設密碼"
          />
          <EntryCard
            to="/admin/classes"
            icon="school"
            title="班級總覽"
            desc="跨教師檢視所有班級，支援 Excel 匯入學生"
          />
          <EntryCard
            to="/admin/units"
            icon="category"
            title="單元管理"
            desc="新增 / 編輯課程單元（內建 12 個高年級單元）"
          />
          <EntryCard
            to="/admin/knowledge-nodes"
            icon="account_tree"
            title="知識節點"
            desc="畫布編輯：拖曳節點、連線設定先備、編輯迷思概念"
          />
          <EntryCard
            to="/admin/misconceptions"
            icon="psychology"
            title="迷思概念"
            desc="依知識節點集中管理常見迷思：短標、教師 / 學生視角、AI 確認問句"
          />
          <EntryCard
            to="/admin/sample-quizzes"
            icon="library_books"
            title="範例題庫"
            desc="標記教師題組為系統範例；教師挑題時會看到徽章高亮"
          />
        </div>
      </section>
    </AdminLayout>
  );
}
