import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Loading } from './components/AppShell.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Courses = lazy(() => import('./pages/Courses.jsx'));
const CourseDetail = lazy(() => import('./pages/CourseDetail.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const StartJourney = lazy(() => import('./pages/StartJourney.jsx'));
const Plan = lazy(() => import('./pages/Plan.jsx'));
const Today = lazy(() => import('./pages/Today.jsx'));
const Competencies = lazy(() => import('./pages/Competencies.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Events = lazy(() => import('./pages/Events.jsx'));
const EventDetail = lazy(() => import('./pages/EventDetail.jsx'));
const Lesson = lazy(() => import('./pages/Lesson.jsx'));
const Lab = lazy(() => import('./pages/Lab.jsx'));
const Tutor = lazy(() => import('./pages/Tutor.jsx'));
const Community = lazy(() => import('./pages/Community.jsx'));
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'));
const Aptitude = lazy(() => import('./pages/Aptitude.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Checkpoint = lazy(() => import('./pages/Checkpoint.jsx'));
const AttemptReview = lazy(() => import('./pages/AttemptReview.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function Protected({ children }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') {
    return (
      <div className="page">
        <Loading rows={4} height={72} />
      </div>
    );
  }
  if (!auth.isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function GuestOnly({ children }) {
  const auth = useAuth();
  if (auth.status === 'loading') return <div className="page"><Loading rows={3} height={64} /></div>;
  if (auth.isAuthed) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div className="page"><Loading rows={4} height={72} /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        <Route path="/reset-password" element={<GuestOnly><ResetPassword /></GuestOnly>} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/courses" element={<Protected><Courses /></Protected>} />
        <Route path="/courses/:slug" element={<Protected><CourseDetail /></Protected>} />
        <Route path="/courses/:slug/roadmap" element={<Protected><Roadmap /></Protected>} />
        <Route path="/courses/:slug/start" element={<Protected><StartJourney /></Protected>} />
        <Route path="/courses/:slug/plan" element={<Protected><Plan /></Protected>} />
        <Route path="/courses/:slug/readiness" element={<Protected><Competencies /></Protected>} />
        <Route path="/courses/:slug/:lessonSlug" element={<Protected><Lesson /></Protected>} />
        <Route path="/checkpoints/:id" element={<Protected><Checkpoint /></Protected>} />
        <Route path="/checkpoints/:id/attempt/:submissionId" element={<Protected><AttemptReview /></Protected>} />
        <Route path="/plan" element={<Protected><Today /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/events" element={<Protected><Events /></Protected>} />
        <Route path="/events/:slug" element={<Protected><EventDetail /></Protected>} />
        <Route path="/lab" element={<Protected><Lab /></Protected>} />
        <Route path="/tutor" element={<Protected><Tutor /></Protected>} />
        <Route path="/community" element={<Protected><Community /></Protected>} />
        <Route path="/community/:id" element={<Protected><PostDetail /></Protected>} />
        <Route path="/aptitude" element={<Protected><Aptitude /></Protected>} />
        <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
