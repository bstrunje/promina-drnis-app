// features/systemManager/pages/settings/sections/ActivityRecognitionSection.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';

// Tipovi za uloge i njihove postotke
interface ActivityRole {
  key: string;
  name: string;
  percentage: number;
  description: string;
}

interface ActivityRecognitionSectionProps {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  onSave: (roles: ActivityRole[]) => Promise<void>;
}

export const ActivityRecognitionSection: React.FC<ActivityRecognitionSectionProps> = ({
  isLoading,
  error,
  successMessage,
  onSave
}) => {
  // Currently hardcoded values - will be loaded from database later
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

  const handlePercentageChange = (key: string, value: number) => {
    setRoles(prev => prev.map(role => 
      role.key === key ? { ...role, percentage: value } : role
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave(roles);
  };

  return (
    <CollapsibleSection title="Activity Recognition Rates" defaultOpen={false}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 mt-4">
        <p className="text-gray-600 text-sm mb-4">
          Set hour recognition percentages for different roles in activities (trips, actions, etc.)
        </p>

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
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${role.percentage}%` }}
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

        {/* Save Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Recognition Rates'}
        </button>
      </form>
    </CollapsibleSection>
  );
};
