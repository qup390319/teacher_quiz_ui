import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useStudentMode } from '../../hooks/useStudentMode';
import { useAssignments } from '../../hooks/useAssignments';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useStudentHistory } from '../../hooks/useStudents';
import { getQuizQuestions } from '../../data/quizData';
import {
  Icon,
  WOOD_OUTER,
  WOOD_INNER_CREAM,
  WoodIconButton,
} from '../../components/ui/woodKit';
import TaskCard from '../../components/student/TaskCard';
import Section from '../../components/student/StudentHomeSection';
import StudentSettingsDrawer from '../../components/student/StudentSettingsDrawer';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';
import studentImg from '../../assets/illustrations/irasutoya_student_clean.png';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';
import settingsIcon from '../../assets/icons/settings_wood.png';

/* P3 起：學生 classId / seat / 姓名 由 AuthContext 提供（spec-13）。
 * 若 user 不是 student（不應該到這頁）則 fallback 為 5甲1 號避免崩潰。 */

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
  useStudentMode();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const {
    studentHistory,
    setCurrentQuizId,
    setActiveStudentReport,
  } = useApp();

  const STUDENT_CLASS_ID = currentUser?.classId ?? 'class-A';
  const studentName = currentUser?.name ?? '探險者';

  // 後端會自動把學生過濾到自己的 classId
  const { data: assignments = [] } = useAssignments();
  const { data: quizzes = [] } = useQuizzes();
  // 後端持久化的作答摘要：用來算「答對幾題/進度/星等」，避免只靠本地 session 快取
  // （重新登入/還原資料時本地快取為空，導致進度條 0%）。
  const { data: backendHistory = [] } = useStudentHistory(currentUser?.id, {
    enabled: !!currentUser?.id,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'checkups'

  /* 將派題 enriched 為任務卡資料 */
  const diagnosisTasks = useMemo(() => {
    const today = todayString();
    const myAssignments = assignments.filter((a) => a.classId === STUDENT_CLASS_ID);

    const diag = [];

    myAssignments.forEach((assignment) => {
      const taskType = assignment.type ?? 'diagnosis';
      if (taskType !== 'diagnosis') return;

      const quiz = quizzes.find((q) => q.id === assignment.quizId);
      const totalQuestions = quiz?.questionCount ?? getQuizQuestions(assignment.quizId).length;
      // 本地 studentHistory 只是當前 session 的「完整快照」（含 answers/followUpResults），
      // 供剛做完那次直接看報告。answerData / 進度則優先用後端持久化摘要。
      const localBest = studentHistory
        .filter((h) => h.quizId === assignment.quizId)
        .reduce((best, cur) => (best == null || cur.correctCount > best.correctCount ? cur : best), null);
      // 後端摘要（重新登入/還原資料也有）→ 正規化出 correctCount + completedAt 供卡片顯示。
      const backendBest = backendHistory
        .filter((h) => h.quizId === assignment.quizId)
        .reduce((best, cur) => (best == null || cur.correctCount > best.correctCount ? cur : best), null);
      // 卡片顯示用（答對題數/進度/星等）：本地優先，否則後端摘要。
      const displayBest = localBest ?? (backendBest && {
        ...backendBest,
        completedAt: backendBest.answeredAt ?? backendBest.completedAt ?? null,
      });
      const completedFromBackend = assignment.myDiagnosisCompleted === true;

      let status;
      if (displayBest || completedFromBackend) status = 'completed';
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
        stars: displayBest ? calcStars(displayBest.correctCount, totalQuestions) : 0,
        completedAt: (displayBest?.completedAt ?? '').replace('T', ' ').split(' ')[0] || null,
        bestRecord: displayBest,
        // 只有「本地完整快照」才走 in-memory 看報告；否則走 ?quizId 由後端 history 撈。
        localSnapshot: localBest,
      });
    });

    const pending = diag
      .filter((t) => t.status === 'next')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const expired = diag
      .filter((t) => t.status === 'expired')
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const completed = diag
      .filter((t) => t.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return { pending: [...pending, ...expired], completed };
  }, [assignments, quizzes, studentHistory, backendHistory, STUDENT_CLASS_ID]);

  const stats = useMemo(() => {
    const allPending = diagnosisTasks.pending.length;
    const allCompleted = diagnosisTasks.completed.length;
    const totalAssignments = allPending + allCompleted;
    return {
      completedAssignments: allCompleted,
      totalAssignments,
      pending: allPending,
    };
  }, [diagnosisTasks]);

  const handleStartQuiz = (task) => {
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
    // 在記憶體中有剛剛完成的快照 → 直接用，最完整（含 conversationLog 等）。
    // 否則（先前 session 完成、或才剛重新登入）→ 改由 StudentReport 透過
    // /api/students/{id}/history 撈摘要顯示。
    if (task.localSnapshot) {
      handleViewReport(task.localSnapshot);
    } else {
      setActiveStudentReport(null);
      setCurrentQuizId(task.quizId);
      navigate(`/student/report?quizId=${encodeURIComponent(task.quizId)}`);
    }
  };

  const hasDiagnosis = diagnosisTasks.pending.length + diagnosisTasks.completed.length > 0;
  const hasTasks = hasDiagnosis;
  const pendingCount = diagnosisTasks.pending.filter((t) => t.status !== 'expired').length;

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
              onClick={() => setSettingsOpen(true)}
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
        <div className="relative flex-1 bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                        rounded-t-[32px] border-t-[3px] border-[#C19A6B]
                        shadow-[0_-4px_12px_-2px_rgba(91,66,38,0.15)]">
          <div
            className="absolute inset-0 pointer-events-none rounded-t-[32px] opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #F4D58A 0px, #F4D58A 2px, transparent 2px, transparent 16px)',
            }}
          />

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-10">
            <TabSwitcher
              activeTab={activeTab}
              onChange={setActiveTab}
              taskCount={diagnosisTasks.pending.length}
              checkupCount={diagnosisTasks.completed.length}
            />

            {activeTab === 'tasks' && (
              diagnosisTasks.pending.length > 0 ? (
                <Section
                  title="待挑戰任務"
                  subtitle="完成這些題組，老師才能看到你的想法"
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
              ) : (
                <EmptyState
                  icon="inventory_2"
                  title={hasTasks ? '目前沒有待挑戰任務' : '看板還是空的'}
                  hint={hasTasks ? '你做得很棒！可切到「診斷報告」看歷次紀錄' : '老師還沒派任務給你 · 等老師派題後就會出現在這裡'}
                />
              )
            )}

            {activeTab === 'checkups' && (
              diagnosisTasks.completed.length > 0 ? (
                <Section
                  title="歷次診斷報告"
                  subtitle="點「查看」可開啟該次診斷報告"
                  count={diagnosisTasks.completed.length}
                  accentColor="#5C8A2E"
                  icon="assignment_turned_in"
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
              ) : (
                <EmptyState
                  icon="folder_open"
                  title="還沒有完成的診斷報告"
                  hint="完成任務看板上的題組後，這裡會出現你的診斷報告"
                />
              )
            )}
          </div>
        </div>
      </main>

      <StudentSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

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
    { icon: 'check_circle',    value: `${stats.completedAssignments}/${stats.totalAssignments}`, color: 'text-[#5C8A2E]', label: '已完成派題', shortLabel: '已完成' },
    { icon: 'pending_actions', value: stats.pending,                                             color: 'text-[#D08B2E]', label: '待完成派題', shortLabel: '未完成' },
  ];
  return (
    <div className={WOOD_OUTER}>
      <div className={`${WOOD_INNER_CREAM} px-2 py-1 flex items-center divide-x divide-[#C19A6B]/40`}>
        {items.map((item) => (
          <div key={item.icon} title={item.label} className="flex items-center gap-1.5 px-2.5 sm:px-3">
            <Icon name={item.icon} filled className={`text-lg sm:text-xl ${item.color}`} />
            <span className="font-game text-xs text-[#7A5232] leading-none">{item.shortLabel}</span>
            <span className="font-game text-base sm:text-lg font-black text-[#5A3E22] leading-none">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, hint }) {
  return (
    <div className="flex flex-col items-center text-center py-10">
      <Icon name={icon} filled className="text-6xl text-[#C19A6B]" />
      <p className="font-game text-xl font-black text-[#5A3E22] mt-3 mb-1">{title}</p>
      <p className="text-base text-[#7A5232]">{hint}</p>
    </div>
  );
}

/* 任務看板 / 診斷報告 兩個 Tab 切換 */
function TabSwitcher({ activeTab, onChange, taskCount, checkupCount }) {
  const tabs = [
    { key: 'tasks',    label: '任務看板',   icon: 'dashboard',           count: taskCount },
    { key: 'checkups', label: '診斷報告', icon: 'assignment_turned_in', count: checkupCount },
  ];
  return (
    <div className="flex gap-2 mb-4">
      {tabs.map((t) => {
        const active = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={active}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl',
              'border-[3px] font-game font-black text-sm sm:text-base transition-all duration-150',
              active
                ? 'bg-gradient-to-b from-[#F4D58A] to-[#F0B962] border-[#9B5E18] text-[#5A3E22] shadow-[0_4px_0_-1px_#7A4A18,0_6px_10px_-3px_rgba(91,66,38,0.3)]'
                : 'bg-white border-[#C19A6B] text-[#8B6B43] hover:bg-[#FFF8E7] hover:text-[#5A3E22] shadow-[0_2px_0_-1px_#C19A6B]',
            ].join(' ')}
          >
            <Icon name={t.icon} filled className="text-lg sm:text-xl" />
            <span>{t.label}</span>
            {t.count > 0 && (
              <span className={[
                'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold leading-none border-2',
                active
                  ? 'bg-white border-[#9B5E18] text-[#7A4A18]'
                  : 'bg-[#FFF4E0] border-[#C19A6B] text-[#7A4A18]',
              ].join(' ')}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
