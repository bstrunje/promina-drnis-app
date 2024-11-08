// src/components/dashboard/Dashboard.tsx

import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import SuperUserDashboard from './SuperUserDashboard';
import AdminDashboard from './AdminDashboard';
import MemberDashboard from './MemberDashboard';

interface User {
  id: string;
  username: string;
  role: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'super_user':
      return <SuperUserDashboard user={user} />;
    case 'administrator':
      return <AdminDashboard user={user} />;
    case 'member':
      return <MemberDashboard user={user} />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default Dashboard;