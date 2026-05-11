import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import QuizCreateWizard from './pages/teacher/quiz/QuizCreateWizard';
import TeacherReport from './pages/teacher/TeacherReport';
import DashboardLayout from './pages/teacher/dashboard/DashboardLayout';
import OverviewPage from './pages/teacher/dashboard/OverviewPage';
import ClassesPage from './pages/teacher/dashboard/ClassesPage';
import NodesPage from './pages/teacher/dashboard/NodesPage';
import MisconceptionsPage from './pages/teacher/dashboard/MisconceptionsPage';
import StudentReportsPage from './pages/teacher/dashboard/StudentReportsPage';
import ClassDetailPage from './pages/teacher/dashboard/ClassDetailPage';
import QuizLibrary from './pages/teacher/QuizLibrary';
import AssignmentManagement from './pages/teacher/AssignmentManagement';
import ClassManagement from './pages/teacher/ClassManagement';
import ClassDetail from './pages/teacher/ClassDetail';
import KnowledgeMap from './pages/teacher/KnowledgeMap';
import CustomKnowledgeMap from './pages/teacher/CustomKnowledgeMap';
import MisconceptionCauses from './pages/teacher/MisconceptionCauses';
import ScenarioLibrary from './pages/teacher/scenarios/ScenarioLibrary';
import ScenarioCreateWizard from './pages/teacher/scenarios/ScenarioCreateWizard';
import DiagnosisLogs from './pages/teacher/DiagnosisLogs';
import StudentDiagnosisReport from './pages/teacher/StudentDiagnosisReport';
import TreatmentLogs from './pages/teacher/TreatmentLogs';
import TreatmentLogDetail from './pages/teacher/TreatmentLogDetail';
import StudentHome from './pages/student/StudentHome';
import StudentQuiz from './pages/student/StudentQuiz';
import ScenarioChat from './pages/student/ScenarioChat';
import StudentReport from './pages/student/StudentReport';

const Teacher = ({ children }) => <RequireAuth role="teacher">{children}</RequireAuth>;
const Student = ({ children }) => <RequireAuth role="student">{children}</RequireAuth>;

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            {/* 教師端 */}
            <Route path="/teacher" element={<Teacher><TeacherDashboard /></Teacher>} />
            <Route path="/teacher/dashboard" element={<Teacher><DashboardLayout /></Teacher>}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="nodes" element={<NodesPage />} />
              <Route path="misconceptions" element={<MisconceptionsPage />} />
              <Route path="students" element={<StudentReportsPage />} />
              <Route path="class-detail" element={<ClassDetailPage />} />
            </Route>
            <Route path="/teacher/quiz/create" element={<Teacher><QuizCreateWizard /></Teacher>} />
            <Route path="/teacher/quizzes" element={<Teacher><QuizLibrary /></Teacher>} />
            <Route path="/teacher/assignments" element={<Navigate to="/teacher/assignments/diagnosis" replace />} />
            <Route path="/teacher/assignments/diagnosis" element={<Teacher><AssignmentManagement initialTab="diagnosis" /></Teacher>} />
            <Route path="/teacher/assignments/scenarios" element={<Teacher><AssignmentManagement initialTab="scenario" /></Teacher>} />
            <Route path="/teacher/classes" element={<Teacher><ClassManagement /></Teacher>} />
            <Route path="/teacher/classes/:classId" element={<Teacher><ClassDetail /></Teacher>} />
            <Route path="/teacher/knowledge-map" element={<Teacher><KnowledgeMap /></Teacher>} />
            <Route path="/teacher/custom-knowledge-map" element={<Teacher><CustomKnowledgeMap /></Teacher>} />
            <Route path="/teacher/misconception-causes" element={<Teacher><MisconceptionCauses /></Teacher>} />
            {/* 情境治療模組（spec-08） */}
            <Route path="/teacher/scenarios" element={<Teacher><ScenarioLibrary /></Teacher>} />
            <Route path="/teacher/scenarios/create" element={<Teacher><ScenarioCreateWizard /></Teacher>} />
            <Route path="/teacher/scenarios/:scenarioQuizId/edit" element={<Teacher><ScenarioCreateWizard /></Teacher>} />
            <Route path="/teacher/diagnosis-logs" element={<Teacher><DiagnosisLogs /></Teacher>} />
            <Route path="/teacher/students/:studentId/report" element={<Teacher><StudentDiagnosisReport /></Teacher>} />
            <Route path="/teacher/treatment-logs" element={<Teacher><TreatmentLogs /></Teacher>} />
            <Route path="/teacher/treatment-logs/:sessionId" element={<Teacher><TreatmentLogDetail /></Teacher>} />
            {/* 保留舊路由避免失效 */}
            <Route path="/teacher/report" element={<Teacher><TeacherReport /></Teacher>} />

            {/* 學生端 */}
            <Route path="/student" element={<Student><StudentHome /></Student>} />
            <Route path="/student/quiz/:quizId" element={<Student><StudentQuiz /></Student>} />
            <Route path="/student/scenario/:scenarioQuizId" element={<Student><ScenarioChat /></Student>} />
            <Route path="/student/report" element={<Student><StudentReport /></Student>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
