// features/systemManager/pages/settings/sections/ActivitiesSection.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { useBranding } from '../../../../../hooks/useBranding';
import { ActivityCategoriesSubsection } from './ActivityCategoriesSubsection';
import { ActivityType } from '@shared/activity.types';
import api from '../../../../../utils/api/apiConfig';

// Tipovi za uloge i njihove postotke
interface ActivityRole {
  key: string;
  name: string;
  percentage: number;
  description: string;
}

interface ActivitiesSectionProps {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  activityHoursThreshold: number;
  onSaveRoles: (roles: ActivityRole[]) => Promise<void>;
  onSaveThreshold: (threshold: number) => Promise<void>;
}

export const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({
  isLoading,
  error,
  successMessage,
  activityHoursThreshold,
  onSaveRoles,
  onSaveThreshold
}) => {
  const branding = useBranding();
  const primaryColor = branding.getPrimaryColor();
  
  // Helper funkcija za tamnjenje boje za hover efekt
  const darkenColor = (color: string, percent = 20): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };
  
  const primaryColorHover = darkenColor(primaryColor);
  
  // Trip Role Setup - trenutne hardkodirane vrijednosti
  const [roles, setRoles] = React.useState<ActivityRole[]>([
    {
      key: 'guide',
      name: 'Guide',
      percentage: 100,
      description: 'Responsible for leading the trip'
    },
    {
      key: 'assistant_guide',
      name: 'Assistant Guide',
      percentage: 50,
      description: 'Assists the guide in leading'
    },
    {
      key: 'driver',
      name: 'Driver',
      percentage: 100,
      description: 'Drives the vehicle'
    },
    {
      key: 'participant',
      name: 'Participant',
      percentage: 10,
      description: 'Participates in the activity'
    }
  ]);

  // Activity Status Threshold - lokalni state
  const [threshold, setThreshold] = React.useState<number>(activityHoursThreshold);

  // Sinkroniziraj threshold s props-om
  React.useEffect(() => {
    setThreshold(activityHoursThreshold);
  }, [activityHoursThreshold]);

  const handlePercentageChange = (key: string, value: number) => {
    setRoles(prev => prev.map(role => 
      role.key === key ? { ...role, percentage: value } : role
    ));
  };

  const handleRolesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSaveRoles(roles);
  };

  const handleThresholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSaveThreshold(threshold);
  };

  const handleSaveCategories = async (updatedCategories: ActivityType[]) => {
    try {
      // Pozovi API za svaku kategoriju koja se promijenila
      const updatePromises = updatedCategories.map(category => 
        api.patch(`/activities/types/${category.type_id}`, {
          is_visible: category.is_visible,
          custom_label: category.custom_label,
          custom_description: category.custom_description,
        })
      );

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error saving categories:', err);
      throw err; // Propagate error za subsection
    }
  };

  return (
    <CollapsibleSection title="Activities" defaultOpen={false}>
      <div className="space-y-8 mt-4">
        
        {/* Activity Categories Subsection */}
        <ActivityCategoriesSubsection
          isLoading={isLoading}
          error={error}
          onSave={handleSaveCategories}
        />

        {/* Trip Role Setup Subsection */}
        <CollapsibleSection
          title="Trip Role Setup"
          description="Set hour recognition percentages for different roles in activities (trips, actions, etc.)"
          defaultOpen={false}
          variant="subsection"
        >

          <form onSubmit={(e) => void handleRolesSubmit(e)} className="space-y-4">
            {roles.map((role) => (
              <div key={role.key} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold">
                      {role.name}
                    </label>
                    <p className="text-gray-600 text-xs mt-1">
                      {role.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={role.percentage}
                      onChange={(e) => handlePercentageChange(role.key, parseInt(e.target.value) || 0)}
                      className="shadow appearance-none border rounded w-20 py-2 px-3 text-gray-700 text-center leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <span className="text-gray-700 font-semibold">%</span>
                  </div>
                </div>
                
                {/* Vizualni prikaz postotka */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${role.percentage}%`, backgroundColor: primaryColor }}
                  />
                </div>
              </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> These percentages determine how many hours will be credited to each participant based on their role.
                For example, if an activity lasts 8 hours, a guide will receive 8 hours (100%), while a participant will receive 0.8 hours (10%).
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
              style={{ backgroundColor: isLoading ? '#9CA3AF' : primaryColor }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = primaryColorHover)}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = primaryColor)}
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Recognition Rates'}
            </button>
          </form>
        </CollapsibleSection>

        {/* Activity Status Subsection */}
        <CollapsibleSection
          title="Activity Status"
          description="Set the minimum number of hours required for a member to achieve 'Active' status. Members with fewer hours will be marked as 'Passive'."
          defaultOpen={false}
          variant="subsection"
        >

          <form onSubmit={(e) => void handleThresholdSubmit(e)} className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="block text-gray-700 text-sm font-bold">
                Minimum Hours for Active Status:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 20)}
                  className="shadow appearance-none border rounded w-24 py-2 px-3 text-gray-700 text-center leading-tight focus:outline-none focus:shadow-outline"
                />
                <span className="text-gray-700 font-semibold">hours</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> This threshold is calculated based on activity hours from the current and previous year. 
                Members who accumulate at least {threshold} hours will be classified as "Active", while those below this threshold will be "Passive".
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
              style={{ backgroundColor: isLoading ? '#9CA3AF' : primaryColor }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = primaryColorHover)}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = primaryColor)}
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Activity Status Threshold'}
            </button>
          </form>
        </CollapsibleSection>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};
