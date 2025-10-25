// features/systemManager/components/common/ManagerHeader.tsx
import React from 'react';
import { Shield, LogOut, Menu, X } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';

// Komponenta za header System Manager panela
interface ManagerHeaderProps {
  manager: {
    display_name?: string;
  } | null;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

const ManagerHeader: React.FC<ManagerHeaderProps> = ({ manager, onMenuToggle, isMenuOpen }) => {
  const { logout } = useSystemManager();
  
  return (
    <header className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-gray-600 hover:text-blue-600"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Logo & Title */}
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">System Manager Panel</h1>
        </div>

        {/* Desktop User Info & Logout */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Logged: <span className="font-medium">{manager?.display_name}</span>
          </div>
          <button
            onClick={() => { void logout(); }}
            className="flex items-center text-red-600 hover:text-red-800"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="text-sm">Odjava</span>
          </button>
        </div>

        {/* Mobile Spacer */}
        <div className="lg:hidden w-10"></div>
      </div>
    </header>
  );
};

export default ManagerHeader;
