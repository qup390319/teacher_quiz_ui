import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { defaultQuestions } from '../../data/quizData';
import { Icon } from '../../components/ui/woodKit';

function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const toggle = (e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); };

  return (
    <span className="relative inline-flex" ref={ref}>
      <span
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(e); }}
        className="w-6 h-6 rounded-full bg-[#E8E8E8] hover:bg-[#D5D5D5] inline-flex items-center justify-center transition-colors cursor-pointer"
        aria-label="說明"
      >
        <Icon name="help" className="text-base text-[#636E72]" />
      </span>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 px-3 py-2 rounded-xl bg-[#2D3436] text-white text-xs leading-relaxed shadow-lg">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-[#2D3436] rotate-45" />
        </div>
      )}
    </span>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const {
    setQuizQuestions, setSelectedNodeIds,
    setEditingQuizId, setEditingQuizStatus, setEditingQuizTitle,
  } = useApp();

  const handleUsePreset = () => {
    setQuizQuestions([...defaultQuestions]);
    setSelectedNodeIds(['INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7']);
    setEditingQuizId(null);
    setEditingQuizStatus(null);
    setEditingQuizTitle('');
    navigate('/teacher/quiz/create?step=2');
  };

  const handleNewQuiz = () => {
    setQuizQuestions([]);
    setSelectedNodeIds([]);
    setEditingQuizId(null);
    setEditingQuizStatus(null);
    setEditingQuizTitle('');
    navigate('/teacher/quiz/create');
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">首頁</h1>
          <HelpTip text="完成一次迷思診斷與治療的完整流程：出題 → 派題 → 查看結果" />
        </div>

        {/* 流程一：迷思概念診斷 */}
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1D8] border border-[#F0B962] text-xs font-bold text-[#7A4A18]">
            <Icon name="edit_note" className="text-sm" /> 流程一
          </span>
          <h2 className="text-sm font-bold text-[#2D3436]">迷思概念診斷</h2>
        </div>
        <div className="bg-white border border-[#BDC3C7] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 mb-6 sm:mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-stretch justify-between gap-2">
            {/* 步驟 1 */}
            <button
              onClick={() => navigate('/teacher/quizzes')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#8FC87A] border border-[#BDC3C7] text-white text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#76B563] transition-colors">
                1
              </div>
              <p className="text-sm font-bold text-[#2D3436]">出題管理</p>
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
              <p className="text-sm font-bold text-[#2D3436]">派題管理</p>
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
              <p className="text-sm font-bold text-[#2D3436]">診斷結果</p>
            </button>
          </div>
        </div>

        {/* 流程二：迷思概念治療 */}
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F0E8] border border-[#3F8B5E] text-xs font-bold text-[#2E6B47]">
            <Icon name="psychiatry" className="text-sm" /> 流程二
          </span>
          <h2 className="text-sm font-bold text-[#2D3436]">迷思概念治療</h2>
        </div>
        <div className="bg-white border border-[#BDC3C7] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 mb-6 sm:mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-stretch justify-between gap-2">
            {/* 步驟 1：概念釐清出題 */}
            <button
              onClick={() => navigate('/teacher/scenarios')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#5BA47A] border border-[#3F8B5E] text-white text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#3F8B5E] transition-colors">
                1
              </div>
              <p className="text-sm font-bold text-[#2D3436]">概念釐清出題</p>
            </button>

            <svg className="w-6 h-6 text-[#BDC3C7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* 步驟 2：概念釐清派題 */}
            <button
              onClick={() => navigate('/teacher/assignments/scenarios')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#BADDF4] border border-[#BDC3C7] text-[#2E86C1] text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#A8D2EC] transition-colors">
                2
              </div>
              <p className="text-sm font-bold text-[#2D3436]">概念釐清派題</p>
            </button>

            <svg className="w-6 h-6 text-[#BDC3C7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* 步驟 3：概念釐清對話紀錄 */}
            <button
              onClick={() => navigate('/teacher/treatment-logs')}
              className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#EEF5E6] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#FCF0C2] border border-[#BDC3C7] text-[#B7950B] text-base font-bold flex items-center justify-center mb-3 group-hover:bg-[#F8E89A] transition-colors">
                3
              </div>
              <p className="text-sm font-bold text-[#2D3436]">對話紀錄</p>
            </button>
          </div>
        </div>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
          {/* 一鍵推薦題組 */}
          <button
            onClick={handleUsePreset}
            className="bg-[#8FC87A] border border-[#BDC3C7] rounded-[32px] p-5 text-left hover:bg-[#76B563] transition-all duration-200 group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Icon name="bolt" className="text-2xl text-[#3D5A3E]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-base font-bold text-[#2D3436]">推薦題組</h3>
                  <span className="text-xs font-semibold text-[#3D5A3E] bg-white/50 px-2 py-0.5 rounded-full">5 題</span>
                  <HelpTip text="系統已準備好 5 題範例題組，涵蓋 5 個知識節點，可直接使用或修改後派發" />
                </div>
                <div className="flex items-center text-sm font-semibold text-[#2D3436]">
                  立即套用
                  <Icon name="chevron_right" className="text-lg group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* 快速出題 */}
          <button
            onClick={handleNewQuiz}
            className="bg-[#BADDF4] border border-[#BDC3C7] rounded-[32px] p-5 text-left hover:bg-[#A8D2EC] transition-all duration-200 group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border border-[#BDC3C7] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Icon name="add" className="text-2xl text-[#2E86C1]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-base font-bold text-[#2D3436]">快速出題</h3>
                  <span className="text-xs font-semibold text-[#2E86C1] bg-white/50 px-2 py-0.5 rounded-full">2 步驟</span>
                  <HelpTip text="引導流程：先選擇出題範圍（知識節點），再製作題組內容" />
                </div>
                <div className="flex items-center text-sm font-semibold text-[#2E86C1]">
                  開始出題
                  <Icon name="chevron_right" className="text-lg group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Knowledge Nodes Entry */}
        <button
          onClick={() => navigate('/teacher/knowledge-map')}
          className="w-full bg-white border border-[#BDC3C7] rounded-[32px] p-5 text-left hover:bg-[#EEF5E6] transition-all group shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-base font-bold text-[#2D3436]">知識節點總覽</h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#5DADE2]">
                  <span className="w-2 h-2 rounded-full bg-[#5DADE2] inline-block"></span>
                  {knowledgeNodes.length} 節點
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#E86B76]">
                  <span className="w-2 h-2 rounded-full bg-[#F28B95] inline-block"></span>
                  {knowledgeNodes.reduce((s, n) => s + n.misconceptions.length, 0)} 迷思
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#C9A825]">
                  <span className="w-2 h-2 rounded-full bg-[#F4D03F] inline-block"></span>
                  4 層級
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#3D5A3E] flex-shrink-0 ml-4">
              查看
              <Icon name="chevron_right" className="text-lg group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      </div>
    </TeacherLayout>
  );
}
