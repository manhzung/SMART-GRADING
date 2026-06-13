import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAuthInit } from '../hooks/useAuthInit';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import EmailVerificationPendingPage from '../../pages/EmailVerificationPendingPage';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';
import VerifyEmailPage from '../../pages/VerifyEmailPage';
import ResetPasswordPage from '../../pages/ResetPasswordPage';
import DashboardPage from '../../pages/DashboardPage';
import ClassesPage from '../../pages/ClassesPage';
import ClassDetailPage from '../../pages/ClassDetailPage';
import ExamsPage from '../../pages/ExamsPage';
import ExamDetailPage from '../../pages/ExamDetailPage';
import CreateExamPage from '../../pages/CreateExamPage';
import EditExamPage from '../../pages/EditExamPage';
import SubmissionsPage from '../../pages/SubmissionsPage';
import { SubmissionDetailRoute } from '../../components/submission/SubmissionDetailRoute';
import ScanPage from '../../pages/ScanPage';
import ProfilePage from '../../pages/ProfilePage';
import QuestionBankPage from '../../pages/QuestionBankPage';
import AnalyticsPage from '../../pages/AnalyticsPage';
import AppealsPage from '../../pages/AppealsPage';
import SettingsPage from '../../pages/SettingsPage';
import HelpPage from '../../pages/HelpPage';
import NotFoundPage from '../../pages/NotFoundPage';
import AITutorPage from '../../features/ai-tutor/AITutorPage';
import Layout from '../components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  if (isLoading) {
    return null;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  if (isLoading) {
    return null;
  }
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function AppRoutes() {
  useAuthInit();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public-only authentication routes */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/email-verification-pending"
          element={
            <PublicOnlyRoute>
              <EmailVerificationPendingPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        
        {/* Verification route: can be accessed by both, token dictates behavior */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected Dashboard/App routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="classes/:id" element={<ClassDetailPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/new" element={<CreateExamPage />} />
          <Route path="exams/:id" element={<ExamDetailPage />} />
          <Route path="exams/:id/edit" element={<EditExamPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="submissions/:id" element={<SubmissionDetailRoute />} />
          <Route path="question-bank" element={<QuestionBankPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="appeals" element={<AppealsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="ai-tutor" element={<AITutorPage />} />
        </Route>

        {/* Catch-all 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
