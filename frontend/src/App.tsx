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

export interface User {
 id: number;
 username: string;
 role: 'member' | 'admin' | 'superuser';
}

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
            user.role === 'member' ? <MemberDashboard user={user} /> :
            user.role === 'admin' ? <AdminDashboard user={user} /> :
            user.role === 'superuser' ? <SuperUserDashboard user={user} /> :
            <Navigate to="/login" replace />
          ) : <Navigate to="/login" replace /> 
        },
        { 
          path: "members", 
          element: user ? <MemberList /> : <Navigate to="/login" replace /> 
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
          path: "events", 
          element: user ? <EventsList /> : <Navigate to="/login" replace /> 
        },
        { 
          path: "admin", 
          element: user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/dashboard" replace />
        },
        { 
          path: "super-user", 
          element: user?.role === 'superuser' ? <SuperUserDashboard user={user} /> : <Navigate to="/dashboard" replace />
        }
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;