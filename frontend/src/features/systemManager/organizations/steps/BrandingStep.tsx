// frontend/src/features/systemManager/organizations/steps/BrandingStep.tsx
import React from 'react';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type { StepProps } from '../OrganizationWizard';

const BrandingStep: React.FC<StepProps> = ({ formData, onUpdate, errors }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Branding</h3>
        <p className="text-gray-600 mb-6">
          Customize the appearance of the organization.
        </p>
      </div>

      {/* Primary Color */}
      <div>
        <Label htmlFor="primary_color">Primary Color *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="primary_color"
            type="color"
            value={formData.primary_color ?? '#2563eb'}
            onChange={(e) => onUpdate({ primary_color: e.target.value })}
            className="w-20 h-12 cursor-pointer"
          />
          <Input
            type="text"
            value={formData.primary_color ?? '#2563eb'}
            onChange={(e) => onUpdate({ primary_color: e.target.value })}
            placeholder="#2563eb"
            className={errors.primary_color ? 'border-red-500' : ''}
          />
        </div>
        {errors.primary_color && <p className="text-sm text-red-500 mt-1">{errors.primary_color}</p>}
        <p className="text-sm text-gray-500 mt-1">Used for buttons, links, and accents</p>
      </div>

      {/* Secondary Color */}
      <div>
        <Label htmlFor="secondary_color">Secondary Color *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="secondary_color"
            type="color"
            value={formData.secondary_color ?? '#64748b'}
            onChange={(e) => onUpdate({ secondary_color: e.target.value })}
            className="w-20 h-12 cursor-pointer"
          />
          <Input
            type="text"
            value={formData.secondary_color ?? '#64748b'}
            onChange={(e) => onUpdate({ secondary_color: e.target.value })}
            placeholder="#64748b"
            className={errors.secondary_color ? 'border-red-500' : ''}
          />
        </div>
        {errors.secondary_color && <p className="text-sm text-red-500 mt-1">{errors.secondary_color}</p>}
        <p className="text-sm text-gray-500 mt-1">Used for secondary elements</p>
      </div>

      {/* Document URLs */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-4">Document Links (Optional)</h4>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="ethics_code_url">Ethics Code URL</Label>
            <Input
              id="ethics_code_url"
              type="url"
              value={formData.ethics_code_url ?? ''}
              onChange={(e) => onUpdate({ ethics_code_url: e.target.value })}
              placeholder="https://example.com/ethics-code.pdf"
            />
          </div>

          <div>
            <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
            <Input
              id="privacy_policy_url"
              type="url"
              value={formData.privacy_policy_url ?? ''}
              onChange={(e) => onUpdate({ privacy_policy_url: e.target.value })}
              placeholder="https://example.com/privacy-policy.pdf"
            />
          </div>

          <div>
            <Label htmlFor="membership_rules_url">Membership Rules URL</Label>
            <Input
              id="membership_rules_url"
              type="url"
              value={formData.membership_rules_url ?? ''}
              onChange={(e) => onUpdate({ membership_rules_url: e.target.value })}
              placeholder="https://example.com/membership-rules.pdf"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingStep;
