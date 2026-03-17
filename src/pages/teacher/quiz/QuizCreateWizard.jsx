import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TeacherLayout from '../../../components/TeacherLayout';
import StepIndicator from '../../../components/StepIndicator';
import Step1Nodes from './Step1Nodes';
import Step2Edit from './Step2Edit';

const STEPS = ['決定出題範圍（選擇節點）', '製作考卷（編輯題目）'];

export default function QuizCreateWizard() {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam === '2') setCurrentStep(2);
  }, [searchParams]);

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-[#2D3436] mb-1">建立考卷</h1>
          <p className="text-[#636E72] text-sm">溫度與熱單元 · 迷思概念診斷測驗</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={currentStep} steps={STEPS} />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {currentStep === 1 && (
            <Step1Nodes onNext={() => setCurrentStep(2)} />
          )}
          {currentStep === 2 && (
            <Step2Edit onBack={() => setCurrentStep(1)} />
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
