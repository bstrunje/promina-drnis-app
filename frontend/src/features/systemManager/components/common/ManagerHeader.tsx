// features/systemManager/components/common/ManagerHeader.tsx
import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';

// Komponenta za header System Manager panela
interface ManagerHeaderProps {
  manager: {
    display_name?: string;
  } | null;
}

const ManagerHeader: React.FC<ManagerHeaderProps> = ({ manager }) => {
  const { logout } = useSystemManager();
  
  return (
    <header className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">System Manager Panel</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Logged: <span className="font-medium">{manager?.display_name}</span>
          </div>
          <button
            onClick={() => { void logout(); }}
            className="flex items-center text-red-600 hover:text-red-800"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span>Odjava</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ManagerHeader;
