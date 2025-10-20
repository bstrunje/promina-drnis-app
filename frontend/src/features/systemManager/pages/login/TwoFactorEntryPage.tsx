// features/systemManager/pages/login/TwoFactorEntryPage.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verify2faAndProceed, type SystemManager } from '../../utils/systemManagerApi';

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

interface LocationState {
  tempToken?: string;
}

interface Verify2faResponse {
  resetRequired?: boolean;
  tempToken?: string;
  token?: string;
  manager?: SystemManager;
}

const TwoFactorEntryPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!state?.tempToken) {
      setError('Invalid session. Please try logging in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await verify2faAndProceed(state.tempToken, code) as Verify2faResponse;

      if (response.resetRequired) {
        const orgSlug = getOrgSlugFromPath();
        const forceChangePath = orgSlug 
          ? `/${orgSlug}/system-manager/force-change-password`
          : '/system-manager/force-change-password';
        navigate(forceChangePath, { state: { tempToken: response.tempToken } });
      } else if (response.token && response.manager) {
        localStorage.setItem('systemManagerToken', response.token);
        localStorage.setItem('systemManager', JSON.stringify(response.manager));
        
        // Dinamički dashboard path baziran na org slug
        const orgSlug = getOrgSlugFromPath();
        const dashboardPath = orgSlug 
          ? `/${orgSlug}/system-manager/dashboard`
          : '/system-manager/dashboard';
        window.location.href = dashboardPath; // Puni refresh
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Two-Factor Authentication</h1>
        <p className="text-center text-gray-600 mb-6">Please enter the code from your authenticator app.</p>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorEntryPage;

