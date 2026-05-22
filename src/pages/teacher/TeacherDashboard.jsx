import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import AIBadge from '../../components/AIBadge';
import { useTeacherStageStatus } from '../../hooks/useTeacherStageStatus';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { Icon } from '../../components/ui/woodKit';
import { useTour } from '../../context/TourContext';

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
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 px-3 py-2 rounded-xl bg-[#2D3436] text-white text-sm leading-relaxed shadow-lg">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-[#2D3436] rotate-45" />
        </div>
      )}
    </span>
  );
}

// 與 sidebar 對齊的步驟色票（綠→青→藍 for 流程一；紫紅漸層 for 流程二）
const STEP_COLORS = {
  green:  { circle: 'bg-[#5C8A2E] text-white', ring: '#5C8A2E', tint: '#EEF5E6' },   // ① 出題
  teal:   { circle: 'bg-[#1F7A8C] text-white', ring: '#1F7A8C', tint: '#E1F0F4' },   // ② 派題
  blue:   { circle: 'bg-[#2E86C1] text-white', ring: '#2E86C1', tint: '#D6EAF8' },   // ③ 看結果
  purple1:{ circle: 'bg-[#C77DBA] text-white', ring: '#8A3F76', tint: '#F2DDED' },   // ④-1 釐清出題
  purple2:{ circle: 'bg-[#A75696] text-white', ring: '#8A3F76', tint: '#E5C2DA' },   // ④-2 釐清派題
  purple3:{ circle: 'bg-[#8A3F76] text-white', ring: '#502047', tint: '#D2A6C5' },   // ④-3 釐清對話
};

// 單一流程步驟卡
function FlowStep({ stepIdx, label, color, to, statusLabel, statusReady, isNext, ai, onNavigate, tourId }) {
  const c = STEP_COLORS[color];
  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      data-tour={tourId}
      className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl hover:bg-[#FAFBF9] transition-all group relative"
      style={isNext ? {
        backgroundColor: c.tint,
        boxShadow: `0 0 0 2px ${c.ring}55, 0 2px 12px ${c.ring}22`,
      } : undefined}
    >
      {isNext && (
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-px rounded-full text-[15px] font-bold text-white whitespace-nowrap shadow-sm"
          style={{ background: c.ring }}
        >
          建議下一步
        </span>
      )}
      <div className={`w-10 h-10 rounded-full ${c.circle} text-base font-bold flex items-center justify-center mb-2 transition-transform group-hover:scale-110`}>
        {stepIdx}
      </div>
      <div className="flex items-center gap-1 flex-wrap justify-center mb-1">
        <p className="text-sm font-bold text-[#2D3436]">{label}</p>
        {ai && <AIBadge description={ai} size="xs" showPill={false} />}
      </div>
      {statusLabel && statusLabel !== '—' && (
        <p
          className="text-[15px] font-semibold"
          style={{ color: statusReady ? c.ring : '#95A5A6' }}
        >
          {statusLabel}
        </p>
      )}
    </button>
  );
}

function FlowArrow() {
  return (
    <svg className="w-6 h-6 text-[#BDC3C7] flex-shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const WELCOME_DISMISSED_KEY = 'scilens-teacher-welcome-dismissed';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const stage = useTeacherStageStatus();
  const { startTour } = useTour();

  // 首次使用引導 banner（localStorage 記住 dismiss）
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem(WELCOME_DISMISSED_KEY) !== '1'; }
    catch { return true; }
  });
  const dismissWelcome = () => {
    setShowWelcome(false);
    try { localStorage.setItem(WELCOME_DISMISSED_KEY, '1'); } catch { /* ignore */ }
  };
  const reopenWelcome = () => {
    setShowWelcome(true);
    try { localStorage.removeItem(WELCOME_DISMISSED_KEY); } catch { /* ignore */ }
  };

  // 流程二的子狀態（仍掛 remediation flow，但分配給不同步驟）
  const remediationStep1Status = stage.remediation.count > 0
    ? `${stage.remediation.count} 份釐清題組`
    : (stage.assign.ready ? '尚未建立' : '—');
  const remediationStep2Status = stage.remediation.assignCount > 0
    ? `${stage.remediation.assignCount} 班已派`
    : (stage.remediation.ready ? '尚未派發' : '—');
  const remediationStep3Status = stage.remediation.assignCount > 0 ? '可查看' : '等待派發';

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* Page Header */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">首頁</h1>
          <HelpTip text="完成一次迷思診斷與概念釐清的完整流程：出題 → 派題 → 看結果 → 釐清補救" />

          {/* 右側操作區：操作導覽（永遠可用）+ 重新開啟歡迎卡（只在已關閉時顯示） */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => startTour('home')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              title="逐步介紹首頁與側邊欄對應的功能"
            >
              <Icon name="tour" className="text-base" />
              操作導覽
            </button>
            {!showWelcome && (
              <button
                type="button"
                onClick={reopenWelcome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#D4A244] text-[#7A4A18] text-sm font-semibold hover:bg-[#FBE9C7] transition-colors"
                title="重新顯示歡迎引導"
              >
                <Icon name="help_outline" className="text-sm" />
                重新開啟歡迎卡
              </button>
            )}
          </div>
        </div>

        {/* 首次使用引導 banner — 強調「依序操作」，不提供跳過流程的快速鍵 */}
        {showWelcome && (
          <div className="mb-6 bg-gradient-to-r from-[#FFF8E7] to-[#FBE9C7] border-2 border-[#F0B962] rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(208,139,46,0.18)] relative">
            <button
              type="button"
              onClick={dismissWelcome}
              className="absolute top-2 right-2 p-1 rounded-lg text-[#7A4A18] hover:bg-[#F4D58C] transition-colors"
              aria-label="關閉歡迎訊息"
            >
              <Icon name="close" className="text-lg" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="relative w-10 h-10 rounded-full bg-[#F0B962] text-white flex items-center justify-center flex-shrink-0 animate-pulse-soft">
                <span className="absolute inset-0 rounded-full bg-[#F0B962] opacity-50 animate-ping" aria-hidden="true" />
                <span className="relative animate-wave">
                  <Icon name="waving_hand" className="text-xl" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#5C3712] mb-1">歡迎使用 SciLens 教師後台！</h3>
                <p className="text-sm text-[#7A4A18] leading-relaxed mb-3">
                  系統已為您準備好<span className="font-bold">示範資料</span>（題組、班級、學生作答）。
                  請<span className="font-bold">依照流程順序操作</span>，由 ① 開始：
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <ul className="text-sm text-[#7A4A18] space-y-1 flex-1 min-w-0">
                    <li className="flex items-center gap-2">
                      <span className="text-[#5C8A2E] font-bold text-xl leading-none">①</span>
                      <span><span className="font-semibold">出診斷題</span>：建立或檢視診斷題組</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#1F7A8C] font-bold text-xl leading-none">②</span>
                      <span><span className="font-semibold">派題給班級</span>：把題組指派給班級</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#2E86C1] font-bold text-xl leading-none">③</span>
                      <span><span className="font-semibold">看診斷結果</span>：學生作答完後查看儀表板</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#8A3F76] font-bold text-xl leading-none">④</span>
                      <span><span className="font-semibold">概念釐清・補救</span>：檢視釐清題組與學生 AI 對話紀錄</span>
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => { dismissWelcome(); navigate('/teacher/quizzes'); }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#5C8A2E] text-white text-sm font-semibold hover:bg-[#4A7324] hover:animation-none transition-colors self-start sm:self-end flex-shrink-0 animate-cta-glow-green"
                  >
                    從 ① 開始
                    <span className="animate-arrow-nudge">
                      <Icon name="arrow_forward" className="text-base" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 流程一：迷思概念診斷（對應 sidebar ①②③）*/}
        <div className="mb-3 flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#C8DFAA] to-[#A9CCE3] border-2 border-[#5C8A2E] text-sm font-bold text-[#2E4A1A] shadow-[0_2px_6px_rgba(92,138,46,0.18)]">
            <Icon name="edit_note" className="text-base" />
            <span>步驟 ①→②→③</span>
          </span>
          <h2 className="text-base font-bold text-[#2D3436]">迷思概念診斷</h2>
          <span className="text-sm text-[#636E72]">出題 → 派題 → 看結果</span>
        </div>
        <div className="bg-white border border-[#BDC3C7] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 mb-6 sm:mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-stretch justify-between gap-2">
            <FlowStep
              stepIdx={1}
              label="出診斷題"
              color="green"
              to="/teacher/quizzes"
              statusLabel={stage.quiz.statusLabel}
              statusReady={stage.quiz.ready}
              isNext={stage.nextStep === 'quiz'}
              ai="出題輔助：RAGFlow 從教材檢索並建議題目"
              onNavigate={navigate}
              tourId="home-flow-quiz"
            />
            <FlowArrow />
            <FlowStep
              stepIdx={2}
              label="派題給班級"
              color="teal"
              to="/teacher/assignments/diagnosis"
              statusLabel={stage.assign.statusLabel}
              statusReady={stage.assign.ready}
              isNext={stage.nextStep === 'assign'}
              onNavigate={navigate}
              tourId="home-flow-assign"
            />
            <FlowArrow />
            <FlowStep
              stepIdx={3}
              label="看診斷結果"
              color="blue"
              to="/teacher/dashboard/overview"
              statusLabel={stage.dashboard.statusLabel}
              statusReady={stage.dashboard.ready}
              isNext={stage.nextStep === 'dashboard'}
              ai="AI 報告摘要：LLM 彙整班級表現重點"
              onNavigate={navigate}
              tourId="home-flow-dashboard"
            />
          </div>
        </div>

        {/* 流程二：概念釐清補救（對應 sidebar ④）*/}
        <div className="mb-3 flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#F2DDED] to-[#D2A6C5] border-2 border-[#8A3F76] text-sm font-bold text-[#502047] shadow-[0_2px_6px_rgba(138,63,118,0.18)]">
            <Icon name="psychiatry" className="text-base" />
            <span>步驟 ④→⑤→⑥</span>
          </span>
          <h2 className="text-base font-bold text-[#2D3436]">概念釐清・補救教學</h2>
          <span className="text-sm text-[#636E72]">釐清出題 → 派題 → 看概念釐清結果</span>
        </div>
        <div className="bg-white border border-[#BDC3C7] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 mb-6 sm:mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-stretch justify-between gap-2">
            <FlowStep
              stepIdx={4}
              label="釐清題組編輯"
              color="purple1"
              to="/teacher/scenarios"
              statusLabel={remediationStep1Status}
              statusReady={stage.remediation.count > 0}
              isNext={stage.nextStep === 'remediation'}
              onNavigate={navigate}
              tourId="home-flow-remediation-edit"
            />
            <FlowArrow />
            <FlowStep
              stepIdx={5}
              label="派發釐清題組"
              color="purple2"
              to="/teacher/assignments/scenarios"
              statusLabel={remediationStep2Status}
              statusReady={stage.remediation.assignCount > 0}
              onNavigate={navigate}
              tourId="home-flow-remediation-assign"
            />
            <FlowArrow />
            <FlowStep
              stepIdx={6}
              label="概念釐清結果"
              color="purple3"
              to="/teacher/treatment-outcomes"
              statusLabel={remediationStep3Status}
              statusReady={stage.remediation.assignCount > 0}
              ai="AI 補救對話：LLM 引導 CER 概念釐清"
              onNavigate={navigate}
              tourId="home-flow-remediation-result"
            />
          </div>
        </div>

        {/* Knowledge Nodes Entry */}
        <button
          onClick={() => navigate('/teacher/knowledge-map')}
          data-tour="home-knowledge-map"
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
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#7A4A18]">
                  <span className="w-2 h-2 rounded-full bg-[#F0B962] inline-block"></span>
                  2 子主題（A 溶解 / B 酸鹼）
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
