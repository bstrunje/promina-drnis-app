import React from 'react';
import { Navigate, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import ActivitiesList from '../src/features/activities/ActivitiesList';
import EventsList from '../src/features/events/EventsList';
import HoursLog from '../src/features/hours/HoursLog';
import MemberList from '../src/features/members/MemberList';
import LoginPage from '../src/features/auth/LoginPage';
import MemberDashboard from '../src/features/dashboard/MemberDashboard';
import AdminDashboard from '../src/features/dashboard/AdminDashboard';
import SuperUserDashboard from '../src/features/dashboard/SuperUserDashboard';
import Navigation from '../components/Navigation';
import './App.css';
import AssignPassword from './features/members/AssignPassword';

const Reports: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Reports</h1>
    <p>Reports functionality coming soon.</p>
  </div>
);

const AppRoutes: React.FC = () => {
  const { user, logout } = useAuth();

  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <div className="min-h-screen bg-gray-50">
          <Navigation user={user} onLogout={logout} />
          <main className="container mx-auto px-4">
            <Outlet />
          </main>
        </div>
      ),
      children: [
        { 
          index: true, 
          element: <Navigate to="/dashboard" replace /> 
        },
        { 
          path: "login", 
          element: user ? <Navigate to="/dashboard" replace /> : <LoginPage /> 
        },
        { 
          path: "dashboard", 
          element: user ? (
            user.role === 'member' ? <MemberDashboard member={user} /> :
            user.role === 'admin' ? <AdminDashboard member={user} /> :
            user.role === 'superuser' ? <SuperUserDashboard member={user} /> :
            <Navigate to="/login" replace />
          ) : <Navigate to="/login" replace /> 
        },
        { 
          path: "members", 
          element: user && ['admin', 'superuser'].includes(user.role) ? <MemberList /> : <Navigate to="/dashboard" replace /> 
        },
        { 
          path: "activities", 
          element: user ? <ActivitiesList /> : <Navigate to="/login" replace /> 
        },
        { 
          path: "hours", 
          element: user ? <HoursLog /> : <Navigate to="/login" replace /> 
        },
        {
          path: 'assign-password',
          element: user && ['admin', 'superuser'].includes(user.role) ? <AssignPassword /> : <Navigate to="/dashboard" replace />
        },
        { 
          path: "events", 
          element: user ? <EventsList /> : <Navigate to="/login" replace /> 
        },
        { 
          path: "admin", 
          element: user?.role === 'admin' ? <AdminDashboard member={user} /> : <Navigate to="/dashboard" replace />
        },
        { 
          path: "super-user", 
          element: user?.role === 'superuser' ? <SuperUserDashboard member={user} /> : <Navigate to="/dashboard" replace />
        },
        { 
          path: "reports", 
          element: user?.role === 'admin' ? <Reports /> : <Navigate to="/dashboard" replace /> 
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;