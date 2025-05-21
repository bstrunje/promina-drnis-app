// frontend/components/BackToDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';

/**
 * Komponenta koja prikazuje gumb za povratak na dashboard
 * ovisno o ulozi korisnika
 */
const BackToDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Određivanje rute dashboarda prema ulozi korisnika
  const getDashboardRoute = () => {
    if (!user) return "/login";
    
    switch (user.role) {
      case 'member_administrator':
        return "/admin/dashboard";
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
      onClick={() => navigate(getDashboardRoute())}
      className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
    >
      <ArrowLeft size={16} />
      <LayoutDashboard size={16} />
      <span className="text-sm">Povratak na dashboard</span>
    </button>
  );
};

export default BackToDashboard;
