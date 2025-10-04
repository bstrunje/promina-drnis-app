// frontend/src/features/systemManager/organizations/steps/ReviewStep.tsx
import React from 'react';
import { Building2, Mail, Phone, Globe, User, Shield } from 'lucide-react';
import type { StepProps } from '../OrganizationWizard';

const ReviewStep: React.FC<StepProps> = ({ formData }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Review & Confirm</h3>
        <p className="text-gray-600 mb-6">
          Please review all information before creating the organization.
        </p>
      </div>

      {/* Organization Info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Information
        </h4>
        <div className="space-y-2 text-sm">
          <div><strong>Name:</strong> {formData.name}</div>
          {formData.short_name && <div><strong>Short Name:</strong> {formData.short_name}</div>}
          <div><strong>Subdomain:</strong> {formData.subdomain}.platforma.hr</div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {formData.email}
          </div>
          {formData.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {formData.phone}
            </div>
          )}
          {formData.website_url && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {formData.website_url}
            </div>
          )}
          {(formData.street_address ?? formData.city ?? formData.postal_code) && (
            <div>
              <strong>Address:</strong>{' '}
              {[formData.street_address, formData.city, formData.postal_code, formData.country]
                .filter(Boolean)
                .join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Branding */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold">Branding</h4>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Primary Color</div>
            <div className="flex items-center gap-2">
              <div 
                className="w-12 h-12 rounded border"
                style={{ backgroundColor: formData.primary_color }}
              />
              <span className="text-sm">{formData.primary_color}</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Secondary Color</div>
            <div className="flex items-center gap-2">
              <div 
                className="w-12 h-12 rounded border"
                style={{ backgroundColor: formData.secondary_color }}
              />
              <span className="text-sm">{formData.secondary_color}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Manager */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          System Manager Account
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <strong>Username:</strong> {formData.sm_username}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <strong>Email:</strong> {formData.sm_email}
          </div>
          <div><strong>Display Name:</strong> {formData.sm_display_name}</div>
        </div>
      </div>

      {/* Documents */}
      {(formData.ethics_code_url ?? formData.privacy_policy_url ?? formData.membership_rules_url) && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold">Document Links</h4>
          <div className="space-y-2 text-sm">
            {formData.ethics_code_url && <div><strong>Ethics Code:</strong> {formData.ethics_code_url}</div>}
            {formData.privacy_policy_url && <div><strong>Privacy Policy:</strong> {formData.privacy_policy_url}</div>}
            {formData.membership_rules_url && <div><strong>Membership Rules:</strong> {formData.membership_rules_url}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
