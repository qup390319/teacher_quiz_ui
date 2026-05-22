import { useCallback, useEffect } from 'react';
import { ACTIONS, EVENTS, Joyride, STATUS } from 'react-joyride';
import { useTour } from '../context/TourContext';
import { STEP_MAP, SIDEBAR_STEPS } from './tourSteps';

/* ---------------- 樣式（含 sidebar 配對脈動 CSS） ---------------- */

const PAIR_PULSE_CSS = `
@keyframes scilens-tour-link-pulse {
  0%, 100% { box-shadow: 0 0 0 2px #5C8A2E, 0 0 0 6px rgba(92,138,46,.18); }
  50%      { box-shadow: 0 0 0 3px #5C8A2E, 0 0 0 10px rgba(92,138,46,.32); }
}
.scilens-tour-link-pulse {
  animation: scilens-tour-link-pulse 1.4s ease-in-out infinite;
  position: relative;
  z-index: 1;
  border-radius: 12px;
}
`;

const tooltipStyles = {
  options: { zIndex: 10000, primaryColor: '#5C8A2E' },
  tooltip: {
    borderRadius: '16px',
    padding: '20px 24px',
    fontSize: '15px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    textAlign: 'left',
  },
  tooltipContent: {
    padding: '8px 0 4px',
    lineHeight: '1.7',
    color: '#2D3436',
    textAlign: 'left',
    whiteSpace: 'pre-line',
  },
  tooltipFooter: { justifyContent: 'flex-end' },
  buttonNext: {
    borderRadius: '10px', padding: '8px 18px', fontSize: '14px',
    fontWeight: 600, backgroundColor: '#5C8A2E',
  },
  buttonBack: {
    borderRadius: '10px', padding: '8px 18px', fontSize: '14px',
    fontWeight: 600, color: '#636E72',
  },
  buttonSkip: { color: '#95A5A6', fontSize: '13px' },
  spotlight: { borderRadius: '16px' },
};

const locale = {
  back: '上一步', close: '關閉', last: '完成', next: '下一步', skip: '跳過導覽',
};

/* ---------------- 配對高亮 helpers ---------------- */

function clearPairPulse() {
  document.querySelectorAll('.scilens-tour-link-pulse').forEach((el) => {
    el.classList.remove('scilens-tour-link-pulse');
  });
}

function applyPairPulse(selector) {
  if (!selector) return;
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.add('scilens-tour-link-pulse');
  });
}

/* ---------------- 元件 ---------------- */

export default function GuidedTour() {
  const { tour, endTour } = useTour();
  const variant = tour?.variant;
  const steps = STEP_MAP[variant] || SIDEBAR_STEPS;

  // 結束時清掉所有配對高亮（保險）
  useEffect(() => {
    if (!tour) clearPairPulse();
    return clearPairPulse;
  }, [tour]);

  const handleCallback = useCallback((data) => {
    const { status, type, index, action } = data;

    // 任何「結束類」事件：立刻關閉
    //   - 按 X（叉叉）：action === 'close'
    //   - 按「跳過導覽」：status === 'skipped'
    //   - 走到最後一步並按「完成」：status === 'finished'
    //   - 內部觸發 tour:end
    const isClose = action === ACTIONS.CLOSE || action === 'close';
    const isEnd =
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      type === EVENTS.TOUR_END ||
      isClose;

    if (isEnd) {
      clearPairPulse();
      endTour(); // 設 tour=null → 整個元件 return null → Joyride 卸載
      return;
    }

    // 進入新 step 時：清掉舊配對 → 加新配對
    if (type === 'step:before') {
      clearPairPulse();
      applyPairPulse(steps[index]?.linked);
    }
    // 上一步 / 跳到某 step 也要刷新
    if (type === 'step:after' && action === 'prev') {
      clearPairPulse();
      applyPairPulse(steps[index - 1]?.linked);
    }
  }, [steps, endTour]);

  if (!tour) return null;

  return (
    <>
      {variant === 'home' && <style>{PAIR_PULSE_CSS}</style>}
      <Joyride
        key={tour.key}
        steps={steps}
        run
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        scrollOffset={100}
        disableOverlayClose
        callback={handleCallback}
        styles={tooltipStyles}
        locale={locale}
        floaterProps={{ disableAnimation: true }}
        getScrollParent={() => document.querySelector('main.overflow-auto') || document.body}
      />
    </>
  );
}
