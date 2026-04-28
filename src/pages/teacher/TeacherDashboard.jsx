import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { defaultQuestions } from '../../data/quizData';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { setQuizQuestions, setSelectedNodeIds } = useApp();

  const handleUsePreset = () => {
    setQuizQuestions([...defaultQuestions]);
    setSelectedNodeIds(['INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7']);
    navigate('/teacher/quiz/create?step=2');
  };

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2D3436]">首頁</h1>
          <p className="text-[#636E72] mt-1">歡迎使用！以下是完成一次迷思診斷的三大步驟</p>
        </div>

        {/* 主流程導航條 */}
        <div className="bg-white border border-[#BDC3C7] rounded-[32px] p-6 mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-2">
            {/* 步驟 1 */}
            <button
              onClick={() => navigate('/teacher/quizzes')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#8FC87A] border border-[#BDC3C7] text-white text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#76B563] transition-colors">
                1
              </div>
              <p className="text-sm font-bold text-[#2D3436] mb-1">出題管理</p>
              <p className="text-xs text-[#636E72]">建立考卷</p>
            </button>

            {/* 箭頭 */}
            <svg className="w-6 h-6 text-[#BDC3C7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* 步驟 2 */}
            <button
              onClick={() => navigate('/teacher/assignments')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#BADDF4] border border-[#BDC3C7] text-[#2E86C1] text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#A8D2EC] transition-colors">
                2
              </div>
              <p className="text-sm font-bold text-[#2D3436] mb-1">派題管理</p>
              <p className="text-xs text-[#636E72]">發給班級</p>
            </button>

            {/* 箭頭 */}
            <svg className="w-6 h-6 text-[#BDC3C7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* 步驟 3 */}
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#FCF0C2] border border-[#BDC3C7] text-[#B7950B] text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#F8E89A] transition-colors">
                3
              </div>
              <p className="text-sm font-bold text-[#2D3436] mb-1">診斷結果</p>
              <p className="text-xs text-[#636E72]">查看報告</p>
            </button>
          </div>
        </div>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
          {/* 一鍵推薦題組 */}
          <button
            onClick={handleUsePreset}
            className="bg-[#8FC87A] border border-[#BDC3C7] rounded-[32px] p-6 text-left hover:bg-[#76B563] transition-all duration-200 group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          >
            <div className="w-12 h-12 bg-white border border-[#BDC3C7] rounded-2xl flex items-center justify-center mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <svg className="w-6 h-6 text-[#3D5A3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-[#3D5A3E] uppercase mb-1">推薦</div>
            <h3 className="text-lg font-bold text-[#2D3436] mb-2">一鍵使用推薦題組</h3>
            <p className="text-sm text-[#3D5A3E] leading-relaxed mb-4">
              系統已準備好 5 題範例考卷，可直接使用或修改
            </p>
            <div className="flex items-center text-sm font-semibold text-[#2D3436]">
              立即套用 · 直接編輯
              <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* 快速出題 */}
          <button
            onClick={() => navigate('/teacher/quiz/create')}
            className="bg-[#BADDF4] border border-[#BDC3C7] rounded-[32px] p-6 text-left hover:bg-[#A8D2EC] transition-all duration-200 group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          >
            <div className="w-12 h-12 bg-white border border-[#BDC3C7] rounded-2xl flex items-center justify-center mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <svg className="w-6 h-6 text-[#2E86C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-[#636E72] uppercase mb-1">自訂出題</div>
            <h3 className="text-lg font-bold text-[#2D3436] mb-2">快速出題</h3>
            <p className="text-sm text-[#636E72] leading-relaxed mb-4">
              2 步引導流程：決定出題範圍 → 製作考卷
            </p>
            <div className="flex items-center text-sm font-semibold text-[#2E86C1]">
              開始出題
              <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

        </div>

        {/* Knowledge Nodes Entry */}
        <button
          onClick={() => navigate('/teacher/knowledge-map')}
          className="w-full bg-white border border-[#BDC3C7] rounded-[32px] p-6 text-left hover:bg-[#EEF5E6] transition-all group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2D3436] mb-1">知識節點與迷思概念總覽</h2>
              <p className="text-sm text-[#636E72]">水溶液單元 · 因材網對應節點 INe-II-3-01 至 INe-Ⅲ-5-7</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-sm text-[#636E72]">
                  <span className="w-2 h-2 rounded-full bg-[#5DADE2] inline-block"></span>
                  {knowledgeNodes.length} 個知識節點
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[#636E72]">
                  <span className="w-2 h-2 rounded-full bg-[#F28B95] inline-block"></span>
                  {knowledgeNodes.reduce((s, n) => s + n.misconceptions.length, 0)} 個迷思概念
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[#636E72]">
                  <span className="w-2 h-2 rounded-full bg-[#F4D03F] inline-block"></span>
                  4 個學習層級
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#3D5A3E] flex-shrink-0 ml-6">
              查看完整總覽
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </TeacherLayout>
  );
}
