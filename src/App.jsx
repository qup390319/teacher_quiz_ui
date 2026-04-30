import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import QuizCreateWizard from './pages/teacher/quiz/QuizCreateWizard';
import TeacherReport from './pages/teacher/TeacherReport';
import DashboardLayout from './pages/teacher/dashboard/DashboardLayout';
import OverviewPage from './pages/teacher/dashboard/OverviewPage';
import ClassesPage from './pages/teacher/dashboard/ClassesPage';
import NodesPage from './pages/teacher/dashboard/NodesPage';
import MisconceptionsPage from './pages/teacher/dashboard/MisconceptionsPage';
import ClassDetailPage from './pages/teacher/dashboard/ClassDetailPage';
import QuizLibrary from './pages/teacher/QuizLibrary';
import AssignmentManagement from './pages/teacher/AssignmentManagement';
import ScenarioAssignments from './pages/teacher/ScenarioAssignments';
import ClassManagement from './pages/teacher/ClassManagement';
import ClassDetail from './pages/teacher/ClassDetail';
import KnowledgeMap from './pages/teacher/KnowledgeMap';
import ScenarioLibrary from './pages/teacher/scenarios/ScenarioLibrary';
import ScenarioCreateWizard from './pages/teacher/scenarios/ScenarioCreateWizard';
import TreatmentLogs from './pages/teacher/TreatmentLogs';
import TreatmentLogDetail from './pages/teacher/TreatmentLogDetail';
import StudentHome from './pages/student/StudentHome';
import StudentQuiz from './pages/student/StudentQuiz';
import ScenarioChat from './pages/student/ScenarioChat';
import StudentReport from './pages/student/StudentReport';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          {/* 教師端 */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="nodes" element={<NodesPage />} />
            <Route path="misconceptions" element={<MisconceptionsPage />} />
            <Route path="class-detail" element={<ClassDetailPage />} />
          </Route>
          <Route path="/teacher/quiz/create" element={<QuizCreateWizard />} />
          <Route path="/teacher/quizzes" element={<QuizLibrary />} />
          <Route path="/teacher/assignments" element={<Navigate to="/teacher/assignments/diagnosis" replace />} />
          <Route path="/teacher/assignments/diagnosis" element={<AssignmentManagement />} />
          <Route path="/teacher/assignments/scenarios" element={<ScenarioAssignments />} />
          <Route path="/teacher/classes" element={<ClassManagement />} />
          <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
          <Route path="/teacher/knowledge-map" element={<KnowledgeMap />} />
          {/* 情境治療模組（spec-08） */}
          <Route path="/teacher/scenarios" element={<ScenarioLibrary />} />
          <Route path="/teacher/scenarios/create" element={<ScenarioCreateWizard />} />
          <Route path="/teacher/scenarios/:scenarioQuizId/edit" element={<ScenarioCreateWizard />} />
          <Route path="/teacher/treatment-logs" element={<TreatmentLogs />} />
          <Route path="/teacher/treatment-logs/:sessionId" element={<TreatmentLogDetail />} />
          {/* 保留舊路由避免失效 */}
          <Route path="/teacher/report" element={<TeacherReport />} />

          {/* 學生端 */}
          <Route path="/student" element={<StudentHome />} />
          <Route path="/student/quiz/:quizId" element={<StudentQuiz />} />
          <Route path="/student/scenario/:scenarioQuizId" element={<ScenarioChat />} />
          <Route path="/student/report" element={<StudentReport />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
