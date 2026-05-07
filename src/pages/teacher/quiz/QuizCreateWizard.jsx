import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import StepIndicator from '../../../components/StepIndicator';
import { useApp } from '../../../context/AppContext';
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt';
import Step1Nodes from './Step1Nodes';
import Step2Edit from './Step2Edit';

const STEPS = ['決定出題範圍（選擇節點）', '製作考卷（編輯題目）'];

export default function QuizCreateWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    selectedNodeIds,
    isWizardDirty, setIsWizardDirty,
  } = useApp();
  const initialStep = searchParams.get('step') === '2' ? 2 : 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [pendingNavigateTo, setPendingNavigateTo] = useState(null);

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

  const canGoStep2 = selectedNodeIds.length > 0;
  const canNavigateTo = (n) => (n === 1 ? true : canGoStep2);

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        {/* Top bar: back + page header */}
        <div className="mb-5 sm:mb-7 flex items-start gap-3 sm:gap-4">
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436] mb-1">建立考卷</h1>
            <p className="text-[#636E72] text-sm">水溶液單元 · 迷思概念診斷測驗</p>
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
            <Step1Nodes onNext={() => setCurrentStep(2)} />
          )}
          {currentStep === 2 && (
            <Step2Edit onBack={() => setCurrentStep(1)} />
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
