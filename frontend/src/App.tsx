// frontend/src/App.tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/dashboard/AdminDashboard';
import SuperUserDashboard from './features/dashboard/SuperUserDashboard';
import MemberList from './features/members/MemberList';
import ProtectedRoute from '../components/ProtectedRoute';
import Navigation from '../components/Navigation';
import { AuthProvider, useAuth } from './context/AuthContext';
import ActivitiesList from './features/activities/ActivitiesList';
import EventsList from './features/events/EventsList';
import HoursLog from './features/hours/HoursLog';
import AssignPassword from './features/members/AssignPassword';
import MemberProfile from './features/members/MemberProfile';
import AuditLogsPage from './features/audit/AuditLogsPage';

function AppContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {user && <Navigation user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/" element={!user ? <LoginPage /> : <Navigate to="/profile" replace />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/profile" replace />} />
        
        <Route element={<ProtectedRoute allowedRoles={['member', 'admin', 'superuser']} />}>
          <Route path="/profile" element={<MemberProfile />} />
          <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/activities" element={<ActivitiesList />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/hours" element={<HoursLog />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'superuser']} />}>
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/super-user" element={user ? <SuperUserDashboard member={user} /> : null} />
          <Route path="/admin" element={user ? <AdminDashboard member={user} /> : null} />
          <Route path="/members" element={<MemberList />} />
          <Route path="/assign-password" element={<AssignPassword />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;