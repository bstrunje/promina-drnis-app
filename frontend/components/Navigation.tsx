// frontend/components/Navigation.tsx
import React, { useState } from 'react';
import { Member } from '@shared/member';
import { LayoutDashboard, Menu, X, User, Activity, Users, Settings, Shield, LogOut, MessageCircle, Calendar } from 'lucide-react';
import { useUnreadMessages } from '../src/contexts/useUnreadMessages';
import { useTranslation } from 'react-i18next';
import { useBranding } from '../src/hooks/useBranding';
import { TenantLink } from '../src/components/TenantLink';

interface NavigationProps {
  user: Member | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { unreadCount: unreadMessageCount } = useUnreadMessages();
  const { t } = useTranslation('common');
  const { getLogoUrl, getFullName, getShortName, getPrimaryColor } = useBranding();
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Brojač nepročitanih poruka se sada dohvaća iz UnreadMessagesContext
  
  if (!user) return null;
  
  return (
    <nav className="bg-white shadow-md p-4 mb-4 sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex w-full sm:w-auto items-center justify-between mb-4 sm:mb-0">
            <TenantLink to="/profile" className="flex items-center gap-3 flex-shrink-0" onClick={closeMenu}>
              <img 
                src={getLogoUrl() || undefined} 
                alt={getFullName() || undefined} 
                className="h-10 w-10 flex-shrink-0 object-contain"
                onError={(e) => {
                  // Fallback ako logo ne učita
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span 
                className="hidden md:inline text-xl font-bold whitespace-nowrap" 
                style={{ color: getPrimaryColor() }}
              >
                {getFullName()}
              </span>
              <span 
                className="md:hidden text-xl font-bold whitespace-nowrap" 
                style={{ color: getPrimaryColor() }}
              >
                {getShortName()}
              </span>
            </TenantLink>
            <button 
              onClick={toggleMenu} 
              className="sm:hidden text-gray-700 focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <div className={`${isMenuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4 justify-center`}>
            <TenantLink to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <User size={20} className="inline sm:hidden" />
              <span>{t('navigation.profile')}</span>
            </TenantLink>
            <TenantLink to="/activities" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Activity size={20} className="inline sm:hidden" />
              <span>{t('navigation.activities')}</span>
            </TenantLink>
            {/* Dodana poveznica na poruke za sve korisnike */}
            <TenantLink to="/messages" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 relative" onClick={closeMenu}>
              <MessageCircle size={20} className="inline sm:hidden" />
              <span>{t('navigation.messages')}</span>
              {unreadMessageCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center absolute -top-2 -right-2">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </TenantLink>
            {/* Duty Calendar - dostupan svim članovima */}
            <TenantLink to="/duty-calendar" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Calendar size={20} className="inline sm:hidden" />
              <span>{t('navigation.dutyCalendar')}</span>
            </TenantLink>
            {/* Omogući svim članovima pristup listi članova */}
            <TenantLink to="/members" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Users size={20} className="inline sm:hidden" />
              <span>{t('navigation.members')}</span>
            </TenantLink>
            {(user.role === 'member_administrator' || user.role === 'member_superuser') && (
              <TenantLink to="/administrator" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                <Settings size={20} className="inline sm:hidden" />
                <span>{t('navigation.administrator')}</span>
              </TenantLink>
            )}
            {user.role === 'member_superuser' && (
              <>
                <TenantLink to="/super-user" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <Shield size={20} className="inline sm:hidden" />
                  <span>{t('navigation.superuser')}</span>
                </TenantLink>
              </>
            )}
            {/* System Manager je potpuno odvojeni sustav i ne prikazuje se u navigaciji članske aplikacije */}
            {/* Pristup System Manager sučelju moguć je samo direktnim unosom URL-a /system-manager/login */}
            <TenantLink to="/member/dashboard" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <LayoutDashboard size={20} className="inline sm:hidden" />
              <span>{t('navigation.dashboard')}</span>
            </TenantLink>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
              >
                <LogOut size={16} className="inline sm:hidden" />
                <span>{t('navigation.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;