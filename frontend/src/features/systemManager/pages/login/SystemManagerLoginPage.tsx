// features/systemManager/pages/login/SystemManagerLoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { useBranding } from '../../../../hooks/useBranding';
import { IMAGE_BASE_URL } from '../../../../utils/config';
import { useSystemManagerNavigation } from '../../hooks/useSystemManagerNavigation';

/**
 * Helper za detekciju org slug-a iz URL-a
 */
const getOrgSlugFromPath = (): string | null => {
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);
  
  // /system-manager/... → null (Global SM)
  if (pathParts[0] === 'system-manager') return null;
  
  // /promina/system-manager/... → 'promina' (Org SM)
  if (pathParts[1] === 'system-manager') return pathParts[0];
  
  return null;
};

const SystemManagerLoginPage: React.FC = () => {
  const { login, isAuthenticated, manager } = useSystemManager();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const { navigateTo } = useSystemManagerNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Dohvati org slug za detekciju tipa SM-a
  const orgSlug = getOrgSlugFromPath();

  // Preusmjeri nakon uspješne autentifikacije
  useEffect(() => {
    if (isAuthenticated && manager) {
      if (manager.organization_id === null) {
        // Global System Manager → Organizations page
        navigateTo('/system-manager/organizations');
      } else {
        // Organization System Manager → Dashboard
        navigateTo('/system-manager/dashboard');
      }
    }
  }, [isAuthenticated, manager, navigateTo]);
  const isOrgSM = Boolean(orgSlug);
  
  // Dinamički logo
  // logo_path u bazi je vec puni path npr. "/uploads/organization_logos/..."
  const logoUrl = branding?.logo_path 
    ? (branding.logo_path.startsWith('http') 
        ? branding.logo_path 
        : `${IMAGE_BASE_URL}${branding.logo_path.replace('/uploads', '')}`)
    : null;
  const orgName = branding?.name ?? 'System Manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    
    setError('');
    setIsLoggingIn(true);
    
    try {
      const response = await login({ username, password });
      const orgSlug = getOrgSlugFromPath();


      if (response.twoFactorRequired) {
        const verify2faPath = orgSlug 
          ? `/${orgSlug}/system-manager/verify-2fa`
          : '/system-manager/verify-2fa';
        navigate(verify2faPath, { state: { tempToken: response.tempToken } });
      } else if (response.resetRequired) {
        const forceChangePath = orgSlug 
          ? `/${orgSlug}/system-manager/force-change-password`
          : '/system-manager/force-change-password';
        navigate(forceChangePath, { state: { tempToken: response.tempToken } });
      } else if (response.pinResetRequired) {
        const changePinPath = orgSlug 
          ? `/${orgSlug}/system-manager/change-pin`
          : '/system-manager/change-pin';
        navigate(changePinPath, { 
          state: { 
            tempToken: response.tempToken,
            managerId: response.managerId,
            managerName: response.managerName 
          } 
        });
      }
      // Uspješan login bez dodatnih koraka se rješava unutar useSystemManager hooka

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login error. Please check your username and password.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt={orgName} className="w-full h-full object-contain" />
            ) : (
              <Shield className="w-20 h-20 text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            {isOrgSM ? `${orgName}` : 'Global System Manager'}
          </h1>
          <div className="flex items-center mt-2">
            <Shield className="w-5 h-5 text-blue-600 mr-1" />
            <p className="text-sm text-gray-600">
              {isOrgSM ? 'Organization Management Access' : 'Platform Administration Access'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={e => { void handleSubmit(e); }}>

          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
              disabled={isLoggingIn}
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Enter password"
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center py-2 px-4 rounded-md text-white font-medium 
              ${isLoggingIn ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <span className="spinner mr-2"></span>
                Prijava u tijeku...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Prijavi se
              </>
            )}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              This page is for system manager login only.
              <br />For member login, please visit{' '}
              {getOrgSlugFromPath() ? (
                <a href={`/${getOrgSlugFromPath()}/login`} className="text-blue-600 hover:underline">standard login</a>
              ) : (
                <span className="text-gray-500">standard login (select organization first)</span>
              )}.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemManagerLoginPage;
