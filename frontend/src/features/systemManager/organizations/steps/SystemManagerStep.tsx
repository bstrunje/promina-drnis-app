// frontend/src/features/systemManager/organizations/steps/SystemManagerStep.tsx
import React from 'react';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import type { StepProps } from '../OrganizationWizard';

const SystemManagerStep: React.FC<StepProps> = ({ formData, onUpdate, errors }) => {

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">System Manager Account</h3>
        <p className="text-gray-600 mb-6">
          Create the System Manager account for this organization. This account will have full administrative access.
        </p>
      </div>

      {/* Username */}
      <div>
        <Label htmlFor="sm_username">Username *</Label>
        <Input
          id="sm_username"
          value={formData.sm_username ?? ''}
          onChange={(e) => onUpdate({ sm_username: e.target.value })}
          placeholder="velebit_admin"
          className={errors.sm_username ? 'border-red-500' : ''}
        />
        {errors.sm_username && <p className="text-sm text-red-500 mt-1">{errors.sm_username}</p>}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="sm_email">Email *</Label>
        <Input
          id="sm_email"
          type="email"
          value={formData.sm_email ?? ''}
          onChange={(e) => onUpdate({ sm_email: e.target.value })}
          placeholder="admin@velebit.hr"
          className={errors.sm_email ? 'border-red-500' : ''}
        />
        {errors.sm_email && <p className="text-sm text-red-500 mt-1">{errors.sm_email}</p>}
      </div>

      {/* Display Name */}
      <div>
        <Label htmlFor="sm_display_name">Display Name *</Label>
        <Input
          id="sm_display_name"
          value={formData.sm_display_name ?? ''}
          onChange={(e) => onUpdate({ sm_display_name: e.target.value })}
          placeholder="Velebit Administrator"
          className={errors.sm_display_name ? 'border-red-500' : ''}
        />
        {errors.sm_display_name && <p className="text-sm text-red-500 mt-1">{errors.sm_display_name}</p>}
      </div>

      {/* Default Password Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Default Password:</strong> <code className="bg-gray-100 px-2 py-1 rounded">manager123</code>
          <br />
          The System Manager will be required to change this password upon first login.
        </AlertDescription>
      </Alert>

      {/* 2FA Security Section */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          <h4 className="text-md font-semibold">Security Settings</h4>
        </div>
        
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Enable PIN 2FA for enhanced security. The System Manager will need to enter a 6-digit PIN after login.
          </AlertDescription>
        </Alert>

        {/* Enable 2FA Checkbox */}
        <div className="flex items-start space-x-3">
          <input
            id="sm_enable_2fa"
            type="checkbox"
            checked={formData.sm_enable_2fa ?? false}
            onChange={(e) => onUpdate({ sm_enable_2fa: e.target.checked })}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-1">
            <Label htmlFor="sm_enable_2fa" className="text-sm font-medium">
              Enable PIN 2FA for this System Manager
            </Label>
            <p className="text-sm text-gray-500 mt-1">
              Recommended for enhanced security. The System Manager can disable this later if needed.
            </p>
          </div>
        </div>

        {/* PIN Setup (if 2FA enabled) */}
        {formData.sm_enable_2fa && (
          <div className="mt-4 space-y-4 pl-7 border-l-2 border-blue-200">
            <div>
              <Label htmlFor="sm_pin">6-Digit PIN *</Label>
              <Input
                id="sm_pin"
                type="password"
                maxLength={6}
                value={formData.sm_pin ?? ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Samo brojevi
                  onUpdate({ sm_pin: value });
                }}
                placeholder="123456"
                className={`w-24 text-center ${errors.sm_pin ? 'border-red-500' : ''}`}
              />
              {errors.sm_pin && <p className="text-sm text-red-500 mt-1">{errors.sm_pin}</p>}
              <p className="text-sm text-gray-500 mt-1">
                Enter a 6-digit PIN that the System Manager will use for 2FA.
              </p>
            </div>

            <div>
              <Label htmlFor="sm_pin_confirm">Confirm PIN *</Label>
              <Input
                id="sm_pin_confirm"
                type="password"
                maxLength={6}
                value={formData.sm_pin_confirm ?? ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Samo brojevi
                  onUpdate({ sm_pin_confirm: value });
                }}
                placeholder="123456"
                className={`w-24 text-center ${errors.sm_pin_confirm ? 'border-red-500' : ''}`}
              />
              {errors.sm_pin_confirm && <p className="text-sm text-red-500 mt-1">{errors.sm_pin_confirm}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManagerStep;
