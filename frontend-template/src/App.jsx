import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// SmartRedirect: used for the wildcard * route.
// Waits until auth is done loading before deciding where to go.
// Prevents premature /login redirect when browser back is pressed during auth init.
const SmartRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div id="preloader">
            <div id="status">
                <div className="spinner-chase">
                    <div className="chase-dot"></div><div className="chase-dot"></div>
                    <div className="chase-dot"></div><div className="chase-dot"></div>
                    <div className="chase-dot"></div><div className="chase-dot"></div>
                </div>
            </div>
        </div>
    );
    return <Navigate to={user ? '/dashboard' : '/login'} replace />;
};

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Events from './pages/admin/Events';
import AuditLogs from './pages/admin/AuditLogs';
import AdminReports from './pages/admin/AdminReports';
import EventAnalytics from './pages/admin/EventAnalytics';
import CertificateManager from './pages/admin/CertificateManager';
import EventDetail from './pages/admin/EventDetail';
import BudgetManagement from './pages/admin/BudgetManagement';
import AdminScores from './pages/admin/AdminScores';
import AdminResults from './pages/admin/AdminResults';
import AdminCertificates from './pages/admin/AdminCertificates';
import Categories from './pages/admin/Categories';
import AdminParticipants from './pages/admin/AdminParticipants';

// Student Pages
import StudentEvents from './pages/student/StudentEvents';
import MyRegistrations from './pages/student/MyRegistrations';
import EventResults from './pages/student/EventResults';
import StudentCertificates from './pages/student/StudentCertificates';
import StudentDashboard from './pages/student/StudentDashboard';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import Approvals from './pages/faculty/Approvals';
import FacultyApprovalsList from './pages/faculty/FacultyApprovalsList';
import Attendance from './pages/faculty/Attendance';
import FacultyAttendanceList from './pages/faculty/FacultyAttendanceList';
import FacultyStatusList from './pages/faculty/FacultyStatusList';
import BudgetRequests from './pages/faculty/BudgetRequests';

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import ParticipantList from './pages/coordinator/ParticipantList';
import CoordinatorParticipants from './pages/coordinator/CoordinatorParticipants';

// Judge Pages
import JudgeDashboard from './pages/judge/JudgeDashboard';
import Scoring from './pages/judge/Scoring';
import JudgeResults from './pages/judge/JudgeResults';

// Common
import Profile from './pages/common/Profile';
import Dashboard from './pages/Dashboard';

// IMPORTANT: role values MUST match lowercase backend enum values:
// "admin", "faculty", "event_coordinator", "judge", "student"

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* All authenticated routes share the Layout via Outlet */}
                    <Route element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* Admin routes */}
                        <Route path="/admin/users" element={
                            <ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>
                        } />
                        <Route path="/admin/events" element={
                            <ProtectedRoute roles={['admin']}><Events /></ProtectedRoute>
                        } />
                        <Route path="/admin/audit" element={
                            <ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>
                        } />
                        <Route path="/admin/reports" element={
                            <ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>
                        } />
                        <Route path="/admin/reports/events/:eventId" element={
                            <ProtectedRoute roles={['admin', 'faculty']}><EventAnalytics /></ProtectedRoute>
                        } />
                        <Route path="/admin/certificates/:eventId" element={
                            <ProtectedRoute roles={['admin']}><CertificateManager /></ProtectedRoute>
                        } />

                        {/* Event Detail — accessible by admin, faculty, coordinator, judge */}
                        <Route path="/events/:eventId" element={
                            <ProtectedRoute roles={['admin','faculty','event_coordinator','judge']}>
                                <EventDetail />
                            </ProtectedRoute>
                        } />

                        {/* Admin Budget Management */}
                        <Route path="/admin/budgets" element={
                            <ProtectedRoute roles={['admin']}><BudgetManagement /></ProtectedRoute>
                        } />

                        {/* Admin Scoring, Results & Certificates */}
                        <Route path="/admin/scores" element={
                            <ProtectedRoute roles={['admin']}><AdminScores /></ProtectedRoute>
                        } />
                        <Route path="/admin/results" element={
                            <ProtectedRoute roles={['admin']}><AdminResults /></ProtectedRoute>
                        } />
                        <Route path="/admin/certificates" element={
                            <ProtectedRoute roles={['admin']}><AdminCertificates /></ProtectedRoute>
                        } />
                        <Route path="/admin/categories" element={
                            <ProtectedRoute roles={['admin']}><Categories /></ProtectedRoute>
                        } />
                        <Route path="/admin/participants" element={
                            <ProtectedRoute roles={['admin']}><AdminParticipants /></ProtectedRoute>
                        } />

                        {/* Student routes */}
                        <Route path="/student/events" element={
                            <ProtectedRoute roles={['student']}><StudentEvents /></ProtectedRoute>
                        } />
                        <Route path="/student/registrations" element={
                            <ProtectedRoute roles={['student']}><MyRegistrations /></ProtectedRoute>
                        } />
                        <Route path="/student/results" element={
                            <ProtectedRoute roles={['student']}><EventResults /></ProtectedRoute>
                        } />
                        <Route path="/student/results/:eventId" element={
                            <ProtectedRoute roles={['student']}><EventResults /></ProtectedRoute>
                        } />
                        <Route path="/student/certificates" element={
                            <ProtectedRoute roles={['student']}><StudentCertificates /></ProtectedRoute>
                        } />
                        <Route path="/student/dashboard" element={
                            <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
                        } />

                        {/* Faculty routes */}
                        <Route path="/faculty/dashboard" element={
                            <ProtectedRoute roles={['faculty']}><FacultyDashboard /></ProtectedRoute>
                        } />
                        <Route path="/faculty/approvals" element={
                            <ProtectedRoute roles={['faculty']}><FacultyApprovalsList /></ProtectedRoute>
                        } />
                        <Route path="/faculty/approvals/:eventId" element={
                            <ProtectedRoute roles={['faculty']}><Approvals /></ProtectedRoute>
                        } />
                        <Route path="/faculty/attendance" element={
                            <ProtectedRoute roles={['faculty']}><FacultyAttendanceList /></ProtectedRoute>
                        } />
                        <Route path="/faculty/attendance/:eventId" element={
                            <ProtectedRoute roles={['faculty', 'event_coordinator']}><Attendance /></ProtectedRoute>
                        } />
                        <Route path="/faculty/status" element={
                            <ProtectedRoute roles={['faculty']}><FacultyStatusList /></ProtectedRoute>
                        } />
                        <Route path="/faculty/budgets" element={
                            <ProtectedRoute roles={['faculty']}><BudgetRequests /></ProtectedRoute>
                        } />

                        {/* Coordinator routes */}
                        <Route path="/coordinator/dashboard" element={
                            <ProtectedRoute roles={['event_coordinator']}><CoordinatorDashboard /></ProtectedRoute>
                        } />
                        <Route path="/coordinator/participants" element={
                            <ProtectedRoute roles={['event_coordinator']}><CoordinatorParticipants /></ProtectedRoute>
                        } />
                        <Route path="/coordinator/events/:eventId/participants" element={
                            <ProtectedRoute roles={['event_coordinator']}><ParticipantList /></ProtectedRoute>
                        } />

                        {/* Judge routes */}
                        <Route path="/judge/events" element={
                            <ProtectedRoute roles={['judge']}><JudgeDashboard /></ProtectedRoute>
                        } />
                        <Route path="/judge/score/:eventId" element={
                            <ProtectedRoute roles={['judge']}><Scoring /></ProtectedRoute>
                        } />
                        <Route path="/judge/results/:eventId" element={
                            <ProtectedRoute roles={['judge']}><JudgeResults /></ProtectedRoute>
                        } />

                        {/* Common */}
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route path="*" element={<SmartRedirect />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
