// features/systemAdmin/components/dashboard/QuickLinks.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Komponenta za prikaz brzih prečaca na dashboardu
const QuickLinks: React.FC = () => {
  const navigate = useNavigate();

  // Napomena: Ovaj tip navigacije uzrokuje preusmjeravanje na Login Page
  // TODO: Prilagoditi navigaciju specifično za System Admin područje
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium mb-4">Brzi prečaci</h3>
      <div className="space-y-3">
        <button
          onClick={() => navigate("/members")}
          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
        >
          <span>Upravljanje članovima</span>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
        </button>
        <button
          onClick={() => navigate("/activities")}
          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
        >
          <span>Odobravanje aktivnosti</span>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
        </button>
      </div>
    </div>
  );
};

export default QuickLinks;
