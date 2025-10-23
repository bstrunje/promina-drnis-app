// frontend/src/features/systemManager/pages/settings/GlobalSystemManagerSettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { API_BASE_URL } from '../../../../utils/config';

interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  preferredChannel?: string;
  confirmedAt?: string;
}

interface TrustedDevice {
  id: number;
  device_name?: string;
  created_at: string;
  last_used_at?: string;
  expires_at: string;
}

const GlobalSystemManagerSettings: React.FC = () => {
  const { manager } = useSystemManager();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  // 2FA state
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>({ twoFactorEnabled: false });
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [twoFactorPin, setTwoFactorPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  // Trusted devices state
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [trustedDevicesEnabled, setTrustedDevicesEnabled] = useState(false);

  useEffect(() => {
    void load2faStatus();
    void loadTrustedDevices();
    void loadTrustedDevicesSettings();
  }, []);

  const load2faStatus = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/system-manager/2fa-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json() as TwoFactorStatus;
        setTwoFactorStatus(data);
      }
    } catch (err) {
      console.error('Error loading 2FA status:', err);
    }
  };

  const loadTrustedDevices = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/system-manager/trusted-devices`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json() as TrustedDevice[];
        setTrustedDevices(data);
      }
    } catch (err) {
      console.error('Error loading trusted devices:', err);
    }
  };

  const loadTrustedDevicesSettings = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/system-manager/trusted-devices-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json() as { enabled: boolean };
        setTrustedDevicesEnabled(data.enabled);
      }
    } catch (err) {
      console.error('Error loading trusted devices settings:', err);
    }
  };

  const updateTrustedDevicesSettings = async (enabled: boolean): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/system-manager/trusted-devices-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        setTrustedDevicesEnabled(enabled);
        setSuccess('Trusted devices settings updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update trusted devices settings');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Error updating trusted devices settings');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (): Promise<void> => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE_URL}/system-manager/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message ?? 'Failed to change password');
      }

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2fa = async (): Promise<void> => {
    if (twoFactorPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (confirmPin.length !== 6) {
      setError('Confirm PIN must be exactly 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE_URL}/system-manager/setup-2fa-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        },
        body: JSON.stringify({ pin: twoFactorPin })
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message ?? 'Failed to enable 2FA');
      }

      setSuccess('2FA enabled successfully');
      setShow2faSetup(false);
      setTwoFactorPin('');
      setConfirmPin('');
      await load2faStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2fa = async (): Promise<void> => {
    if (!window.confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE_URL}/system-manager/disable-2fa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message ?? 'Failed to disable 2FA');
      }

      setSuccess('2FA disabled successfully');
      await load2faStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrustedDevice = async (deviceId: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to remove this trusted device?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/system-manager/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove trusted device');
      }

      setSuccess('Trusted device removed successfully');
      await loadTrustedDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove trusted device');
    } finally {
      setLoading(false);
    }
  };

  // Provjeri je li trenutni manager Global SM
  if (manager?.organization_id !== null) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. This page is only available for Global System Managers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Global System Manager Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account security and preferences</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button
            onClick={() => void handlePasswordChange()}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Status: {twoFactorStatus.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
              {twoFactorStatus.twoFactorEnabled && (
                <p className="text-sm text-gray-600">
                  Method: {twoFactorStatus.preferredChannel?.toUpperCase()}
                </p>
              )}
            </div>
            <div>
              {twoFactorStatus.twoFactorEnabled ? (
                <Button
                  variant="outline"
                  onClick={() => void handleDisable2fa()}
                  disabled={loading}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  onClick={() => setShow2faSetup(true)}
                  disabled={loading}
                >
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          {show2faSetup && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Setup PIN 2FA</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pin">6-Digit PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={6}
                    value={twoFactorPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setTwoFactorPin(value);
                    }}
                    placeholder="123456"
                    className="w-24 text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPin">Confirm PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setConfirmPin(value);
                    }}
                    placeholder="123456"
                    className="w-24 text-center"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShow2faSetup(false);
                    setTwoFactorPin('');
                    setConfirmPin('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleEnable2fa()}
                  disabled={loading || twoFactorPin.length !== 6 || confirmPin.length !== 6}
                >
                  Enable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trusted Devices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Trusted Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Trusted Devices Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 border rounded-lg">
            <div>
              <Label htmlFor="trusted-devices-toggle" className="text-sm font-medium">
                Enable Trusted Devices
              </Label>
              <p className="text-xs text-gray-600">
                Allow devices to be remembered for 30 days to skip 2FA
              </p>
            </div>
            <Switch
              id="trusted-devices-toggle"
              checked={trustedDevicesEnabled}
              onCheckedChange={(checked) => void updateTrustedDevicesSettings(checked)}
              disabled={loading}
            />
          </div>

          {trustedDevices.length === 0 ? (
            <p className="text-gray-600">No trusted devices found.</p>
          ) : (
            <div className="space-y-3">
              {trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {device.device_name ?? 'Unknown Device'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Added: {new Date(device.created_at).toLocaleDateString()}
                    </p>
                    {device.last_used_at && (
                      <p className="text-sm text-gray-600">
                        Last used: {new Date(device.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRemoveTrustedDevice(device.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalSystemManagerSettings;
