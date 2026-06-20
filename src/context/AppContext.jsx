/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { defaultQuestions } from '../data/quizData';
import { getCurrentSchoolYear, getCurrentSemester } from '../utils/schoolYear';

// localStorage 鍵名（spec-04 §1.1）
const LS_SCHOOL_YEAR = 'sciLens.schoolYear';
const LS_SEMESTER = 'sciLens.semester';
const LS_INCLUDE_ARCHIVED = 'sciLens.includeArchived';

function readLS(key, fallback, parse = (v) => v) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return parse(raw);
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* quota / private mode → 忽略 */
  }
}

/**
 * AppContext — 純 UI 狀態。
 *
 * P4 後僅保留：
 *   - 出題精靈中的暫存題目（quizQuestions / selectedNodeIds）
 *   - 當前選中的 quiz / class（純 UI 狀態，與 dashboard URL query 同步）
 *   - 學生「剛完成」的測驗結果暫存（activeStudentReport / addToHistory）：
 *       這只是在跳轉到 /student/report 之前把資料帶過去用的本地暫存；
 *       canonical 來源在 DB（透過 useStudentHistory hook 拉取）。
 *
 * 已從 P3 移除：classes / quizzes / assignments → React Query hooks
 * 已從 P4 移除：studentAnswers / recordAnswer / removeMisconception
 *               / studentMisconceptions / correctCount
 *               （學生作答 P4 起即時 POST 到 /api/answers）
 * 概念釐清模組已下線（前端 UI 移除），相關 hooks/data 一併刪除。
 */

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 出題精靈
  const [quizQuestions, setQuizQuestions] = useState([...defaultQuestions]);
  // 出題精靈當前選定的單元（一份題組只綁一個單元）。預設「水溶液」相容既有示範資料。
  const [selectedUnitId, setSelectedUnitId] = useState('unit-water-solution');
  const [selectedNodeIds, setSelectedNodeIds] = useState([
    'INe-Ⅱ-3-02', 'INe-Ⅱ-3-03', 'INe-Ⅱ-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7',
  ]);
  const [nodeQuestionCounts, setNodeQuestionCounts] = useState({});
  // 出題精靈正在編輯的 quiz id（null = 新建 / 複製；有值 = 編輯既有）
  const [editingQuizId, setEditingQuizId] = useState(null);
  // 出題精靈正在編輯的 quiz 原始 status（draft / published / null）
  const [editingQuizStatus, setEditingQuizStatus] = useState(null);
  // 出題精靈正在編輯的 quiz 原始 title（編輯既有：載入時帶入；新建：留空，由 Step2Edit 產生預設）
  const [editingQuizTitle, setEditingQuizTitle] = useState('');
  // 出題精靈的題型：'single'（單層迷思診斷）/ 'two-tier'（雙層次）。spec-04、spec-11。
  // 預設 two-tier：教師端新建一律出雙層次題；single 僅保留供既有單層卷編輯。
  const [editingQuizMode, setEditingQuizMode] = useState('two-tier');
  // 出題精靈是否有「尚未儲存的變更」（dirty）→ 用於離開時提示
  const [isWizardDirty, setIsWizardDirty] = useState(false);

  // 當前選中的 class / quiz（純 UI 狀態）
  const [currentClassId, setCurrentClassId] = useState(null);
  const [currentQuizId, setCurrentQuizId] = useState(null);

  // 學年/學期/封存篩選（spec-04 §1.1；dashboard 與班級管理共用）
  const [currentSchoolYear, setCurrentSchoolYear] = useState(
    () => readLS(LS_SCHOOL_YEAR, getCurrentSchoolYear(), (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : getCurrentSchoolYear();
    }),
  );
  const [currentSemester, setCurrentSemester] = useState(
    () => readLS(LS_SEMESTER, getCurrentSemester(), (v) => (v === 'first' || v === 'second' ? v : getCurrentSemester())),
  );
  const [includeArchivedClasses, setIncludeArchivedClasses] = useState(
    () => readLS(LS_INCLUDE_ARCHIVED, false, (v) => v === 'true'),
  );

  // persist 三個篩選器值
  useEffect(() => { writeLS(LS_SCHOOL_YEAR, currentSchoolYear); }, [currentSchoolYear]);
  useEffect(() => { writeLS(LS_SEMESTER, currentSemester); }, [currentSemester]);
  useEffect(() => { writeLS(LS_INCLUDE_ARCHIVED, includeArchivedClasses); }, [includeArchivedClasses]);

  // 學生報告暫存（StudentQuiz → StudentReport 用；canonical 在 DB）
  const [studentName] = useState('學生');  // 已被 useAuth().currentUser.name 取代但保留相容
  const [studentHistory, setStudentHistory] = useState([]);
  const [activeStudentReport, setActiveStudentReport] = useState(null);

  const addToHistory = useCallback((record) => {
    setStudentHistory((prev) => [record, ...prev]);
    setActiveStudentReport(record);
  }, []);

  /* 誤判補救「重新問這一題」用：把單題重做的新結果併回現有報告（替換同題舊項），
     並重算答對數與迷思清單。不建立新報告、不影響其他題。activeStudentReport 為空
     （例如從歷史頁進來）時不動，重做的資料已逐題存進 DB，回報告頁時由後端來源呈現。 */
  const mergeRetryIntoReport = useCallback((questionId, { answer, followUpResult }) => {
    setActiveStudentReport((prev) => {
      if (!prev) return prev;
      const answers = (prev.answers || []).map((a) =>
        a.questionId === questionId ? { ...a, ...answer } : a,
      );
      if (answer && !answers.some((a) => a.questionId === questionId)) answers.push(answer);
      const followUpResults = [
        ...(prev.followUpResults || []).filter((r) => r.questionId !== questionId),
        ...(followUpResult ? [followUpResult] : []),
      ];
      const correctCount = answers.filter((a) => a.diagnosis === 'CORRECT').length;
      const misconceptions = [
        ...new Set(answers.filter((a) => a.diagnosis !== 'CORRECT').map((a) => a.diagnosis)),
      ];
      return { ...prev, answers, followUpResults, correctCount, misconceptions };
    });
  }, []);

  return (
    <AppContext.Provider value={{
      // 出題精靈
      quizQuestions, setQuizQuestions,
      selectedUnitId, setSelectedUnitId,
      selectedNodeIds, setSelectedNodeIds,
      nodeQuestionCounts, setNodeQuestionCounts,
      editingQuizId, setEditingQuizId,
      editingQuizStatus, setEditingQuizStatus,
      editingQuizTitle, setEditingQuizTitle,
      editingQuizMode, setEditingQuizMode,
      isWizardDirty, setIsWizardDirty,
      // 當前選中的 quiz / class（UI 狀態）
      currentClassId, setCurrentClassId,
      currentQuizId, setCurrentQuizId,
      // 學年/學期/封存篩選（spec-04 §1.1）
      currentSchoolYear, setCurrentSchoolYear,
      currentSemester, setCurrentSemester,
      includeArchivedClasses, setIncludeArchivedClasses,
      // 學生報告暫存
      studentName, studentHistory, addToHistory, mergeRetryIntoReport,
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
