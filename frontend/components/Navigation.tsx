// src/components/Navigation.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../src/App';

interface NavigationProps {
  user: User | null;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ user, onLogout }) => {
  if (!user) return null;
  
  return (
    <nav className="bg-white shadow-md p-4 mb-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">
            Promina Drnis
          </Link>
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
            Dashboard
          </Link>
          <Link to="/members" className="text-gray-700 hover:text-blue-600">
            Members
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="text-gray-700 hover:text-blue-600">
              Admin
            </Link>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Welcome, {user.username}
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
    </nav>
  );
});

export default Navigation;