import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';

/* 情境考卷派題（規劃中，spec-08 波次 2）
 * 目前為佔位頁；情境派題流程上線後將沿用 AssignmentManagement 的格子佈局，
 * 但資料來源切換為 assignments.filter(a => a.type === 'scenario')。
 */
export default function ScenarioAssignments() {
  const navigate = useNavigate();

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* 頁首 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">派題管理 · 情境考卷</h1>
          <p className="text-[#636E72] mt-1 text-sm">
            將情境治療考卷指派給班級。學生會在學生端「情境治療」區看到任務。
          </p>
        </div>

        {/* 即將推出空狀態 */}
        <div className="bg-white rounded-2xl border border-[#D5D8DC] p-12 flex flex-col items-center justify-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="w-20 h-20 bg-[#EEF5E6] rounded-full flex items-center justify-center mb-5 border border-[#C8EAAE]">
            <svg className="w-10 h-10 text-[#5BA47A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#2D3436] mb-2">情境派題功能即將推出</h2>
          <p className="text-sm text-[#636E72] max-w-md leading-relaxed">
            情境治療考卷的派發機制正在開發中。請先前往「step 2. 情境出題」建立或編輯情境考卷，待功能上線後即可指派給班級。
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate('/teacher/scenarios')}
              className="px-5 py-2.5 bg-[#5BA47A] text-white border border-[#3F8B5E] rounded-2xl text-sm font-semibold hover:bg-[#3F8B5E] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
            >
              前往情境出題
            </button>
            <button
              onClick={() => navigate('/teacher/assignments/diagnosis')}
              className="px-5 py-2.5 bg-white text-[#636E72] border border-[#D5D8DC] rounded-2xl text-sm font-semibold hover:bg-[#EEF5E6] hover:text-[#2D3436] transition-colors"
            >
              返回診斷派題
            </button>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
