// frontend/src/features/systemManager/organizations/OrganizationWizard.tsx
import React, { useState } from 'react';
import { useSystemManagerNavigation } from '../hooks/useSystemManagerNavigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { 
  createOrganization,
  checkSubdomainAvailability,
  type CreateOrganizationData 
} from '../../../utils/api/apiOrganizations';

// Step components
import BasicInfoStep from './steps/BasicInfoStep';
import BrandingStep from './steps/BrandingStep';
import SystemManagerStep from './steps/SystemManagerStep';
import ReviewStep from './steps/ReviewStep';

interface WizardStep {
  id: number;
  title: string;
  component: React.ComponentType<StepProps>;
}

export interface StepProps {
  formData: Partial<CreateOrganizationData>;
  onUpdate: (data: Partial<CreateOrganizationData>) => void;
  errors: Record<string, string>;
}

const steps: WizardStep[] = [
  { id: 1, title: 'Basic Information', component: BasicInfoStep },
  { id: 2, title: 'Branding', component: BrandingStep },
  { id: 3, title: 'System Manager', component: SystemManagerStep },
  { id: 4, title: 'Review', component: ReviewStep }
];

const OrganizationWizard: React.FC = () => {
  const { navigateTo } = useSystemManagerNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateOrganizationData>>({
    primary_color: '#2563eb',
    secondary_color: '#e7eaee',
    default_language: 'hr',
    name: '',
    subdomain: '',
    email: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleUpdate = (data: Partial<CreateOrganizationData>): void => {
    setFormData(prev => ({ ...prev, ...data }));
    // Clear errors for updated fields
    const updatedFields = Object.keys(data);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Info
        if (!formData.name) newErrors.name = 'Organization name is required';
        if (!formData.subdomain) {
          newErrors.subdomain = 'Subdomain is required';
        } else {
          // Check subdomain format
          const subdomainRegex = /^[a-z0-9-]+$/;
          if (!subdomainRegex.test(formData.subdomain)) {
            newErrors.subdomain = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
          } else {
            // Check availability
            try {
              const result = await checkSubdomainAvailability(formData.subdomain);
              if (!result.available) {
                newErrors.subdomain = 'This subdomain is already taken';
              }
            } catch (error) {
              console.error('Subdomain check failed:', error);
              newErrors.subdomain = 'Failed to check subdomain availability';
            }
          }
        }
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        break;

      case 2: // Branding
        if (!formData.primary_color) newErrors.primary_color = 'Primary color is required';
        if (!formData.secondary_color) newErrors.secondary_color = 'Secondary color is required';
        break;

      case 3: // System Manager
        if (!formData.sm_username) newErrors.sm_username = 'Username is required';
        if (!formData.sm_email) {
          newErrors.sm_email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.sm_email)) {
          newErrors.sm_email = 'Invalid email format';
        }
        if (!formData.sm_display_name) newErrors.sm_display_name = 'Display name is required';
        if (!formData.sm_password) {
          newErrors.sm_password = 'Password is required';
        } else if (formData.sm_password.length < 8) {
          newErrors.sm_password = 'Password must be at least 8 characters';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async (): Promise<void> => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = (): void => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      // Final validation
      const isValid = await validateStep(3);
      if (!isValid) {
        setSubmitError('Please fix all errors before submitting');
        return;
      }

      // Create organization
      const response = await createOrganization(formData as CreateOrganizationData);
      const newOrgId = response.organization.id;
      
      // Upload logo if provided
      const logoFile = (formData as { logoFile?: File }).logoFile;
      if (logoFile && newOrgId) {
        try {
          const logoFormData = new FormData();
          logoFormData.append('logo', logoFile);
          
          await fetch(`http://localhost:3000/api/system-manager/organizations/${newOrgId}/logo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('systemManagerToken')}`,
            },
            body: logoFormData,
          });
        } catch (logoErr) {
          console.error('Error uploading logo:', logoErr);
          // Don't fail the whole operation if logo upload fails
        }
      }
      
      // Success - redirect to list
      navigateTo('/system-manager/organizations');
    } catch (err) {
      console.error('Error creating organization:', err);
      setSubmitError('Failed to create organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigateTo('/system-manager/organizations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organizations
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Organization</CardTitle>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <span className="text-xs mt-2 text-center">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Current Step Content */}
          <CurrentStepComponent
            formData={formData}
            onUpdate={handleUpdate}
            errors={errors}
          />

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={() => { void handleNext(); }}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => { void handleSubmit(); }} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Organization'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationWizard;
