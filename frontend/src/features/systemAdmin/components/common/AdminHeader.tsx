// features/systemAdmin/components/common/AdminHeader.tsx
import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { useSystemAdmin } from '../../../../context/SystemAdminContext';

// Komponenta za header System Admin panela
interface AdminHeaderProps {
  admin: {
    display_name?: string;
  } | null;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ admin }) => {
  const { logout } = useSystemAdmin();
  
  return (
    <header className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">System Admin Panel</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Prijavljeni kao: <span className="font-medium">{admin?.display_name}</span>
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

export default AdminHeader;
