// features/systemManager/SystemManagerRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import GlobalSystemManagerSettings from './pages/settings/GlobalSystemManagerSettings';
import { SupportPageRouter } from './SupportPageRouter';

/**
 * Helper za detekciju org slug-a iz URL-a
 * - /system-manager/... → null (Global SM)
 * - /promina/system-manager/... → 'promina' (Org SM)
 */
const useOrgSlug = (): string | null => {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // Ako path počinje s 'system-manager', to je Global SM
  if (pathParts[0] === 'system-manager') {
    return null;
  }
  
  // Ako drugi dio je 'system-manager', prvi je org slug
  if (pathParts[1] === 'system-manager') {
    return pathParts[0];
  }
  
  return null;
};

// Zaštićena ruta za system manager
const SystemManagerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useSystemManager();
  const orgSlug = useOrgSlug();
  
  // Dinamički login path
  const loginPath = orgSlug ? `/${orgSlug}/system-manager/login` : '/system-manager/login';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
};

// Komponenta za System Manager rute
const SystemManagerRoutesContent: React.FC = () => {
  const orgSlug = useOrgSlug();
  const dashboardPath = orgSlug ? `/${orgSlug}/system-manager/dashboard` : '/system-manager/dashboard';
  
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
        path="/settings" 
        element={
          <SystemManagerProtectedRoute>
            <GlobalSystemManagerSettings />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/support" 
        element={
          <SystemManagerProtectedRoute>
            <SupportPageRouter />
          </SystemManagerProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={<Navigate to={dashboardPath} replace />} 
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
