// frontend/src/features/systemManager/organizations/steps/BrandingStep.tsx
import React, { useState } from 'react';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Button } from '@components/ui/button';
import { Upload, X } from 'lucide-react';
import type { StepProps } from '../OrganizationWizard';
import type { CreateOrganizationData } from '../../../../utils/api/apiOrganizations';

const BrandingStep: React.FC<StepProps> = ({ formData, onUpdate, errors }) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      // Store file in formData (will be uploaded after organization creation)
      onUpdate({ logoFile: file } as Partial<CreateOrganizationData> & { logoFile?: File });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = (): void => {
    onUpdate({ logoFile: undefined } as Partial<CreateOrganizationData> & { logoFile?: File });
    setLogoPreview(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Branding</h3>
        <p className="text-gray-600 mb-6">
          Customize the appearance of the organization.
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <Label>Organization Logo</Label>
        <div className="mt-2 flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <img 
                src={logoPreview} 
                alt="Logo preview" 
                className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={handleRemoveLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="cursor-pointer"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload PNG, JPG or SVG (max 2MB)
            </p>
          </div>
        </div>
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

      {/* Default Language */}
      <div>
        <Label htmlFor="default_language">Default Language *</Label>
        <select
          id="default_language"
          value={formData.default_language ?? 'hr'}
          onChange={(e) => onUpdate({ default_language: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="hr">Croatian (Hrvatski)</option>
          <option value="en">English</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          This language will be used by default for all members of this organization. SystemManager will always use English.
        </p>
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
