import { useCallback } from 'react';
import { Joyride, STATUS } from 'react-joyride';

const STEPS = [
  {
    target: '[data-tour="sidebar"]',
    content: '這是您的導航區，功能依照教學流程排列，從出題到補救一步步引導您完成診斷教學。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-quiz"]',
    content: '第一步：在這裡建立或編輯「迷思診斷題組」，AI 會從教材中推薦題目供您選用。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-assign"]',
    content: '第二步：題組建好後，將它派發給班級的學生進行作答。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-dashboard"]',
    content: '第三步：學生完成作答後，這裡會呈現診斷結果——包含答題分布、迷思排行、個人報告等。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-remediation"]',
    content: '第四步：針對學生的迷思概念，進行概念釐清補救教學，AI 會引導學生進行對話式學習。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-classes"]',
    content: '在這裡管理您的班級與學生帳號，包含新增班級、匯入學生名單等功能。',
    placement: 'right',
    skipBeacon: true,
  },
];

const tooltipStyles = {
  options: {
    zIndex: 10000,
    primaryColor: '#5C8A2E',
  },
  tooltip: {
    borderRadius: '16px',
    padding: '20px 24px',
    fontSize: '15px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  tooltipContent: {
    padding: '8px 0 4px',
    lineHeight: '1.7',
    color: '#2D3436',
  },
  buttonNext: {
    borderRadius: '10px',
    padding: '8px 18px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#5C8A2E',
  },
  buttonBack: {
    borderRadius: '10px',
    padding: '8px 18px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#636E72',
  },
  buttonSkip: {
    color: '#95A5A6',
    fontSize: '13px',
  },
  spotlight: {
    borderRadius: '16px',
  },
};

const locale = {
  back: '上一步',
  close: '關閉',
  last: '完成',
  next: '下一步',
  skip: '跳過導覽',
};

export default function GuidedTour({ tourKey, onFinish }) {
  const handleCallback = useCallback((data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  }, [onFinish]);

  if (!tourKey) return null;

  return (
    <Joyride
      key={tourKey}
      steps={STEPS}
      run
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={tooltipStyles}
      locale={locale}
      floaterProps={{ disableAnimation: true }}
    />
  );
}
