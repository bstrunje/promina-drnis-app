// features/systemAdmin/SystemAdminRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SystemAdminProvider, useSystemAdmin } from '../../context/SystemAdminContext';
import SystemAdminLoginPage from './pages/login/SystemAdminLoginPage';
import SystemAdminDashboard from './pages/dashboard/SystemAdminDashboard';
import SystemAdminSettings from './pages/settings/SystemAdminSettings';
import SystemAdminAuditLogs from './pages/auditLogs/SystemAdminAuditLogs';

// Zaštićena ruta za system admin
const SystemAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useSystemAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-2">Učitavanje...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/system-admin/login" replace />;
  }

  return <>{children}</>;
};

// Komponenta za System Admin rute
const SystemAdminRoutesContent: React.FC = () => {
  const { isAuthenticated } = useSystemAdmin();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <SystemAdminLoginPage /> : <Navigate to="/system-admin/dashboard" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <SystemAdminProtectedRoute>
            <SystemAdminDashboard />
          </SystemAdminProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <SystemAdminProtectedRoute>
            <SystemAdminSettings />
          </SystemAdminProtectedRoute>
        } 
      />
      <Route 
        path="/audit-logs" 
        element={
          <SystemAdminProtectedRoute>
            <SystemAdminAuditLogs />
          </SystemAdminProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={<Navigate to="/system-admin/dashboard" replace />} 
      />
    </Routes>
  );
};

// Wrapper koji uključuje context provider
const SystemAdminRoutes: React.FC = () => {
  return (
    <SystemAdminProvider>
      <SystemAdminRoutesContent />
    </SystemAdminProvider>
  );
};

export default SystemAdminRoutes;
