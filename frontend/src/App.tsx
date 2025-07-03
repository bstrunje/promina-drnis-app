// frontend/src/App.tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/dashboard/AdminDashboard';
import SuperUserDashboard from './features/dashboard/SuperUserDashboard';
import MemberDashboard from './features/dashboard/MemberDashboard';
import MemberList from './features/members/MemberList';
import ProtectedRoute from '../components/ProtectedRoute';
import Navigation from '../components/Navigation';
import { AuthProvider, useAuth } from './context/AuthContext';
import ActivitiesList from './features/activities/ActivitiesList';
import ActivityCategoryPage from './features/activities/ActivityCategoryPage';
import ActivityDetailPage from './features/activities/ActivityDetailPage';
import EditActivityPage from './features/activities/EditActivityPage';
import ActivitiesAdminPage from './features/activities/ActivitiesAdminPage';
import EventsList from './features/events/EventsList';
import HoursLog from './features/hours/HoursLog';
import AssignPassword from './features/members/AssignPassword';
import AuditLogsPage from './features/audit/AuditLogsPage';
import MemberDetailsPage from './features/members/MemberDetailsPage';
import MessageList from './features/messages/MessageList';
import Settings from "./features/settings/Settings";
import { Toaster } from "@components/ui/toaster";
import { ToastProvider } from "@components/ui/use-toast";
import { TimeZoneProvider } from './context/TimeZoneContext';
import SystemManagerRoutes from './features/systemManager/SystemManagerRoutes';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import Clock from './components/common/Clock';

function AppContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log('Započinjem odjavu korisnika iz App komponente...');
      
      // Pozivamo funkciju za odjavu
      await logout();
      
      // Koristimo replace: true kako bismo spriječili povratak na prethodnu stranicu nakon odjave
      // i osigurali da korisnik ne može koristiti back button za povratak na zaštićene stranice
      navigate("/login", { replace: true });
      
      console.log('Korisnik uspješno preusmjeren na login stranicu');
    } catch (error) {
      console.error('Greška prilikom odjave korisnika:', error);
      
      // Čak i u slučaju greške, preusmjeravamo korisnika na login
      navigate("/login", { replace: true });
    }
  };

  // Pomoćna funkcija za određivanje početne stranice na temelju uloge
  const getDashboardRoute = () => {
    if (!user) return "/login";
    
    switch (user.role) {
      case 'member_administrator':
        return "/administrator/dashboard";
      case 'member_superuser':
        return "/superuser/dashboard";
      case 'member':
        return "/member/dashboard";
      default:
        return "/profile";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {user && <Navigation user={user} onLogout={() => { void handleLogout(); }} />}
      <Routes>
        {/* System Manager rute - potpuno odvojene od postojećeg sustava autentikacije */}
        <Route path="/system-manager/*" element={<SystemManagerRoutes />} />
        
        <Route path="/" element={!user ? <LoginPage /> : <Navigate to={getDashboardRoute()} replace />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={getDashboardRoute()} replace />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<MemberDetailsPage />} />
          <Route path="/activities" element={<ActivitiesList />} />
          <Route path="/activities/category/:type_id" element={<ActivityCategoryPage />} />
          <Route path="/activities/year/:year" element={<ActivityCategoryPage />} />
          <Route path="/activities/:activityId" element={<ActivityDetailPage />} />
          <Route path="/activities/:activityId/edit" element={<EditActivityPage />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/hours" element={<HoursLog />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/messages" element={<MessageList />} />
          {/* Omogućavanje pristupa listi članova svim korisnicima, ne samo adminu i superuser-u */}
          <Route path="/members" element={<MemberList />} />
          <Route path="/members/:id" element={<MemberDetailsPage />} />
          
          {/* Dashboard rute za različite uloge korisnika */}
          {user && <Route path="/member/dashboard" element={<MemberDashboard member={user} />} />}
          
          {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
            <>
              <Route path="/administrator" element={<AdminDashboard member={user} />} />
              <Route path="/administrator/dashboard" element={<AdminDashboard member={user} />} />
              {/* Putanja /members je sad već definirana iznad za sve korisnike */}
              <Route path="/members/:id/edit" element={<MemberDetailsPage />} />
              <Route path="/assign-password" element={<AssignPassword />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/activities" element={<ActivitiesAdminPage />} /> {/* Nova ruta za administraciju aktivnosti */}
            </>
          )}
          {user?.role === 'member_superuser' && (
            <>
              {/* Standardizirana ruta za SuperUser dashboard */}
              <Route path="/superuser/dashboard" element={<SuperUserDashboard member={user} />} />
              {/* Preusmjeravanje sa stare rute na standardiziranu */}
              <Route path="/super-user" element={<Navigate to="/superuser/dashboard" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TimeZoneProvider>
        <UnreadMessagesProvider>
          <ToastProvider>
            <Clock /> {/* Dodajem komponentu sata */}
            <AppContent />
            {import.meta.env.DEV && (
              <div className="fixed bottom-4 right-4 z-50">

              </div>
            )}
            <Toaster />
          </ToastProvider>
        </UnreadMessagesProvider>
      </TimeZoneProvider>
    </AuthProvider>
  );
}

export default App;