/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import { defaultQuestions, QUIZZES_DATA } from '../data/quizData';
import { CLASSES_DATA } from '../data/classData';
import { ASSIGNMENTS_DATA } from '../data/assignmentData';
import { SCENARIO_QUIZZES_DATA } from '../data/scenarioQuizData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState(null); // 'teacher' | 'student'

  // 教師出題狀態（出題精靈用）
  const [quizQuestions, setQuizQuestions] = useState([...defaultQuestions]);
  const [selectedNodeIds, setSelectedNodeIds] = useState([
    'INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7',
  ]);

  // 班級資料
  const [classes, setClasses] = useState(CLASSES_DATA);
  const [currentClassId, setCurrentClassId] = useState(null); // null = 全部班級

  // 當前選中的考卷（供診斷結果頁使用）
  const [currentQuizId, setCurrentQuizId] = useState(null);

  // 考卷庫
  const [quizzes, setQuizzes] = useState(QUIZZES_DATA);

  // 派題記錄（Assignment.type 為 'diagnosis' | 'scenario'，舊資料預設 'diagnosis'）
  const [assignments, setAssignments] = useState(ASSIGNMENTS_DATA);

  // 情境考卷庫（治療模組，spec-08）
  const [scenarioQuizzes, setScenarioQuizzes] = useState(SCENARIO_QUIZZES_DATA);

  // 治療對話 sessions：以 `${scenarioQuizId}__${studentId}` 為 key，值為 TreatmentSession
  // TreatmentSession: { id, scenarioQuizId, studentId, currentQuestionIndex, perQuestion: { [index]: TreatmentQuestionState }, status, startedAt, completedAt }
  const [treatmentSessions, setTreatmentSessions] = useState({});

  // 衍生值
  const currentClass = classes.find((c) => c.id === currentClassId) ?? null;

  // 編輯班級成員
  const updateClassStudents = useCallback((classId, newStudents) => {
    setClasses((prev) =>
      prev.map((c) => c.id === classId ? { ...c, students: newStudents } : c)
    );
  }, []);

  // 儲存/更新考卷
  const saveQuiz = useCallback((quiz) => {
    setQuizzes((prev) =>
      prev.some((q) => q.id === quiz.id)
        ? prev.map((q) => q.id === quiz.id ? quiz : q)
        : [...prev, quiz]
    );
  }, []);

  // 新增派題記錄（type 缺省為 'diagnosis' 以保向下相容）
  const addAssignment = useCallback((assignment) => {
    setAssignments((prev) => [
      ...prev,
      { type: 'diagnosis', ...assignment, id: `assign-${Date.now()}` },
    ]);
  }, []);

  // ── 情境考卷管理 (spec-08) ───────────────────────────────────
  const saveScenarioQuiz = useCallback((scenarioQuiz) => {
    setScenarioQuizzes((prev) =>
      prev.some((q) => q.id === scenarioQuiz.id)
        ? prev.map((q) => (q.id === scenarioQuiz.id ? scenarioQuiz : q))
        : [...prev, scenarioQuiz]
    );
  }, []);

  // ── 治療 session 管理 (spec-08) ──────────────────────────────
  const sessionKey = (scenarioQuizId, studentId) =>
    `${scenarioQuizId}__${studentId}`;

  /** 啟動或取得既有的治療 session（同一 student × scenarioQuiz 共用） */
  const startTreatmentSession = useCallback((scenarioQuizId, studentId) => {
    const key = sessionKey(scenarioQuizId, studentId);
    setTreatmentSessions((prev) => {
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          id: `session-${Date.now()}`,
          scenarioQuizId,
          studentId,
          currentQuestionIndex: 1,
          perQuestion: {},
          status: 'active',
          startedAt: new Date().toISOString(),
          completedAt: null,
        },
      };
    });
    return key;
  }, []);

  /** 在某題追加一則訊息 */
  const appendTreatmentMessage = useCallback(
    (scenarioQuizId, studentId, questionIndex, message) => {
      const key = sessionKey(scenarioQuizId, studentId);
      setTreatmentSessions((prev) => {
        const session = prev[key];
        if (!session) return prev;
        const qState = session.perQuestion[questionIndex] ?? {
          messages: [],
          phase: 'diagnosis',
          step: 0,
          stage: 'claim',
          hintLevel: 0,
          requiresRestatement: false,
        };
        return {
          ...prev,
          [key]: {
            ...session,
            perQuestion: {
              ...session.perQuestion,
              [questionIndex]: {
                ...qState,
                messages: [...qState.messages, message],
              },
            },
          },
        };
      });
    },
    []
  );

  /** 更新某題的對話狀態（phase/step/stage/hintLevel/requiresRestatement） */
  const updateTreatmentQuestionState = useCallback(
    (scenarioQuizId, studentId, questionIndex, patch) => {
      const key = sessionKey(scenarioQuizId, studentId);
      setTreatmentSessions((prev) => {
        const session = prev[key];
        if (!session) return prev;
        const qState = session.perQuestion[questionIndex] ?? {
          messages: [],
          phase: 'diagnosis',
          step: 0,
          stage: 'claim',
          hintLevel: 0,
          requiresRestatement: false,
        };
        return {
          ...prev,
          [key]: {
            ...session,
            perQuestion: {
              ...session.perQuestion,
              [questionIndex]: { ...qState, ...patch },
            },
          },
        };
      });
    },
    []
  );

  /** 切到下一題 */
  const advanceTreatmentQuestion = useCallback(
    (scenarioQuizId, studentId, nextIndex) => {
      const key = sessionKey(scenarioQuizId, studentId);
      setTreatmentSessions((prev) => {
        const session = prev[key];
        if (!session) return prev;
        return {
          ...prev,
          [key]: { ...session, currentQuestionIndex: nextIndex },
        };
      });
    },
    []
  );

  /** 標記 session 完成 */
  const completeTreatmentSession = useCallback((scenarioQuizId, studentId) => {
    const key = sessionKey(scenarioQuizId, studentId);
    setTreatmentSessions((prev) => {
      const session = prev[key];
      if (!session) return prev;
      return {
        ...prev,
        [key]: {
          ...session,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  /** 取得某 student × scenarioQuiz 的 session（教師端紀錄頁、學生端對話頁共用） */
  const getTreatmentSession = useCallback(
    (scenarioQuizId, studentId) =>
      treatmentSessions[sessionKey(scenarioQuizId, studentId)] ?? null,
    [treatmentSessions]
  );

  // 更新派題記錄
  const updateAssignment = useCallback((assignmentId, updates) => {
    setAssignments((prev) =>
      prev.map((a) => a.id === assignmentId ? { ...a, ...updates } : a)
    );
  }, []);

  // 刪除派題記錄
  const removeAssignment = useCallback((assignmentId) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }, []);

  // 學生作答狀態
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [studentName] = useState('學生');
  const [studentHistory, setStudentHistory] = useState([]);
  const [activeStudentReport, setActiveStudentReport] = useState(null);

  const recordAnswer = useCallback((questionId, selectedTag, diagnosis) => {
    setStudentAnswers((prev) => {
      const exists = prev.find((a) => a.questionId === questionId);
      if (exists) return prev.map((a) => a.questionId === questionId ? { questionId, selectedTag, diagnosis } : a);
      return [...prev, { questionId, selectedTag, diagnosis }];
    });
  }, []);

  const removeMisconception = useCallback((diagnosisId) => {
    setStudentAnswers((prev) =>
      prev.map((answer) =>
        answer.diagnosis === diagnosisId
          ? { ...answer, diagnosis: 'CORRECT' }
          : answer
      )
    );
  }, []);

  const resetStudentAnswers = useCallback(() => setStudentAnswers([]), []);

  const addToHistory = useCallback((record) => {
    setStudentHistory((prev) => [record, ...prev]);
    setActiveStudentReport(record);
  }, []);

  const studentMisconceptions = studentAnswers
    .filter((a) => a.diagnosis !== 'CORRECT')
    .map((a) => a.diagnosis);

  const correctCount = studentAnswers.filter((a) => a.diagnosis === 'CORRECT').length;

  return (
    <AppContext.Provider value={{
      role, setRole,
      // 出題精靈
      quizQuestions, setQuizQuestions,
      selectedNodeIds, setSelectedNodeIds,
      // 班級
      classes, currentClassId, setCurrentClassId, currentClass,
      updateClassStudents,
      // 考卷
      quizzes, saveQuiz,
      currentQuizId, setCurrentQuizId,
      // 派題
      assignments, addAssignment, updateAssignment, removeAssignment,
      // 情境考卷與治療 sessions（spec-08）
      scenarioQuizzes, saveScenarioQuiz,
      treatmentSessions, startTreatmentSession, appendTreatmentMessage,
      updateTreatmentQuestionState, advanceTreatmentQuestion,
      completeTreatmentSession, getTreatmentSession,
      // 學生作答
      studentAnswers, recordAnswer, removeMisconception, resetStudentAnswers,
      studentMisconceptions, correctCount,
      studentName, studentHistory, addToHistory,
      activeStudentReport, setActiveStudentReport,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
