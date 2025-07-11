// features/systemManager/components/dashboard/QuickLinks.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';

// Komponenta za prikaz brzih prečaca na dashboardu
const QuickLinks: React.FC = () => {
  const navigate = useNavigate();

  // Navigacija specifična za System Admin dio aplikacije
  // Koristimo /system-manager prefiks za sve putanje
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium mb-4">Brzi prečaci</h3>
      <div className="space-y-3">
        <button
          onClick={() => navigate("/system-manager/activities")}
          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
        >
          <span>Odobravanje aktivnosti</span>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
        </button>
        <button
          onClick={() => navigate("/system-manager/audit-logs")}
          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
        >
          <span>Revizijski zapisi</span>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
        </button>
      </div>
    </div>
  );
};

export default QuickLinks;
