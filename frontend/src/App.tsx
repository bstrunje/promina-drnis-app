// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Navigation from '../components/Navigation';
import AuthProvider from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Toaster } from "@components/ui/toaster";
import { ToastProvider } from "@components/ui/use-toast";
import { TimeZoneProvider } from './context/TimeZoneContext';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import { BrandingProvider } from './contexts/BrandingContext';
import SpeedInsightsWrapper from './components/SpeedInsights';
import BrandingDemo from './components/BrandingDemo';
import Footer from './components/Footer';

// Lazy učitavanje većih stranica radi smanjenja početnog bundle-a
const ActivitiesList = lazy(() => import('./features/activities/ActivitiesList'));
const MemberList = lazy(() => import('./features/members/MemberList'));
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
const AssignPassword = lazy(() => import('./features/members/AssignPassword'));
const AuditLogsPage = lazy(() => import('./features/audit/AuditLogsPage'));
const MessageList = lazy(() => import('./features/messages/MessageList'));
const Settings = lazy(() => import('./features/settings/Settings'));
const SystemManagerRoutes = lazy(() => import('./features/systemManager/SystemManagerRoutes'));
const DutyCalendar = lazy(() => import('./features/duty/DutyCalendar'));

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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {user && <Navigation user={user} onLogout={() => { void handleLogout(); }} />}
      <main className="flex-1">
        <Routes>
        {/* System Manager rute - potpuno odvojene od postojećeg sustava autentikacije */}
        <Route path="/system-manager/*" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><SystemManagerRoutes /></Suspense>} />
        
        <Route path="/" element={!user ? <Suspense fallback={<div className="p-6">Učitavanje...</div>}><LoginPage /></Suspense> : <Navigate to={getDashboardRoute()} replace />} />
        <Route path="/login" element={!user ? <Suspense fallback={<div className="p-6">Učitavanje...</div>}><LoginPage /></Suspense> : <Navigate to={getDashboardRoute()} replace />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDetailsPageLazy /></Suspense>} />
          {/* Lazy učitavanje ActivitiesList i većih activity stranica */}
          <Route path="/activities" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivitiesList /></Suspense>} />
          <Route path="/activities/category/:type_id" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityCategoryPageLazy /></Suspense>} />
          <Route path="/activities/year/:year" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityCategoryPageLazy /></Suspense>} />
          <Route path="/activities/:activityId" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityDetailPageLazy /></Suspense>} />
          <Route path="/activities/:activityId/edit" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><EditActivityPage /></Suspense>} />
          <Route path="/members/:memberId/activities-overview" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityOverviewPage /></Suspense>} />
          <Route path="/members/:memberId/activities/:year" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivityYearPageLazy /></Suspense>} />
          <Route path="/events" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><EventsList /></Suspense>} />
          <Route path="/hours" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><HoursLog /></Suspense>} />
          <Route path="/audit-logs" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><AuditLogsPage /></Suspense>} />
          <Route path="/messages" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MessageList /></Suspense>} />
          {/* Omogućavanje pristupa listi članova svim korisnicima, ne samo adminu i superuser-u */}
          <Route path="/members" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberList /></Suspense>} />
          <Route path="/members/:id" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDetailsPageLazy /></Suspense>} />
          
          {/* Duty Calendar - dostupno svim prijavljenim članovima */}
          <Route path="/duty-calendar" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><DutyCalendar /></Suspense>} />
          
          {/* Dashboard rute za različite uloge korisnika */}
          {user && <Route path="/member/dashboard" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDashboard member={user} /></Suspense>} />}
          
          {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
            <>
              <Route path="/administrator" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><AdminDashboard member={user} /></Suspense>} />
              <Route path="/administrator/dashboard" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><AdminDashboard member={user} /></Suspense>} />
              {/* Putanja /members je sad već definirana iznad za sve korisnike */}
              <Route path="/members/:id/edit" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><MemberDetailsPageLazy /></Suspense>} />
              <Route path="/assign-password" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><AssignPassword /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><Settings /></Suspense>} />
              <Route path="/admin/activities" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><ActivitiesAdminPageLazy /></Suspense>} /> {/* Nova ruta za administraciju aktivnosti */}
            </>
          )}
          {user?.role === 'member_superuser' && (
            <>
              {/* Standardizirana ruta za SuperUser dashboard */}
              <Route path="/superuser/dashboard" element={<Suspense fallback={<div className="p-6">Učitavanje...</div>}><SuperUserDashboard member={user} /></Suspense>} />
              {/* Preusmjeravanje sa stare rute na standardiziranu */}
              <Route path="/super-user" element={<Navigate to="/superuser/dashboard" replace />} />
            </>
          )}
        </Route>
      </Routes>
      </main>
      {user && <Footer />}
    </div>
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
              {import.meta.env.DEV && (
                <div className="fixed bottom-4 right-4 z-50">
                  {/* Development branding demo - dodaj ?branding=demo u URL za prikaz */}
                  {new URLSearchParams(window.location.search).get('branding') === 'demo' && (
                    <div className="fixed inset-4 bg-white shadow-2xl rounded-lg overflow-auto z-50">
                      <div className="sticky top-0 bg-white border-b p-2 flex justify-between items-center">
                        <h2 className="font-bold">Branding Demo</h2>
                        <button
                          onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete('branding');
                            window.location.href = url.toString();
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                      <BrandingDemo />
                    </div>
                  )}
                </div>
              )}
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