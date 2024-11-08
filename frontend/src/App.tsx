import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import MemberList from './components/members/MemberList';
import LoginPage from './components/auth/LoginPage';  // Update this import to your new LoginPage
import './App.css';
import Dashboard from './components/dashboard/Dashboard';

// You can move this to a separate types file later
type User = {
  id: string;
  username: string;
  role: string;
} | null;

function App() {
  const [user, setUser] = useState<User>(null);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header - Only show if user is logged in */}
        {user && (
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
                {/* Add more nav links based on user role */}
                {user.role === 'administrator' && (
                  <Link to="/admin" className="text-gray-700 hover:text-blue-600">
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Welcome, {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                user ? <Navigate to="/dashboard" replace /> : <LoginPage />
              } 
            />
            <Route 
              path="/login" 
              element={
                user ? <Navigate to="/dashboard" replace /> : <LoginPage />
              } 
            />

            {/* Protected Routes */}
            <Route
  path="/dashboard"
  element={
    user ? (
      <Dashboard />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
            <Route
              path="/members"
              element={
                user ? <MemberList /> : <Navigate to="/login" replace />
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                user?.role === 'administrator' ? (
                  <div>Admin Panel</div> // Replace with your Admin component
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            {/* Catch all route */}
<Route
  path="/dashboard"
  element={
    user ? (
      <Dashboard />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
</Routes>
</main>
</div>
</Router>
);
}

export default App;