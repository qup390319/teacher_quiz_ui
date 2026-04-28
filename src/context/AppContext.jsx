/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import { defaultQuestions, QUIZZES_DATA } from '../data/quizData';
import { CLASSES_DATA } from '../data/classData';
import { ASSIGNMENTS_DATA } from '../data/assignmentData';

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

  // 派題記錄
  const [assignments, setAssignments] = useState(ASSIGNMENTS_DATA);

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

  // 新增派題記錄
  const addAssignment = useCallback((assignment) => {
    setAssignments((prev) => [
      ...prev,
      { ...assignment, id: `assign-${Date.now()}` },
    ]);
  }, []);

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
