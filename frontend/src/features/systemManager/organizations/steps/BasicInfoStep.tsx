// frontend/src/features/systemManager/organizations/steps/BasicInfoStep.tsx
import React from 'react';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type { StepProps } from '../OrganizationWizard';

const BasicInfoStep: React.FC<StepProps> = ({ formData, onUpdate, errors }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <p className="text-gray-600 mb-6">
          Enter the basic information for the new organization.
        </p>
      </div>

      {/* Organization Name */}
      <div>
        <Label htmlFor="name">Organization Name *</Label>
        <Input
          id="name"
          value={formData.name ?? ''}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g., Planinarska družina Velebit"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Short Name */}
      <div>
        <Label htmlFor="short_name">Short Name</Label>
        <Input
          id="short_name"
          value={formData.short_name ?? ''}
          onChange={(e) => onUpdate({ short_name: e.target.value })}
          placeholder="e.g., PD Velebit"
        />
        <p className="text-sm text-gray-500 mt-1">Optional - used in compact displays</p>
      </div>

      {/* Subdomain */}
      <div>
        <Label htmlFor="subdomain">Subdomain *</Label>
        <div className="flex items-center gap-2">
          <Input
            id="subdomain"
            value={formData.subdomain ?? ''}
            onChange={(e) => onUpdate({ subdomain: e.target.value.toLowerCase() })}
            placeholder="velebit"
            className={errors.subdomain ? 'border-red-500' : ''}
          />
          <span className="text-gray-600 whitespace-nowrap">managemembers.vercel.app/</span>
        </div>
        {errors.subdomain && <p className="text-sm text-red-500 mt-1">{errors.subdomain}</p>}
        <p className="text-sm text-gray-500 mt-1">
          Only lowercase letters, numbers, and hyphens. This cannot be changed later.
        </p>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Organization Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email ?? ''}
          onChange={(e) => onUpdate({ email: e.target.value })}
          placeholder="info@velebit.hr"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone ?? ''}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          placeholder="+385 23 123 456"
        />
      </div>

      {/* Website */}
      <div>
        <Label htmlFor="website_url">Website URL</Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url ?? ''}
          onChange={(e) => onUpdate({ website_url: e.target.value })}
          placeholder="https://velebit.hr"
        />
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="street_address">Street Address</Label>
        <Input
          id="street_address"
          value={formData.street_address ?? ''}
          onChange={(e) => onUpdate({ street_address: e.target.value })}
          placeholder="Ulica Kralja Tomislava 123"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city ?? ''}
            onChange={(e) => onUpdate({ city: e.target.value })}
            placeholder="Drniš"
          />
        </div>
        <div>
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code ?? ''}
            onChange={(e) => onUpdate({ postal_code: e.target.value })}
            placeholder="22320"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={formData.country ?? 'Hrvatska'}
          onChange={(e) => onUpdate({ country: e.target.value })}
          placeholder="Hrvatska"
        />
      </div>
    </div>
  );
};

export default BasicInfoStep;
