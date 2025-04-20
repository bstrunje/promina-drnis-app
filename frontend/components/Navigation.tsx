// frontend/components/Navigation.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Member } from '@shared/member';

interface NavigationProps {
  user: Member | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ user, onLogout }) => {
  if (!user) return null;
  
  return (
    <nav className="bg-white shadow-md p-4 mb-4">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <Link to="/profile" className="text-xl font-bold text-blue-600">
              Promina Drnis
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4 justify-center">
            <Link to="/profile" className="text-gray-700 hover:text-blue-600">
              Profile
            </Link>
            <Link to="/activities" className="text-gray-700 hover:text-blue-600">
              Activities
            </Link>
            {/* Omogući svim članovima pristup listi članova */}
            <Link to="/members" className="text-gray-700 hover:text-blue-600">
              Members
            </Link>
            {(user.role === 'admin' || user.role === 'superuser') && (
              <>
                <Link to="/admin" className="text-gray-700 hover:text-blue-600">
                  Admin
                </Link>
                {!user.registration_completed && (
                  <Link to="/assign-password" className="text-gray-700 hover:text-blue-600">
                    Assign Passwords
                  </Link>
                )}
              </>
            )}
            {user.role === 'superuser' && (
              <>
                <Link to="/super-user" className="text-gray-700 hover:text-blue-600">
                  Super User
                </Link>
                <Link to="/audit-logs" className="text-gray-700 hover:text-blue-600">
                  Audit Logs
                </Link>
              </>
            )}
            <div className="flex items-center gap-2">
              <span className={`text-sm ${user.total_hours && user.total_hours >= 20 ? 'text-green-600' : 'text-gray-600'}`}>
                {user.first_name} {user.last_name}
                {user.total_hours !== undefined && ` (${user.total_hours} hours)`}
              </span>
              <button
                onClick={onLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
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