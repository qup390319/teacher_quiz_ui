/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import { defaultQuestions } from '../data/quizData';

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
 * 已從 P3 移除：classes / quizzes / scenarioQuizzes / assignments → React Query hooks
 * 已從 P4 移除：treatmentSessions（→ useTreatmentSession*）+ studentAnswers
 *               / recordAnswer / removeMisconception / studentMisconceptions / correctCount
 *               （學生作答 P4 起即時 POST 到 /api/answers）
 */

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 出題精靈
  const [quizQuestions, setQuizQuestions] = useState([...defaultQuestions]);
  const [selectedNodeIds, setSelectedNodeIds] = useState([
    'INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7',
  ]);

  // 當前選中的 class / quiz（純 UI 狀態）
  const [currentClassId, setCurrentClassId] = useState(null);
  const [currentQuizId, setCurrentQuizId] = useState(null);

  // 學生報告暫存（StudentQuiz → StudentReport 用；canonical 在 DB）
  const [studentName] = useState('學生');  // 已被 useAuth().currentUser.name 取代但保留相容
  const [studentHistory, setStudentHistory] = useState([]);
  const [activeStudentReport, setActiveStudentReport] = useState(null);

  const addToHistory = useCallback((record) => {
    setStudentHistory((prev) => [record, ...prev]);
    setActiveStudentReport(record);
  }, []);

  return (
    <AppContext.Provider value={{
      // 出題精靈
      quizQuestions, setQuizQuestions,
      selectedNodeIds, setSelectedNodeIds,
      // 當前選中的 quiz / class（UI 狀態）
      currentClassId, setCurrentClassId,
      currentQuizId, setCurrentQuizId,
      // 學生報告暫存
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
