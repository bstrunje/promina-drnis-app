// frontend/components/Navigation.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Member } from '@shared/member';
import { Menu, X, User, Activity, Users, Settings, Shield, LogOut, MessageCircle } from 'lucide-react';
import { useUnreadMessages } from '../src/contexts/UnreadMessagesContext';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../src/components/LanguageToggle';

interface NavigationProps {
  user: Member | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { unreadCount: unreadMessageCount } = useUnreadMessages();
  const { t } = useTranslation();
  
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
            <Link to="/profile" className="text-xl font-bold text-blue-600" onClick={closeMenu}>
              <span className="hidden md:inline">{t('navigation.title')}</span>
              <span className="md:hidden">{t('navigation.titleShort')}</span>
            </Link>
            <button 
              onClick={toggleMenu} 
              className="sm:hidden text-gray-700 focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <div className={`${isMenuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4 justify-center`}>
            <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <User size={20} className="inline sm:hidden" />
              <span>{t('navigation.profile')}</span>
            </Link>
            <Link to="/activities" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Activity size={20} className="inline sm:hidden" />
              <span>{t('navigation.activities')}</span>
            </Link>
            {/* Dodana poveznica na poruke za sve korisnike */}
            <Link to="/messages" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 relative" onClick={closeMenu}>
              <MessageCircle size={20} className="inline sm:hidden" />
              <span>{t('navigation.messages')}</span>
              {unreadMessageCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center absolute -top-2 -right-2">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>
            {/* Omogući svim članovima pristup listi članova */}
            <Link to="/members" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Users size={20} className="inline sm:hidden" />
              <span>{t('navigation.members')}</span>
            </Link>
            {(user.role === 'member_administrator' || user.role === 'member_superuser') && (
              <>
                <Link to="/administrator" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <Settings size={20} className="inline sm:hidden" />
                  <span>{t('navigation.administrator')}</span>
                </Link>
                {!user.registration_completed && (
                  <Link to="/assign-password" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                    <Shield size={20} className="inline sm:hidden" />
                    <span>{t('navigation.assignPasswords')}</span>
                  </Link>
                )}
              </>
            )}
            {user.role === 'member_superuser' && (
              <>
                <Link to="/super-user" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <Shield size={20} className="inline sm:hidden" />
                  <span>{t('navigation.superuser')}</span>
                </Link>
              </>
            )}
            {/* System Manager je potpuno odvojeni sustav i ne prikazuje se u navigaciji članske aplikacije */}
            {/* Pristup System Manager sučelju moguć je samo direktnim unosom URL-a /system-manager/login */}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Link 
                to="/member/dashboard" 
                className={`text-sm ${user.total_hours && user.total_hours >= 20 ? 'text-green-600' : 'text-gray-600'} hover:underline cursor-pointer`}
                onClick={closeMenu}
              >
                {user.first_name} {user.last_name}
                {user.total_hours !== undefined && ` (${user.total_hours} hours)`}
              </Link>

              <LanguageToggle />

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