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
import AuditLogsPage from './features/audit/AuditLogsPage';
import MemberDetailsPage from './features/members/MemberDetailsPage';
import MessageList from './features/messages/MessageList';
import Settings from "./features/settings/Settings";
import DateMockTool from './features/testing/DateMockTool';

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
        
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<MemberDetailsPage />} />
          <Route path="/activities" element={<ActivitiesList />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/hours" element={<HoursLog />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/messages" element={<MessageList />} />
          {(user?.role === 'admin' || user?.role === 'superuser') && (
            <>
              <Route path="/admin" element={<AdminDashboard member={user} />} />
              <Route path="/members" element={<MemberList />} />
              <Route path="/members/:id/edit" element={<MemberDetailsPage />} />
              <Route path="/assign-password" element={<AssignPassword />} />
              <Route path="/settings" element={<Settings />} />
            </>
          )}
          {user?.role === 'superuser' && (
            <Route path="/super-user" element={<SuperUserDashboard member={user} />} />
          )}
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50">
          <DateMockTool />
        </div>
      )}
    </AuthProvider>
  );
}

export default App;