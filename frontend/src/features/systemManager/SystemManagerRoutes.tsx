// features/systemManager/SystemManagerRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SystemManagerProvider, useSystemManager } from '../../context/SystemManagerContext';
import SystemManagerLoginPage from './pages/login/SystemManagerLoginPage';
import SystemManagerDashboard from './pages/dashboard/SystemManagerDashboard';
import SystemManagerAuditLogs from './pages/auditLogs/SystemManagerAuditLogs';
import HolidaysManager from './HolidaysManager';
import DutyCalendarSettings from './DutyCalendarSettings';

// Zaštićena ruta za system admin
const SystemManagerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useSystemManager();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/system-manager/login" replace />;
  }

  return <>{children}</>;
};

// Komponenta za System Admin rute
const SystemManagerRoutesContent: React.FC = () => {
  const { isAuthenticated } = useSystemManager();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <SystemManagerLoginPage /> : <Navigate to="/system-manager/dashboard" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/members" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/audit-logs" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerAuditLogs />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/activities" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/register-members" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/holidays" 
        element={
          <SystemManagerProtectedRoute>
            <HolidaysManager />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/duty-settings" 
        element={
          <SystemManagerProtectedRoute>
            <DutyCalendarSettings />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={<Navigate to="/system-manager/dashboard" replace />} 
      />
    </Routes>
  );
};

// Wrapper koji uključuje context provider
const SystemManagerRoutes: React.FC = () => {
  return (
    <SystemManagerProvider>
      <SystemManagerRoutesContent />
    </SystemManagerProvider>
  );
};

export default SystemManagerRoutes;
