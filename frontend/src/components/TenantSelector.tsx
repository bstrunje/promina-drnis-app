import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Tenant Selector - Organization selection page
 * Displays on root "/" path when user hasn't selected an organization
 * 
 * SECURITY: No organization enumeration - users must know organization name
 */
export default function TenantSelector() {
  const navigate = useNavigate();
  const [orgSlug, setOrgSlug] = useState('');
  const [error, setError] = useState('');

  // No automatic redirect - user must explicitly select organization
  // This prevents double redirect issues and gives user control

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - letters, numbers and hyphens only
    const validSlugRegex = /^[a-z0-9-]+$/;
    if (!orgSlug || !validSlugRegex.test(orgSlug)) {
      setError('Please enter a valid organization name (lowercase letters, numbers and hyphens only)');
      return;
    }
    
    // Redirect to organization login
    navigate(`/${orgSlug}/login`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-gray-400 text-6xl mb-4">🏢</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h1>
          <p className="text-gray-600">
            Enter your organization name to continue
          </p>
        </div>


        {/* Manual input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">/</span>
              <input
                type="text"
                id="orgSlug"
                value={orgSlug}
                onChange={(e) => {
                  setOrgSlug(e.target.value.toLowerCase());
                  setError('');
                }}
                placeholder="e.g. myorg"
                className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue
          </button>
        </form>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            You can find your organization name in your organization's URL
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Example: app.com<strong>/myorg</strong>/login
          </p>
        </div>
      </div>
    </div>
  );
}
