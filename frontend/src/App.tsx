// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Navigation from '../components/Navigation';
import AuthProvider from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Toaster } from "@components/ui/toaster";
import { ToastProvider } from "@components/ui/use-toast";
import { TimeZoneProvider } from './context/TimeZoneContext';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import { BrandingProvider } from './context/BrandingContext';
import { useBrandingContext } from './context/useBrandingContext';
import { useFavicon } from './hooks/useFavicon';
import SpeedInsightsWrapper from './components/SpeedInsights';
import Footer from './components/Footer';
import TenantSelector from './components/TenantSelector';

// Lazy učitavanje većih stranica radi smanjenja početnog bundle-a
const ActivitiesList = lazy(() => import('./features/activities/ActivitiesList'));
const MemberList = lazy(() => import('./features/members/MemberList'));
const MembersStatisticsPage = lazy(() => import('./features/members/MembersStatisticsPage'));
const MemberDetailsPageLazy = lazy(() => import('./features/members/MemberDetailsPage'));
const ActivityCategoryPageLazy = lazy(() => import('./features/activities/ActivityCategoryPage'));
const ActivityDetailPageLazy = lazy(() => import('./features/activities/ActivityDetailPage'));
const ActivityYearPageLazy = lazy(() => import('./features/activities/ActivityYearPage'));
const ActivitiesAdminPageLazy = lazy(() => import('./features/activities/ActivitiesAdminPage'));

// Dodatno lazificiramo stranice koje su do sada bile eager
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const AdminDashboard = lazy(() => import('./features/dashboard/AdminDashboard'));
const SuperUserDashboard = lazy(() => import('./features/dashboard/SuperUserDashboard'));
const MemberDashboard = lazy(() => import('./features/dashboard/MemberDashboard'));
const ActivityOverviewPage = lazy(() => import('./features/activities/ActivityOverviewPage'));
const EditActivityPage = lazy(() => import('./features/activities/EditActivityPage'));
const EventsList = lazy(() => import('./features/events/EventsList'));
const HoursLog = lazy(() => import('./features/hours/HoursLog'));

const MessageList = lazy(() => import('./features/messages/MessageList'));
const Settings = lazy(() => import('./features/settings/Settings'));
const SystemManagerRoutes = lazy(() => import('./features/systemManager/SystemManagerRoutes'));
const DutyCalendar = lazy(() => import('./features/duty/DutyCalendar'));

/**
 * Wrapper komponenta za org-specific rute
 * Izvlači orgSlug iz URL-a i omogućava pristup svim rutama unutar organizacije
 */
function OrgRoutes() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user, logout } = useAuth();
  const { branding } = useBrandingContext();
  
  // Dinamički postavi favicon na tenant logo ili fallback
  useFavicon(branding?.logo_path ?? '/pwa/icons/icon-192x192.png');
  
  // Debug: provjeri je li orgSlug uspješno izvučen
  if (import.meta.env.DEV) console.log('[APP] OrgRoutes - orgSlug:', orgSlug);

  const handleLogout = async () => {
    try {
      if (import.meta.env.DEV) console.log('Započinjem odjavu korisnika iz App komponente...');
      
      await logout();
      // Preusmjeravanje prepustiti ProtectedRoute-u kako bi izbjegli dvostruke navigacije
      if (import.meta.env.DEV) console.log('Odjava dovršena; preusmjeravanje će odraditi ProtectedRoute.');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Greška prilikom odjave korisnika:', error);
      // U slučaju greške, i dalje ne forsiramo navigaciju ovdje
    }
  };

  const getDashboardRoute = () => {
    if (!user) return `/${orgSlug}/login`;
    
    switch (user.role) {
      case 'member_administrator':
        return `/${orgSlug}/administrator/dashboard`;
      case 'member_superuser':
        return `/${orgSlug}/superuser/dashboard`;
      case 'member':
        return `/${orgSlug}/member/dashboard`;
      default:
        return `/${orgSlug}/profile`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {user && <Navigation user={user} onLogout={() => { void handleLogout(); }} />}
      <main className="flex-1">
        <Routes>
          {/* Organization System Manager rute - odvojene od member auth-a */}
          <Route 
            path="/system-manager/*" 
            element={
              <Suspense fallback={<div className="p-6">Učitavanje...</div>}>
                <SystemManagerRoutes />
              </Suspense>
            } 
          />
          
          <Route path="/" element={!user ? <Suspense fallback={<div className="p-6">Učitavanje...</div>}><LoginPage /></Suspense> : <Navigate to={getDashboardRoute()} replace />} />
          <Route path="/login" element={!user ? <Suspense fallback={<div className="p-6">Učitavanje...</div>}><LoginPage /></Suspense> : <Navigate to={getDashboardRoute()} replace />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDetailsPageLazy /></Suspense>} />
            <Route path="/activities" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivitiesList /></Suspense>} />
            <Route path="/activities/category/:type_id" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityCategoryPageLazy /></Suspense>} />
            <Route path="/activities/year/:year" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityCategoryPageLazy /></Suspense>} />
            <Route path="/activities/:activityId" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityDetailPageLazy /></Suspense>} />
            <Route path="/activities/:activityId/edit" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><EditActivityPage /></Suspense>} />
            <Route path="/members/:memberId/activities-overview" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityOverviewPage /></Suspense>} />
            <Route path="/members/:memberId/activities/:year" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityYearPageLazy /></Suspense>} />
            <Route path="/events" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><EventsList /></Suspense>} />
            <Route path="/hours" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><HoursLog /></Suspense>} />

            <Route path="/messages" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MessageList /></Suspense>} />
            <Route path="/members" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberList /></Suspense>} />
            <Route path="/members/statistics" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MembersStatisticsPage /></Suspense>} />
            <Route path="/members/:id" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDetailsPageLazy /></Suspense>} />
            
            <Route path="/duty-calendar" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><DutyCalendar /></Suspense>} />
            
            {user && <Route path="/member/dashboard" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDashboard /></Suspense>} />}
            
            {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
              <>
                <Route path="/administrator" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><AdminDashboard member={user} /></Suspense>} />
                <Route path="/administrator/dashboard" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><AdminDashboard member={user} /></Suspense>} />
                <Route path="/members/:id/edit" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDetailsPageLazy /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><Settings /></Suspense>} />
                <Route path="/admin/activities" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivitiesAdminPageLazy /></Suspense>} />
              </>
            )}
            {user?.role === 'member_superuser' && (
              <>
                <Route path="/superuser/dashboard" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><SuperUserDashboard member={user} /></Suspense>} />
                <Route path="/super-user" element={<Navigate to={`/${orgSlug}/superuser/dashboard`} replace />} />
              </>
            )}
          </Route>
        </Routes>
      </main>
      {user && <Footer />}
    </div>
  );
}

/**
 * Glavna App komponenta sa routing logikom
 */
function AppContent() {
  return (
    <Routes>
      {/* System Manager rute - potpuno odvojene od org context-a */}
      <Route 
        path="/system-manager/*" 
        element={
          <Suspense fallback={<div className="p-6">Učitavanje...</div>}>
            <SystemManagerRoutes />
          </Suspense>
        } 
      />
      
      {/* Organization-specific rute - sve unutar /:orgSlug/* */}
      <Route path="/:orgSlug/*" element={<OrgRoutes />} />
      
      {/* Root path - Tenant Selector (MULTI-TENANCY: NE smije biti hardcoded fallback!) */}
      <Route path="/" element={<TenantSelector />} />
    </Routes>
  );
}

function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <TimeZoneProvider>
          <UnreadMessagesProvider>
            <ToastProvider>

              <AppContent />
              <SpeedInsightsWrapper />
              <Toaster />
            </ToastProvider>
          </UnreadMessagesProvider>
        </TimeZoneProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}

export default App;