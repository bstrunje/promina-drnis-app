import React from "react";
import { useAuth } from "../../context/useAuth";
import CardNumberManagement from './CardNumberManagement';

const Settings: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="p-6">
      {user?.role === 'member_superuser' && (
        <div className="mt-8">
          <CardNumberManagement />
        </div>
      )}
    </div>
  );
};

export default Settings;