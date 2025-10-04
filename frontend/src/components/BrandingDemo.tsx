/**
 * BRANDING DEMO KOMPONENTA
 * 
 * Test komponenta za demonstraciju multi-tenant branding funkcionalnosti
 * Korisna za development i testiranje različitih tenant-a
 */

import React from 'react';
import { useBranding } from '../hooks/useBranding';
import { getTenantDebugInfo } from '../utils/tenantUtils';

const BrandingDemo: React.FC = () => {
  const {
    branding,
    isLoading,
    error,
    refreshBranding,
    tenant,
    getLogoUrl,
    getPrimaryColor,
    getSecondaryColor,
    getFullName,
    getContactEmail,
    getFullAddress,
  } = useBranding();

  const debugInfo = getTenantDebugInfo();

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Branding Error</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => { void refreshBranding(); }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-primary mb-2">
          🎨 Multi-Tenant Branding Demo
        </h2>
        <p className="text-gray-600">
          Current tenant: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{tenant}</span>
        </p>
      </div>

      {/* Logo Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Logo</h3>
        <div className="flex items-center space-x-4">
          <img
            src={getLogoUrl()}
            alt={`${getFullName()} Logo`}
            className="brand-logo"
            onError={(e) => {
              e.currentTarget.src = '/assets/default-logo.png';
            }}
          />
          <div className="text-sm text-gray-500">
            <p>URL: {getLogoUrl()}</p>
          </div>
        </div>
      </div>

      {/* Colors Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Brand Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary Color</p>
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: getPrimaryColor() }}
              ></div>
              <span className="font-mono text-sm">{getPrimaryColor()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Secondary Color</p>
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: getSecondaryColor() }}
              ></div>
              <span className="font-mono text-sm">{getSecondaryColor()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Info */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Organization Info</h3>
        <div className="bg-gray-50 p-4 rounded space-y-2">
          <p><strong>Name:</strong> {getFullName()}</p>
          <p><strong>Email:</strong> {getContactEmail()}</p>
          {getFullAddress() && <p><strong>Address:</strong> {getFullAddress()}</p>}
          <p><strong>Subdomain:</strong> {branding?.subdomain}</p>
          <p><strong>Active:</strong> {branding?.is_active ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>

      {/* Branding Examples */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Branding Examples</h3>
        <div className="space-y-4">
          {/* Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Buttons</p>
            <div className="flex space-x-2">
              <button className="btn-primary px-4 py-2 rounded">Primary Button</button>
              <button className="btn-secondary px-4 py-2 rounded">Secondary Button</button>
            </div>
          </div>

          {/* Text Colors */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Text Colors</p>
            <div className="space-y-1">
              <p className="text-primary">Primary text color</p>
              <p className="text-secondary">Secondary text color</p>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Cards</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="card-primary p-3 bg-white border rounded">
                <p className="text-sm">Primary accent card</p>
              </div>
              <div className="card-secondary p-3 bg-white border rounded">
                <p className="text-sm">Secondary accent card</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Debug Information</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t">
        <button
          onClick={() => { void refreshBranding(); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Refresh Branding
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          🔄 Reload Page
        </button>
      </div>
    </div>
  );
};

export default BrandingDemo;
