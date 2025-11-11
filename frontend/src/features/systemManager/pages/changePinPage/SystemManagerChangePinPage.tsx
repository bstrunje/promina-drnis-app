import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import systemManagerApi from '../../utils/systemManagerApi';
import { useBranding } from '../../../../hooks/useBranding';
import { IMAGE_BASE_URL } from '../../../../utils/config';

interface LocationState {
  tempToken?: string;
  managerId?: number;
  managerName?: string;
}

const SystemManagerChangePinPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();
  const state = location.state as LocationState;

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Preusmjeri ako nema potrebnih podataka
  useEffect(() => {
    if (!state?.tempToken || !state?.managerId) {
      navigate('/system-manager/login');
    }
  }, [state, navigate]);

  const logoUrl = branding?.logo_path 
    ? (branding.logo_path.startsWith('http') 
        ? branding.logo_path 
        : `${IMAGE_BASE_URL}${branding.logo_path.replace('/uploads', '')}`)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validacija
    if (!currentPin || !newPin || !confirmPin) {
      setError('All fields are required');
      return;
    }

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match');
      return;
    }

    if (currentPin === newPin) {
      setError('New PIN must be different from current PIN');
      return;
    }

    setIsLoading(true);

    try {
      const response = await systemManagerApi.post<{ token: string; refreshToken: string; manager: unknown }>('/system-manager/change-pin-after-reset', {
        managerId: state.managerId,
        currentPin,
        newPin,
        tempToken: state.tempToken
      });


      // Spremi token iz odgovora
      if (response.data?.token) {
        localStorage.setItem('systemManagerToken', response.data.token);
      }

      // Spremi i manager podatke
      if (response.data?.manager) {
        localStorage.setItem('systemManager', JSON.stringify(response.data.manager));
      }

      // Uspješno - preusmjeri na dashboard
      const pathname = window.location.pathname;
      const pathParts = pathname.split('/').filter(Boolean);
      const orgSlug = pathParts[1] === 'system-manager' ? pathParts[0] : null;


      if (orgSlug) {
        // Koristimo puni refresh da se SystemManagerContext ponovo inicijalizira
        window.location.href = `/${orgSlug}/system-manager/dashboard`;
      } else {
        window.location.href = '/system-manager/organizations';
      }
    } catch (err) {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message ?? 'Failed to change PIN');
      } else {
        setError('Failed to change PIN');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={branding?.name ?? 'Logo'} 
              className="h-16 mx-auto mb-4"
            />
          )}
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-8 w-8 text-yellow-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">PIN Change Required</h1>
          </div>
          {state?.managerName && (
            <p className="text-sm text-gray-600">Welcome, {state.managerName}</p>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Security Notice:</p>
              <p className="text-sm text-yellow-700">
                Your PIN was recently reset by an administrator. For security reasons, you must change it before continuing.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Current PIN */}
          <div>
            <Label htmlFor="currentPin">Current PIN (provided by administrator)</Label>
            <div className="relative">
              <Input
                id="currentPin"
                type={showCurrentPin ? 'text' : 'password'}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New PIN */}
          <div>
            <Label htmlFor="newPin">New PIN (6 digits)</Label>
            <div className="relative">
              <Input
                id="newPin"
                type={showNewPin ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <Label htmlFor="confirmPin">Confirm New PIN</Label>
            <div className="relative">
              <Input
                id="confirmPin"
                type={showConfirmPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Security Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">🔒 Security Tips:</p>
            <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
              <li>Use 6 unique digits</li>
              <li>Avoid birth dates or phone numbers</li>
              <li>Don't use sequences (e.g., 123456)</li>
              <li>Don't use repeating digits (e.g., 111111)</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Changing PIN...' : 'Change PIN & Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SystemManagerChangePinPage;
