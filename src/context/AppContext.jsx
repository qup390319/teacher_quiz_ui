import { createContext, useContext, useState } from 'react';
import { defaultQuestions, QUIZZES_DATA } from '../data/quizData';
import { CLASSES_DATA } from '../data/classData';
import { ASSIGNMENTS_DATA } from '../data/assignmentData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState(null); // 'teacher' | 'student'

  // 教師出題狀態（出題精靈用）
  const [quizQuestions, setQuizQuestions] = useState([...defaultQuestions]);
  const [selectedNodeIds, setSelectedNodeIds] = useState([
    'INa-Ⅲ-8-01', 'INa-Ⅲ-8-03', 'INa-Ⅲ-8-05', 'INa-Ⅲ-8-06', 'Na-Ⅲ-8-07',
  ]);

  // 班級資料
  const [classes, setClasses] = useState(CLASSES_DATA);
  const [currentClassId, setCurrentClassId] = useState(null); // null = 全部班級

  // 考卷庫
  const [quizzes, setQuizzes] = useState(QUIZZES_DATA);

  // 派題記錄
  const [assignments, setAssignments] = useState(ASSIGNMENTS_DATA);

  // 衍生值
  const currentClass = classes.find((c) => c.id === currentClassId) ?? null;

  // 編輯班級成員
  const updateClassStudents = (classId, newStudents) => {
    setClasses((prev) =>
      prev.map((c) => c.id === classId ? { ...c, students: newStudents } : c)
    );
  };

  // 儲存/更新考卷
  const saveQuiz = (quiz) => {
    setQuizzes((prev) =>
      prev.some((q) => q.id === quiz.id)
        ? prev.map((q) => q.id === quiz.id ? quiz : q)
        : [...prev, quiz]
    );
  };

  // 新增派題記錄
  const addAssignment = (assignment) => {
    setAssignments((prev) => [
      ...prev,
      { ...assignment, id: `assign-${Date.now()}` },
    ]);
  };

  // 學生作答狀態
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [studentName] = useState('學生');

  const recordAnswer = (questionId, selectedTag, diagnosis) => {
    setStudentAnswers((prev) => {
      const exists = prev.find((a) => a.questionId === questionId);
      if (exists) return prev.map((a) => a.questionId === questionId ? { questionId, selectedTag, diagnosis } : a);
      return [...prev, { questionId, selectedTag, diagnosis }];
    });
  };

  const resetStudentAnswers = () => setStudentAnswers([]);

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
      // 考卷庫
      quizzes, saveQuiz,
      // 派題
      assignments, addAssignment,
      // 學生作答
      studentAnswers, recordAnswer, resetStudentAnswers,
      studentMisconceptions, correctCount,
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
