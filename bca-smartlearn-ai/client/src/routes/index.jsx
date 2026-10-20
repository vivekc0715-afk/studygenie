import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import {
  NotFoundPage,
  RequireAuth,
  RequireGuest,
  RequireOnboarding,
} from '../components/layout/route-guards';
import { PageLoader } from '../components/ui/spinner';
import { useAuthStore } from '../stores/authStore';

/* --------------------------------------------------------------- public --- */

const Login = lazy(() => import('../pages/auth/login'));
const Register = lazy(() => import('../pages/auth/register'));
const VerifyEmail = lazy(() => import('../pages/auth/verify-email'));
const ForgotPassword = lazy(() => import('../pages/auth/forgot-password'));
const ResetPassword = lazy(() => import('../pages/auth/reset-password'));

/* -------------------------------------------------------------- student --- */

const Onboarding = lazy(() => import('../pages/student/onboarding'));
const StudentDashboard = lazy(() => import('../pages/student/dashboard'));
const ChatbotPage = lazy(() => import('../pages/student/chatbot-page'));
const AcademicProfile = lazy(() => import('../pages/student/profile'));
const SemesterPlanner = lazy(() => import('../pages/student/semester-planner'));
const Subjects = lazy(() => import('../pages/student/subjects'));
const SubjectDetail = lazy(() => import('../pages/student/subject-detail'));
const NotesGenerator = lazy(() => import('../pages/student/notes-generator'));
const NotesLibrary = lazy(() => import('../pages/student/notes-library'));
const NoteDetail = lazy(() => import('../pages/student/note-detail'));
const Compiler = lazy(() => import('../pages/student/compiler'));
const Practice = lazy(() => import('../pages/student/practice'));
const ExerciseDetail = lazy(() => import('../pages/student/exercise-detail'));
const Tests = lazy(() => import('../pages/student/tests'));
const TestRunner = lazy(() => import('../pages/student/test-runner'));
const Results = lazy(() => import('../pages/student/results'));
const AttemptReview = lazy(() => import('../pages/student/attempt-review'));
const Predictions = lazy(() => import('../pages/student/predictions'));
const Videos = lazy(() => import('../pages/student/videos'));
const Timetable = lazy(() => import('../pages/student/timetable'));
const Analytics = lazy(() => import('../pages/student/analytics'));
const Bookmarks = lazy(() => import('../pages/student/bookmarks'));
const Notifications = lazy(() => import('../pages/student/notifications'));
const StudentSettings = lazy(() => import('../pages/student/settings'));

/* ---------------------------------------------------------------- admin --- */

const AdminDashboard = lazy(() => import('../pages/admin/dashboard'));
const AdminStudents = lazy(() => import('../pages/admin/students'));
const AdminStudentDetail = lazy(() => import('../pages/admin/student-detail'));
const AdminEntity = lazy(() => import('../pages/admin/entity-page'));
const AdminSettings = lazy(() => import('../pages/admin/settings'));
const AdminAuditLogs = lazy(() => import('../pages/admin/audit-logs'));
const AdminSystemHealth = lazy(() => import('../pages/admin/system-health'));

function AdminIndexRedirect() {
  const role = useAuthStore((state) => state.user?.role);
  return <Navigate to={role === 'super_admin' ? '/admin' : '/app'} replace />;
}

export default function AppRoutes({ status }) {
  // Wait for the first session lookup so guards never flash the wrong screen.
  if (status === 'idle' || status === 'loading') return <PageLoader label="Starting BCA SmartLearn AI…" />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ------------------------------------------------------- public */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<RequireGuest />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* ------------------------------------------------------ student */}
        <Route element={<RequireAuth role="student" />}>
          <Route path="/app/onboarding" element={<Onboarding />} />

          <Route element={<RequireOnboarding />}>
            <Route path="/app" element={<AppShell showRightPanelToggle />}>
              <Route index element={<StudentDashboard />} />
              <Route path="chat" element={<ChatbotPage />} />
              <Route path="profile" element={<AcademicProfile />} />
              <Route path="semester" element={<SemesterPlanner />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="subjects/:subjectId" element={<SubjectDetail />} />
              <Route path="notes" element={<NotesLibrary />} />
              <Route path="notes/generate" element={<NotesGenerator />} />
              <Route path="notes/:noteId" element={<NoteDetail />} />
              <Route path="compiler" element={<Compiler />} />
              <Route path="practice" element={<Practice />} />
              <Route path="practice/:exerciseId" element={<ExerciseDetail />} />
              <Route path="tests" element={<Tests />} />
              <Route path="tests/:testId" element={<TestRunner />} />
              <Route path="results" element={<Results />} />
              <Route path="results/:attemptId" element={<AttemptReview />} />
              <Route path="predictions" element={<Predictions />} />
              <Route path="videos" element={<Videos />} />
              <Route path="planner" element={<Timetable />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="bookmarks" element={<Bookmarks />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<StudentSettings />} />
            </Route>
          </Route>
        </Route>

        {/* -------------------------------------------------------- admin */}
        <Route element={<RequireAuth role="super_admin" />}>
          <Route path="/admin" element={<AppShell />}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="students/:studentId" element={<AdminStudentDetail />} />
            <Route path="system-health" element={<AdminSystemHealth />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path=":entity" element={<AdminEntity />} />
          </Route>
        </Route>

        {/* --------------------------------------------------- fallbacks */}
        <Route path="/dashboard" element={<AdminIndexRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
