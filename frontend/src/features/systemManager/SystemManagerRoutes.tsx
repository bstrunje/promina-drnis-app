// features/systemManager/SystemManagerRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SystemManagerProvider, useSystemManager } from '../../context/SystemManagerContext';
import SystemManagerLoginPage from './pages/login/SystemManagerLoginPage';
import TwoFactorEntryPage from './pages/login/TwoFactorEntryPage';
import ForcePasswordChangePage from './pages/login/ForcePasswordChangePage';
import SystemManagerDashboard from './pages/dashboard/SystemManagerDashboard';
import SystemManagerAuditLogs from './pages/auditLogs/SystemManagerAuditLogs';
import HolidaysManager from './HolidaysManager';
import DutyCalendarSettings from './DutyCalendarSettings';
import OrganizationWizard from './organizations/OrganizationWizard';
import OrganizationEdit from './organizations/OrganizationEdit';

// Zaštićena ruta za system manager
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

// Komponenta za System Manager rute
const SystemManagerRoutesContent: React.FC = () => {
  return (
    <Routes>
      <Route 
        path="/login" 
        element={<SystemManagerLoginPage />} 
      />
      <Route 
        path="/verify-2fa" 
        element={<TwoFactorEntryPage />} 
      />
      <Route 
        path="/force-change-password" 
        element={<ForcePasswordChangePage />} 
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
        path="/members" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
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
        path="/organizations" 
        element={
          <SystemManagerProtectedRoute>
            <SystemManagerDashboard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/organizations/create" 
        element={
          <SystemManagerProtectedRoute>
            <OrganizationWizard />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/organizations/:id" 
        element={
          <SystemManagerProtectedRoute>
            <OrganizationEdit />
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
