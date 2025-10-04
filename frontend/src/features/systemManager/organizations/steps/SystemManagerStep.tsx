// frontend/src/features/systemManager/organizations/steps/SystemManagerStep.tsx
import React, { useState } from 'react';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import type { StepProps } from '../OrganizationWizard';

const SystemManagerStep: React.FC<StepProps> = ({ formData, onUpdate, errors }) => {
  const [showPassword, setShowPassword] = useState(false);

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

      {/* Password */}
      <div>
        <Label htmlFor="sm_password">Password *</Label>
        <div className="relative">
          <Input
            id="sm_password"
            type={showPassword ? 'text' : 'password'}
            value={formData.sm_password ?? ''}
            onChange={(e) => onUpdate({ sm_password: e.target.value })}
            placeholder="Minimum 8 characters"
            className={errors.sm_password ? 'border-red-500 pr-10' : 'pr-10'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.sm_password && <p className="text-sm text-red-500 mt-1">{errors.sm_password}</p>}
        <p className="text-sm text-gray-500 mt-1">
          Minimum 8 characters. Use a strong password.
        </p>
      </div>
    </div>
  );
};

export default SystemManagerStep;
