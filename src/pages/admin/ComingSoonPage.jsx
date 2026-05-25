import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';

/**
 * 通用 placeholder 頁，給尚未開發的管理員後台子頁使用。
 * W4 / W5 / W6 完成後將替換為各自的真實元件。
 */
export default function ComingSoonPage({ title, breadcrumb, wave, description, features }) {
  return (
    <AdminLayout title={title} breadcrumb={breadcrumb}>
      <div className="bg-white rounded-3xl border border-[#E5E7EB] p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-3xl">construction</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309] mb-2">
              {wave} 規劃中
            </div>
            <h2 className="text-xl font-bold text-[#1F2937] mb-2">{title}</h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">{description}</p>
          </div>
        </div>

        {features && features.length > 0 && (
          <div className="border-t border-[#E5E7EB] pt-6">
            <div className="text-xs uppercase tracking-wide text-[#6B7280] mb-3">預計支援</div>
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#1F2937]">
                  <span className="material-symbols-rounded text-base text-[#7DD3A8] mt-0.5">check_circle</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F4F8F6] text-[#1F2937] font-medium text-sm"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            回到後台首頁
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
