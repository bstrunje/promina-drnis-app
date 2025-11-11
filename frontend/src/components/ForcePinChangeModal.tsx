import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import api from '../utils/api/apiConfig';

interface ForcePinChangeModalProps {
  isOpen: boolean;
  memberId: number;
  memberName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ForcePinChangeModal: React.FC<ForcePinChangeModalProps> = ({
  isOpen,
  memberId,
  memberName,
  onSuccess,
  onCancel
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePin = (pin: string): string | null => {
    if (!pin) return 'PIN is required';
    if (pin.length !== 6) return 'PIN must be exactly 6 digits';
    if (!/^\d{6}$/.test(pin)) return 'PIN must contain only numbers';
    
    // Check for repeating digits
    if (/^(\d)\1{5}$/.test(pin)) {
      return 'PIN cannot be all the same digit (e.g., 111111)';
    }
    
    // Check for simple sequences
    const sequences = ['012345', '123456', '234567', '345678', '456789'];
    const reverseSequences = sequences.map(seq => seq.split('').reverse().join(''));
    
    if (sequences.includes(pin) || reverseSequences.includes(pin)) {
      return 'PIN cannot be a simple sequence (e.g., 123456)';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validacija
    if (!currentPin) {
      setError('Current PIN is required');
      return;
    }

    const pinError = validatePin(newPin);
    if (pinError) {
      setError(pinError);
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
      const response = await api.post<{ token: string; member: unknown }>(`/auth/change-pin-after-reset`, {
        memberId,
        currentPin,
        newPin
      });

      // Spremi token i member podatke iz odgovora
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
      }
      if (response.data?.member) {
        localStorage.setItem('member', JSON.stringify(response.data.member));
      }

      // Success - pozovi callback
      onSuccess();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <div className="p-2 bg-yellow-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">PIN Change Required</h2>
            {memberName && (
              <p className="text-sm text-gray-600">Welcome, {memberName}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={(e) => { void handleSubmit(e); }} className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Security Notice:</strong> Your PIN was recently reset by an administrator. 
              For security reasons, you must change it before continuing.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current PIN (provided by administrator)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New PIN (6 digits)
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New PIN
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Security Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium mb-1">
              <Shield className="h-4 w-4 inline mr-1" />
              Security Tips:
            </p>
            <ul className="text-xs text-blue-700 space-y-1 ml-5 list-disc">
              <li>Use 6 unique digits</li>
              <li>Avoid birth dates or phone numbers</li>
              <li>Don't use sequences (e.g., 123456)</li>
              <li>Don't use repeating digits (e.g., 111111)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || !currentPin || !newPin || !confirmPin}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Changing PIN...' : 'Change PIN & Continue'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForcePinChangeModal;
