// frontend/components/BackToDashboard.tsx
import React from 'react';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../src/context/useAuth';
import { useTranslation } from 'react-i18next';
import { useTenantNavigation } from '../src/hooks/useTenantNavigation';

/**
 * Komponenta koja prikazuje gumb za povratak na dashboard
 * ovisno o ulozi korisnika
 */
const BackToDashboard: React.FC = () => {
  const { t } = useTranslation('common');
  const { navigateTo } = useTenantNavigation();
  const { user } = useAuth();

  // Određivanje rute dashboarda prema ulozi korisnika
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
    <button
      onClick={() => navigateTo(getDashboardRoute())}
      className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
    >
      <ArrowLeft size={16} />
      <LayoutDashboard size={16} />
      <span className="text-sm">{t('backToDashboard')}</span>
    </button>
  );
};

export default BackToDashboard;
