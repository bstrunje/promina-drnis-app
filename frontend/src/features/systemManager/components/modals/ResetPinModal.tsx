import React, { useState } from 'react';
import { X, Shield, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { resetMemberPin, resetOsmPin, ResetMemberPinResponse, ResetOsmPinResponse } from '../../utils/systemManagerApi';

interface ResetPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: number;
  targetName: string;
  targetType: 'member' | 'osm'; // member = član, osm = Organization System Manager
  isGlobalManager?: boolean; // Da li je trenutni SM Global (organization_id === null)
  onSuccess?: () => void;
}

const ResetPinModal: React.FC<ResetPinModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetType,
  isGlobalManager = false,
  onSuccess
}) => {
  const [newPin, setNewPin] = useState('');
  const [useCustomPin, setUseCustomPin] = useState(false);
  const [showGeneratedPin, setShowGeneratedPin] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let response: ResetMemberPinResponse | ResetOsmPinResponse;
      
      if (targetType === 'member') {
        response = await resetMemberPin(
          targetId,
          useCustomPin ? newPin : undefined,
          isGlobalManager // GSM ne treba tenant parametar
        );
      } else {
        response = await resetOsmPin(
          targetId,
          useCustomPin ? newPin : undefined
        );
      }

      setSuccess(true);
      
      // Ako je PIN auto-generiran, prikaži ga
      if (response.newPin) {
        setGeneratedPin(response.newPin);
        setShowGeneratedPin(true);
      }

      // Pozovi onSuccess callback nakon 2 sekunde
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, response.newPin ? 5000 : 2000); // Ako je generiran PIN, daj im više vremena da ga zapišu
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPin('');
    setUseCustomPin(false);
    setShowGeneratedPin(false);
    setGeneratedPin(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Reset PIN</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  ✅ PIN successfully reset for {targetName}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  User will be required to change PIN on next login.
                </p>
              </div>

              {generatedPin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    Generated PIN (save this - it won't be shown again):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-4 py-2 rounded border border-blue-300 text-lg font-mono tracking-widest">
                      {showGeneratedPin ? generatedPin : '••••••'}
                    </code>
                    <button
                      onClick={() => setShowGeneratedPin(!showGeneratedPin)}
                      className="p-2 hover:bg-blue-100 rounded transition-colors"
                    >
                      {showGeneratedPin ? (
                        <EyeOff className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    ⚠️ Make sure to securely communicate this PIN to the user.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will reset the PIN for <strong>{targetName}</strong> and require them to change it on next login.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomPin}
                    onChange={(e) => setUseCustomPin(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium">Set custom PIN</span>
                </label>

                {useCustomPin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New PIN (6 digits)
                    </label>
                    <input
                      type="text"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave unchecked to auto-generate a secure PIN
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Security Note:</strong>
                  {useCustomPin
                    ? ' Custom PIN will be set. User must change it on next login.'
                    : ' A random 6-digit PIN will be generated and displayed to you.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleReset()}
              disabled={isLoading || (useCustomPin && newPin.length !== 6)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Reset PIN
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPinModal;
