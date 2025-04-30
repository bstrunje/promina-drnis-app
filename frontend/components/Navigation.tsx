// frontend/components/Navigation.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Member } from '@shared/member';
import { Menu, X, User, Activity, Users, Settings, Shield, FileText, LogOut } from 'lucide-react';

interface NavigationProps {
  user: Member | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
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
            {/* Omogući svim članovima pristup listi članova */}
            <Link to="/members" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
              <Users size={20} className="inline sm:hidden" />
              <span>Members</span>
            </Link>
            {(user.role === 'admin' || user.role === 'superuser') && (
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
            {user.role === 'superuser' && (
              <>
                <Link to="/super-user" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <Shield size={20} className="inline sm:hidden" />
                  <span>Super User</span>
                </Link>
                <Link to="/audit-logs" className="flex items-center gap-2 text-gray-700 hover:text-blue-600" onClick={closeMenu}>
                  <FileText size={20} className="inline sm:hidden" />
                  <span>Audit Logs</span>
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <span className={`text-sm ${user.total_hours && user.total_hours >= 20 ? 'text-green-600' : 'text-gray-600'}`}>
                {user.first_name} {user.last_name}
                {user.total_hours !== undefined && ` (${user.total_hours} hours)`}
              </span>
              <button
                onClick={(e) => {
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