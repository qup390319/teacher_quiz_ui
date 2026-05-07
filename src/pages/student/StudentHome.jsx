import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useScenarios } from '../../hooks/useScenarios';
import { getQuizQuestions } from '../../data/quizData';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import {
  Icon,
  WOOD_OUTER,
  WOOD_INNER_CREAM,
  WoodIconButton,
} from '../../components/ui/woodKit';
import TaskCard from '../../components/student/TaskCard';
import Section from '../../components/student/StudentHomeSection';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';
import studentImg from '../../assets/illustrations/irasutoya_student_clean.png';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';
import settingsIcon from '../../assets/icons/settings_wood.png';

/* P3 起：學生 classId / seat / 姓名 由 AuthContext 提供（spec-13）。
 * 若 user 不是 student（不應該到這頁）則 fallback 為 5甲1 號避免崩潰。 */
const TOTAL_NODES = knowledgeNodes.length; // 12

/* 把正確率映射為 1~3 顆星 */
const calcStars = (correctCount, totalCount) => {
  if (!totalCount) return 0;
  const ratio = correctCount / totalCount;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.5) return 2;
  if (ratio > 0)    return 1;
  return 0;
};

const todayString = () => new Date().toISOString().slice(0, 10);

export default function StudentHome() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const {
    studentHistory,
    setCurrentQuizId,
    setActiveStudentReport,
  } = useApp();

  // P4 起治療 session 改由 React Query 取得；此頁先以 assignment.status 推斷完成度，
  // 真正完成判定由 ScenarioChat 在治療結束後 invalidate 並由 StudentReport 顯示。
  const STUDENT_CLASS_ID = currentUser?.classId ?? 'class-A';
  const studentName = currentUser?.name ?? '探險者';

  // 後端會自動把學生過濾到自己的 classId
  const { data: assignments = [] } = useAssignments();
  const { data: quizzes = [] } = useQuizzes();
  const { data: scenarioQuizzes = [] } = useScenarios();

  const [diagnosisHistoryOpen, setDiagnosisHistoryOpen] = useState(false);
  const [scenarioHistoryOpen, setScenarioHistoryOpen] = useState(false);

  /* 將派題 enriched 為任務卡資料 */
  const { diagnosisTasks, scenarioTasks } = useMemo(() => {
    const today = todayString();
    const myAssignments = assignments.filter((a) => a.classId === STUDENT_CLASS_ID);

    const diag = [];
    const sce = [];

    myAssignments.forEach((assignment) => {
      const taskType = assignment.type ?? 'diagnosis';

      if (taskType === 'scenario') {
        const sq = scenarioQuizzes.find((q) => q.id === assignment.scenarioQuizId);
        const totalQuestions = sq?.questionCount ?? 0;
        const sessionCompleted = assignment.myScenarioCompleted === true;

        let status;
        if (sessionCompleted) status = 'completed';
        else if (assignment.dueDate < today) status = 'expired';
        else status = 'next';

        sce.push({
          assignmentId: assignment.id,
          taskType: 'scenario',
          scenarioQuizId: assignment.scenarioQuizId,
          quizId: assignment.scenarioQuizId,
          title: sq?.title ?? assignment.scenarioQuizId,
          questionCount: totalQuestions,
          dueDate: assignment.dueDate,
          assignedAt: assignment.assignedAt,
          status,
          stars: sessionCompleted ? 3 : 0,
          completedAt: null,
          bestRecord: null,
          session: null,
        });
        return;
      }

      const quiz = quizzes.find((q) => q.id === assignment.quizId);
      const totalQuestions = quiz?.questionCount ?? getQuizQuestions(assignment.quizId).length;
      // Local studentHistory 只是當前 session 的快取；真正的「是否做過」由後端
      // assignment.myDiagnosisCompleted 決定（持久化、跨刷新依然正確）。
      const myRecords = studentHistory.filter((h) => h.quizId === assignment.quizId);
      const bestRecord = myRecords.reduce(
        (best, cur) => (best == null || cur.correctCount > best.correctCount ? cur : best),
        null,
      );
      const completedFromBackend = assignment.myDiagnosisCompleted === true;

      let status;
      if (bestRecord || completedFromBackend) status = 'completed';
      else if (assignment.dueDate < today) status = 'expired';
      else status = 'next';

      diag.push({
        assignmentId: assignment.id,
        taskType: 'diagnosis',
        quizId: assignment.quizId,
        title: quiz?.title ?? assignment.quizId,
        questionCount: totalQuestions,
        dueDate: assignment.dueDate,
        assignedAt: assignment.assignedAt,
        status,
        stars: bestRecord ? calcStars(bestRecord.correctCount, totalQuestions) : 0,
        completedAt: bestRecord?.completedAt?.split(' ')[0] ?? null,
        bestRecord,
      });
    });

    const splitGroup = (list) => {
      const pending = list
        .filter((t) => t.status === 'next')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const expired = list
        .filter((t) => t.status === 'expired')
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      const completed = list
        .filter((t) => t.status === 'completed')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
      return { pending: [...pending, ...expired], completed };
    };

    return {
      diagnosisTasks: splitGroup(diag),
      scenarioTasks: splitGroup(sce),
    };
  }, [assignments, quizzes, scenarioQuizzes, studentHistory, STUDENT_CLASS_ID]);

  const stats = useMemo(() => {
    const allPending = diagnosisTasks.pending.length + scenarioTasks.pending.length;
    const allCompleted = diagnosisTasks.completed.length + scenarioTasks.completed.length;
    const totalAssignments = allPending + allCompleted;
    return {
      completedAssignments: allCompleted,
      totalAssignments,
      pending: allPending,
    };
  }, [diagnosisTasks, scenarioTasks]);

  const handleStartQuiz = (task) => {
    if (task.taskType === 'scenario') {
      navigate(`/student/scenario/${task.scenarioQuizId}`);
      return;
    }
    setCurrentQuizId(task.quizId);
    setActiveStudentReport(null);
    // P4: pass assignmentId in query so StudentQuiz knows where to POST answers
    navigate(`/student/quiz/${task.quizId}?assignmentId=${encodeURIComponent(task.assignmentId)}`);
  };

  const handleViewReport = (record) => {
    setActiveStudentReport(record);
    setCurrentQuizId(record.quizId);
    navigate('/student/report');
  };

  const handleViewTaskReport = (task) => {
    if (task.taskType === 'scenario') {
      // 治療紀錄 view（暫時導去 ScenarioChat — 後續可加專屬報告頁）
      navigate(`/student/scenario/${task.scenarioQuizId}`);
      return;
    }
    // 在記憶體中有剛剛完成的快照 → 直接用，最完整（含 conversationLog 等）。
    // 否則（先前 session 完成、或才剛重新登入）→ 改由 StudentReport 透過
    // /api/students/{id}/history 撈摘要顯示。
    if (task.bestRecord) {
      handleViewReport(task.bestRecord);
    } else {
      setActiveStudentReport(null);
      setCurrentQuizId(task.quizId);
      navigate(`/student/report?quizId=${encodeURIComponent(task.quizId)}`);
    }
  };

  const hasDiagnosis = diagnosisTasks.pending.length + diagnosisTasks.completed.length > 0;
  const hasScenario = scenarioTasks.pending.length + scenarioTasks.completed.length > 0;
  const hasTasks = hasDiagnosis || hasScenario;
  const pendingCount =
    diagnosisTasks.pending.filter((t) => t.status !== 'expired').length +
    scenarioTasks.pending.filter((t) => t.status !== 'expired').length;

  return (
    <div
      className="relative min-h-screen overflow-x-hidden flex flex-col"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ═══ 上半 HUD 區（透明 overlay，背景為 sky+grass） ═══════ */}
      <div className="relative z-10 flex flex-col">
        {/* HUD 一條：返回 + avatar pill + stats pill + 設定 */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 pt-3 sm:pt-4 animate-fade-up">
          <div className="flex items-center gap-2 min-w-0">
            <WoodIconButton
              icon="arrow_back"
              ariaLabel="登出"
              onClick={async () => { await logout(); navigate('/', { replace: true }); }}
              size="sm"
            />
            <AvatarPill studentName={studentName} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <CombinedStats stats={stats} />
            <button
              type="button"
              aria-label="設定"
              className="hover:rotate-90 hover:scale-110 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                         cursor-pointer flex items-center justify-center flex-shrink-0
                         drop-shadow-[0_3px_3px_rgba(91,66,38,0.35)]"
            >
              <img src={settingsIcon} alt="設定" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            </button>
          </div>
        </div>

        {/* 吉祥物對話列（置中） */}
        <div className="flex items-center justify-center gap-3 px-4 sm:px-6 pt-3 pb-3 animate-fade-up-delay-1">
          <img
            src={mascotImg}
            alt="吉祥物"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain animate-breath flex-shrink-0
                       drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]"
          />
          <div className="leading-tight">
            {hasTasks ? (
              pendingCount > 0 ? (
                <>
                  <p className="font-game text-lg sm:text-xl font-black text-[#5A3E22] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
                    你有 <span className="text-[#D08B2E]">{pendingCount}</span> 個任務要挑戰！
                  </p>
                  <p className="text-sm sm:text-base font-bold text-[#7A5232] mt-1 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
                    完成後可在「已完成」區查看你的學習報告
                  </p>
                </>
              ) : (
                <p className="font-game text-lg sm:text-xl font-black text-[#5A3E22] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
                  目前沒有待挑戰任務 · 你做得很棒！
                </p>
              )
            ) : (
              <p className="font-game text-lg sm:text-xl font-black text-[#5A3E22] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
                老師還沒派任務給你～
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 下半米紙 panel（圓角頂、淡斜紋） ═══════════════════ */}
      <main className="relative z-10 flex-1 flex flex-col mt-2 animate-fade-up-delay-2">
        {/* 米紙 panel 容器 */}
        <div className="relative flex-1 bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                        rounded-t-[32px] border-t-[3px] border-[#C19A6B]
                        shadow-[0_-4px_12px_-2px_rgba(91,66,38,0.15)]">
          {/* 淡斜紋 overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-t-[32px] opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #F4D58A 0px, #F4D58A 2px, transparent 2px, transparent 16px)',
            }}
          />

          {/* 內容 — 兩種派題分區（spec-08 §6 / spec-07 §12.1） */}
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-10">
            {hasTasks ? (
              <>
                {/* ── 診斷測驗區 ──────────────────── */}
                {hasDiagnosis && (
                  <>
                    {diagnosisTasks.pending.length > 0 && (
                      <Section
                        title="迷思診斷"
                        subtitle="先測驗找出你對科學概念的迷思"
                        accentColor="#D08B2E"
                        icon="quiz"
                      >
                        <div className="space-y-3 sm:space-y-4">
                          {diagnosisTasks.pending.map((task) => (
                            <TaskCard
                              key={task.assignmentId}
                              {...task}
                              onStart={() => handleStartQuiz(task)}
                            />
                          ))}
                        </div>
                      </Section>
                    )}

                    {diagnosisTasks.completed.length > 0 && (
                      <Section
                        title="已完成的診斷"
                        count={diagnosisTasks.completed.length}
                        collapsible
                        open={diagnosisHistoryOpen}
                        onToggle={() => setDiagnosisHistoryOpen((v) => !v)}
                        className="mt-4"
                      >
                        <div className="space-y-3 sm:space-y-4">
                          {diagnosisTasks.completed.map((task) => (
                            <TaskCard
                              key={task.assignmentId}
                              {...task}
                              onStart={() => handleStartQuiz(task)}
                              onViewReport={() => handleViewTaskReport(task)}
                            />
                          ))}
                        </div>
                      </Section>
                    )}
                  </>
                )}

                {/* ── 情境治療區（spec-08）──────── */}
                {hasScenario && (
                  <>
                    {scenarioTasks.pending.length > 0 && (
                      <Section
                        title="情境治療"
                        subtitle="與 AI 對話練習科學論證，治療你的迷思"
                        accentColor="#3F8B5E"
                        icon="forum"
                        className={hasDiagnosis ? 'mt-6' : ''}
                      >
                        <div className="space-y-3 sm:space-y-4">
                          {scenarioTasks.pending.map((task) => (
                            <TaskCard
                              key={task.assignmentId}
                              {...task}
                              onStart={() => handleStartQuiz(task)}
                            />
                          ))}
                        </div>
                      </Section>
                    )}

                    {scenarioTasks.completed.length > 0 && (
                      <Section
                        title="已完成的治療"
                        count={scenarioTasks.completed.length}
                        collapsible
                        open={scenarioHistoryOpen}
                        onToggle={() => setScenarioHistoryOpen((v) => !v)}
                        className="mt-4"
                      >
                        <div className="space-y-3 sm:space-y-4">
                          {scenarioTasks.completed.map((task) => (
                            <TaskCard
                              key={task.assignmentId}
                              {...task}
                              onStart={() => handleStartQuiz(task)}
                              onViewReport={() => handleViewTaskReport(task)}
                            />
                          ))}
                        </div>
                      </Section>
                    )}
                  </>
                )}
              </>
            ) : (
              <EmptyBoard />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * 子元件
 * ═════════════════════════════════════════════════════════════════ */

/* avatar pill：學生 avatar + 姓名 */
function AvatarPill({ studentName }) {
  return (
    <div className={`${WOOD_OUTER} flex-shrink-0`}>
      <div className={`${WOOD_INNER_CREAM} pl-1 pr-1 sm:pr-3 py-1 flex items-center gap-1.5`}>
        <img src={studentImg} alt={studentName} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
        <p className="hidden sm:flex font-game text-base sm:text-lg font-bold text-[#5A3E22] items-center leading-none">
          {studentName}
        </p>
      </div>
    </div>
  );
}

/* 兩項統計合併進一個木框 pill：已完成 / 待完成 */
function CombinedStats({ stats }) {
  const items = [
    { icon: 'check_circle',    value: `${stats.completedAssignments}/${stats.totalAssignments}`, color: 'text-[#5C8A2E]', label: '已完成派題' },
    { icon: 'pending_actions', value: stats.pending,                                             color: 'text-[#D08B2E]', label: '待完成派題' },
  ];
  return (
    <div className={WOOD_OUTER}>
      <div className={`${WOOD_INNER_CREAM} px-2 py-1 flex items-center divide-x divide-[#C19A6B]/40`}>
        {items.map((item) => (
          <div key={item.icon} title={item.label} className="flex items-center gap-1.5 px-2.5 sm:px-3">
            <Icon name={item.icon} filled className={`text-lg sm:text-xl ${item.color}`} />
            <span className="font-game text-base sm:text-lg font-black text-[#5A3E22] leading-none">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="flex flex-col items-center text-center py-10">
      <Icon name="inventory_2" filled className="text-6xl text-[#C19A6B]" />
      <p className="font-game text-xl font-black text-[#5A3E22] mt-3 mb-1">看板還是空的</p>
      <p className="text-base text-[#7A5232]">老師還沒派任務給你 · 等老師派題後就會出現在這裡</p>
    </div>
  );
}
