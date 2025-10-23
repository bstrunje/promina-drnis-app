import React from 'react';
import { useSystemManager } from '../../context/SystemManagerContext';
import { GlobalSupportManagementPage } from './GlobalSupportManagementPage';
import { OrgSupportPage } from './OrgSupportPage';

/**
 * Router komponenta koja dinamički odabira pravu Support stranicu
 * na temelju organization_id System Manager-a
 */
export const SupportPageRouter: React.FC = () => {
  const { manager, loading } = useSystemManager();

  // Čekaj da se manager učita
  if (loading || !manager) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  // GSM (organization_id = null) -> GlobalSupportManagementPage
  // Org SM (organization_id = number) -> OrgSupportPage
  const isGlobalSM = manager.organization_id === null;

  return isGlobalSM ? <GlobalSupportManagementPage /> : <OrgSupportPage />;
};
