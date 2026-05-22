import { useQuizzes } from './useQuizzes';
import { useScenarios } from './useScenarios';
import { useAssignments } from './useAssignments';

/**
 * 教師端「使用案例階段」狀態派生
 *
 * 對應側邊欄四大流程：
 *   ① 出診斷題       — 是否已建立任何診斷題組
 *   ② 派題給班級     — 是否已派任何診斷題組
 *   ③ 看診斷結果     — 是否已有派題（可看 dashboard）
 *   ④ 概念釐清補救   — 是否已建立任何概念釐清題組
 *
 * nextStep：當前老師應該做的下一步（用於 sidebar 建議高亮）
 * 規則：第一個未完成的階段就是 nextStep；全部完成則為 null。
 */
export function useTeacherStageStatus() {
  const { data: quizzes = [] } = useQuizzes();
  const { data: scenarios = [] } = useScenarios();
  const { data: diagAssignments = [] } = useAssignments({ type: 'diagnosis' });
  const { data: scenarioAssignments = [] } = useAssignments({ type: 'scenario' });

  const quizzesCount = quizzes.length;
  const scenariosCount = scenarios.length;
  const diagAssignCount = diagAssignments.length;
  const scenarioAssignCount = scenarioAssignments.length;

  const hasQuizzes = quizzesCount > 0;
  const hasDiagAssignments = diagAssignCount > 0;
  const hasScenarios = scenariosCount > 0;
  const hasScenarioAssignments = scenarioAssignCount > 0;

  // 「建議下一步」— 找出第一個尚未完成的階段
  let nextStep = null;
  if (!hasQuizzes) nextStep = 'quiz';
  else if (!hasDiagAssignments) nextStep = 'assign';
  else if (!hasScenarios) nextStep = 'remediation';
  else if (!hasScenarioAssignments) nextStep = 'remediation';
  // 全部完成 → 不高亮任一階段

  return {
    quiz: {
      count: quizzesCount,
      ready: hasQuizzes,
      statusLabel: hasQuizzes ? `${quizzesCount} 份題組` : '尚未建立',
    },
    assign: {
      count: diagAssignCount,
      ready: hasDiagAssignments,
      statusLabel: hasDiagAssignments ? `${diagAssignCount} 班已派` : (hasQuizzes ? '尚未派題' : '—'),
    },
    dashboard: {
      ready: hasDiagAssignments,
      statusLabel: hasDiagAssignments ? '可查看' : '等待派題',
    },
    remediation: {
      count: scenariosCount,
      assignCount: scenarioAssignCount,
      ready: hasScenarios,
      statusLabel: hasScenarios
        ? (hasScenarioAssignments ? `${scenarioAssignCount} 班已派` : `${scenariosCount} 份釐清題組`)
        : (hasDiagAssignments ? '尚未建立' : '—'),
    },
    nextStep,
  };
}
