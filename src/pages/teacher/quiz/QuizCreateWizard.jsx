import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import StepIndicator from '../../../components/StepIndicator';
import { useApp } from '../../../context/AppContext';
import { useTour } from '../../../context/TourContext';
import { Icon } from '../../../components/ui/woodKit';
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt';
import { useUnits } from '../../../hooks/useAdminUnits';
import { useAllKnowledgeNodes, nodesForUnit } from '../../../hooks/useKnowledgeNodes';
import Step0Unit from './Step0Unit';
import Step1Nodes from './Step1Nodes';
import Step2Edit from './Step2Edit';

const STEPS = ['選擇單元', '選擇節點', '製作題組'];

function parseStep(raw) {
  const n = parseInt(raw ?? '', 10);
  return n >= 1 && n <= 3 ? n : 1;
}

export default function QuizCreateWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    selectedUnitId, selectedNodeIds,
    isWizardDirty, setIsWizardDirty,
  } = useApp();
  const { startTour } = useTour();
  const initialStep = parseStep(searchParams.get('step'));
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [pendingNavigateTo, setPendingNavigateTo] = useState(null);

  const { data: units = [] } = useUnits({ type: 'unit' });
  const { data: allNodes = [], isLoading: nodesLoading } = useAllKnowledgeNodes();
  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const unitName = selectedUnit?.name ?? '迷思概念診斷測驗';
  const unitNodes = useMemo(() => nodesForUnit(selectedUnit, allNodes), [selectedUnit, allNodes]);

  // 進入頁面時重置 dirty 旗標（只在 mount 時重置；切換 step 不應重置）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setIsWizardDirty(false); }, []);

  // 攔截瀏覽器分頁關閉 / 重新整理
  useUnsavedChangesPrompt(isWizardDirty);

  /** 統一的「離開 wizard」入口：dirty 時開 modal，否則直接 navigate */
  const guardedNavigate = (to) => {
    if (isWizardDirty) setPendingNavigateTo(to);
    else navigate(to);
  };

  const canNavigateTo = (n) => {
    if (n === 1) return true;
    if (n === 2) return !!selectedUnitId;
    return selectedNodeIds.length > 0;  // n === 3
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* Breadcrumb + page header */}
        <nav className="mb-2 flex items-center gap-1 text-sm text-[#95A5A6]" aria-label="breadcrumb">
          <button
            onClick={() => guardedNavigate('/teacher/quizzes')}
            className="hover:text-[#636E72] hover:underline transition-colors"
          >
            出題管理
          </button>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#636E72] font-medium">建立題組</span>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#2D3436] font-semibold">
            {STEPS[currentStep - 1] ? `步驟${['一', '二', '三'][currentStep - 1]}：${STEPS[currentStep - 1]}` : ''}
          </span>
        </nav>
        <div className="mb-5 sm:mb-7 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => guardedNavigate('/teacher/quizzes')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors flex-shrink-0"
            title="返回出題管理"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436] mb-0.5">建立題組</h1>
              <button
                type="button"
                onClick={() => startTour(currentStep === 3 ? 'quiz-step2' : 'quiz-step1')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#C8D6C9] text-[#3D5A3E] text-sm font-semibold hover:bg-[#EEF5E6] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                title="瞭解此步驟的功能"
              >
                <Icon name="tour" className="text-base" />
                操作導覽
              </button>
            </div>
            <p className="text-[#636E72] text-sm">{unitName} · 迷思概念診斷測驗</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 sm:mb-8">
          <StepIndicator
            currentStep={currentStep}
            steps={STEPS}
            onStepClick={(n) => setCurrentStep(n)}
            canNavigateTo={canNavigateTo}
          />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#BDC3C7] p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {currentStep === 1 && (
            <Step0Unit onNext={() => setCurrentStep(2)} />
          )}
          {currentStep > 1 && nodesLoading && (
            <div className="py-16 text-center text-sm text-[#636E72]">載入單元節點中…</div>
          )}
          {currentStep === 2 && !nodesLoading && (
            <Step1Nodes
              nodes={unitNodes}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          )}
          {currentStep === 3 && !nodesLoading && (
            <Step2Edit nodes={unitNodes} onBack={() => setCurrentStep(2)} />
          )}
        </div>
      </div>

      {/* Unsaved-changes confirmation modal (in-app navigation via 返回 / guardedNavigate) */}
      {pendingNavigateTo && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-[#BDC3C7] rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-[#FCF0C2] border border-[#F5D669] rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#B7950B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#2D3436]">尚有未儲存的變更</h3>
                <p className="text-sm text-[#636E72] mt-0.5">離開後變更將會遺失</p>
              </div>
            </div>
            <p className="text-sm text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] rounded-xl p-3 mb-5 leading-relaxed">
              想保留變更，請先按「儲存草稿」或「儲存並發布」再離開。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingNavigateTo(null)}
                className="flex-1 py-2.5 text-sm font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
              >
                取消，繼續編輯
              </button>
              <button
                onClick={() => {
                  const target = pendingNavigateTo;
                  setIsWizardDirty(false);
                  setPendingNavigateTo(null);
                  navigate(target);
                }}
                className="flex-1 py-2.5 text-sm font-semibold bg-[#FAC8CC] text-[#E74C5E] border border-[#BDC3C7] rounded-xl hover:bg-[#F5B8BA] transition-colors"
              >
                不儲存，離開
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
