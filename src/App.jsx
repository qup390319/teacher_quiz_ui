import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import QuizCreateWizard from './pages/teacher/quiz/QuizCreateWizard';
import TeacherReport from './pages/teacher/TeacherReport';
import DashboardReport from './pages/teacher/DashboardReport';
import QuizLibrary from './pages/teacher/QuizLibrary';
import AssignmentManagement from './pages/teacher/AssignmentManagement';
import ClassManagement from './pages/teacher/ClassManagement';
import ClassDetail from './pages/teacher/ClassDetail';
import KnowledgeMap from './pages/teacher/KnowledgeMap';
import StudentQuiz from './pages/student/StudentQuiz';
import StudentReport from './pages/student/StudentReport';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          {/* 教師端 */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/dashboard" element={<DashboardReport />} />
          <Route path="/teacher/quiz/create" element={<QuizCreateWizard />} />
          <Route path="/teacher/quizzes" element={<QuizLibrary />} />
          <Route path="/teacher/assignments" element={<AssignmentManagement />} />
          <Route path="/teacher/classes" element={<ClassManagement />} />
          <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
          <Route path="/teacher/knowledge-map" element={<KnowledgeMap />} />
          {/* 保留舊路由避免失效 */}
          <Route path="/teacher/report" element={<TeacherReport />} />

          {/* 學生端 */}
          <Route path="/student" element={<StudentQuiz />} />
          <Route path="/student/report" element={<StudentReport />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
