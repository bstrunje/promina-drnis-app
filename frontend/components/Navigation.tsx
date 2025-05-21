// frontend/components/Navigation.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Member } from '@shared/member';
import { Menu, X, User, Activity, Users, Settings, Shield, LogOut, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../src/utils/config';
import { MESSAGE_EVENTS } from '../src/utils/events';

interface NavigationProps {
  user: Member | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Dohvaćanje broja nepročitanih poruka
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      if (!user?.member_id) return;
      
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        let endpoint = '/messages/admin';  
        if (user.role === 'member') {
          endpoint = `/members/${user.member_id}/messages`;
        }

        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Broj nepročitanih poruka
        const unreadCount = (response.data as { status: string }[]).filter((msg) => msg.status === 'unread').length;
        setUnreadMessageCount(unreadCount);
      } catch (error) {
        console.error('Greška pri dohvaćanju nepročitanih poruka:', error);
      }
    };

    void fetchUnreadMessages();
    
    // Dohvati nove poruke svakih 60 sekundi
    const interval = setInterval(() => { void fetchUnreadMessages(); }, 60000);
    
    // Slušaj događaj za ažuriranje brojača nepročitanih poruka
    const handleUnreadMessagesUpdated = () => {
      void fetchUnreadMessages();
    };
    
    window.addEventListener(MESSAGE_EVENTS.UNREAD_UPDATED, handleUnreadMessagesUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener(MESSAGE_EVENTS.UNREAD_UPDATED, handleUnreadMessagesUpdated);
    };
  }, [user]);
  
  if (!user) return null;
  
  return (
    <nav className="bg-white shadow-md p-4 mb-4 sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex w-full sm:w-auto items-center justify-between mb-4 sm:mb-0">
            <Link to="/profile" className="text-xl font-bold text-blue-600" onClick={closeMenu}>
              <span className="hidden md:inline">Planinarsko društvo "Promina" Drniš</span>
              <span className="md:hidden">PD "Promina" Drniš</span>
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
              <span>Profile</span>
            </Link>
            <Link to="/activities" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Activity size={20} className="inline sm:hidden" />
              <span>Activities</span>
            </Link>
            {/* Dodana poveznica na poruke za sve korisnike */}
            <Link to="/messages" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 relative" onClick={closeMenu}>
              <MessageCircle size={20} className="inline sm:hidden" />
              <span>Poruke</span>
              {unreadMessageCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center absolute -top-2 -right-2">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>
            {/* Omogući svim članovima pristup listi članova */}
            <Link to="/members" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Users size={20} className="inline sm:hidden" />
              <span>Members</span>
            </Link>
            {(user.role === 'member_administrator' || user.role === 'member_superuser') && (
              <>
                <Link to="/admin" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <Settings size={20} className="inline sm:hidden" />
                  <span>Admin</span>
                </Link>
                {!user.registration_completed && (
                  <Link to="/assign-password" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                    <Shield size={20} className="inline sm:hidden" />
                    <span>Assign Passwords</span>
                  </Link>
                )}
              </>
            )}
            {user.role === 'member_superuser' && (
              <>
                <Link to="/super-user" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <Shield size={20} className="inline sm:hidden" />
                  <span>Super User</span>
                </Link>
              </>
            )}
            {/* System Admin je potpuno odvojeni sustav i ne prikazuje se u navigaciji članske aplikacije */}
            {/* Pristup System Admin sučelju moguć je samo direktnim unosom URL-a /system-admin/login */}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <span className={`text-sm ${user.total_hours && user.total_hours >= 20 ? 'text-green-600' : 'text-gray-600'}`}>
                {user.first_name} {user.last_name}
                {user.total_hours !== undefined && ` (${user.total_hours} hours)`}
              </span>
              <button
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
              >
                <LogOut size={16} className="inline sm:hidden" />
                <span>Logout</span>
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