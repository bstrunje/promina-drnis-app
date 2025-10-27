// features/systemManager/pages/settings/sections/ActivityCategoriesSubsection.tsx
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Save } from 'lucide-react';
import { useBranding } from '../../../../../hooks/useBranding';
import { Button } from '@components/ui/button';
import { Alert, AlertDescription } from '@components/ui/alert';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { useToast } from '@components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { ActivityType } from '@shared/activity.types';
import api from '../../../../../utils/api/apiConfig';

// Koristimo ActivityType iz shared/types/activity.types.ts

interface ActivityCategoriesSubsectionProps {
  isLoading: boolean;
  error: string | null;
  onSave: (updatedCategories: ActivityType[]) => Promise<void>;
}

export const ActivityCategoriesSubsection: React.FC<ActivityCategoriesSubsectionProps> = ({
  isLoading: parentLoading,
  error: parentError,
  onSave,
}) => {
  const branding = useBranding();
  const primaryColor = branding.getPrimaryColor();
  const { toast } = useToast();
  const { t } = useTranslation('activities');

  // Funkcija za dohvaćanje lokalizirane labele
  const getLocalizedLabel = (key: string): string => {
    return t(`activitiesAdmin.types.${key}`, key);
  };

  // Funkcija za dohvaćanje lokaliziranog opisa
  const getLocalizedDescription = (key: string): string => {
    return t(`activityCategoryPage.descriptions.${key}`, '');
  };
  
  // State za activity types
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Dohvati activity types pri mount-u
  useEffect(() => {
    const fetchActivityTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<ActivityType[]>('/activities/types');
        setActivityTypes(response.data);
      } catch (err) {
        console.error('Error fetching activity types:', err);
        setError('Failed to load activity categories');
      } finally {
        setLoading(false);
      }
    };

    void fetchActivityTypes();
  }, []);

  const handleToggleVisibility = (typeId: number, currentVisibility: boolean) => {
    // Samo ažuriraj lokalno stanje, ne spremaj odmah
    setActivityTypes(prev =>
      prev.map(type =>
        type.type_id === typeId
          ? { ...type, is_visible: !currentVisibility }
          : type
      )
    );
  };

  const handleLabelChange = (typeId: number, newLabel: string) => {
    setActivityTypes(prev =>
      prev.map(type =>
        type.type_id === typeId
          ? { ...type, custom_label: newLabel }
          : type
      )
    );
  };

  const handleDescriptionChange = (typeId: number, newDescription: string) => {
    setActivityTypes(prev =>
      prev.map(type =>
        type.type_id === typeId
          ? { ...type, custom_description: newDescription }
          : type
      )
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      await onSave(activityTypes);

      toast({
        title: 'Success',
        description: 'Activity categories saved successfully',
      });
    } catch (err) {
      console.error('Error saving categories:', err);
      toast({
        title: 'Error',
        description: 'Failed to save categories',
        variant: 'destructive'
      });
      setError('Failed to save categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CollapsibleSection
      title="Activity Categories"
      description="Manage visibility and labels for activity categories"
      defaultOpen={false}
      variant="subsection"
    >

      {(error ?? parentError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error ?? parentError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {(loading ?? parentLoading) ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading categories...</p>
          </div>
        ) : (
          activityTypes.map((type) => (
            <div
              key={type.type_id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                
                {/* Label Input */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label:
                  </label>
                  <input
                    type="text"
                    value={type.custom_label ?? getLocalizedLabel(type.key)}
                    onChange={(e) => handleLabelChange(type.type_id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category label"
                  />
                </div>

                {/* Description Input */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description:
                  </label>
                  <textarea
                    value={type.custom_description ?? getLocalizedDescription(type.key)}
                    onChange={(e) => handleDescriptionChange(type.type_id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Enter category description"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  <strong>Note:</strong> Changes will be saved when you click "Save Categories" button.
                </p>
              </div>

              <Button
                onClick={() => void handleToggleVisibility(type.type_id, type.is_visible)}
                disabled={loading}
                variant={type.is_visible ? 'default' : 'outline'}
                size="sm"
                className="ml-4"
                style={
                  type.is_visible
                    ? {
                        backgroundColor: primaryColor,
                        color: 'white',
                      }
                    : undefined
                }
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (type.is_visible) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColorHover;
                  }
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (type.is_visible) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor;
                  }
                }}
              >
                {type.is_visible ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hidden
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={loading || parentLoading}
          className="flex items-center gap-2 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
          style={{ backgroundColor: (loading || parentLoading) ? '#9CA3AF' : primaryColor }}
          onMouseEnter={(e) => !(loading || parentLoading) && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColorHover)}
          onMouseLeave={(e) => !(loading || parentLoading) && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor)}
        >
          <Save className="w-4 h-4" />
          {loading || parentLoading ? 'Saving...' : 'Save Categories'}
        </Button>
      </div>
    </CollapsibleSection>
  );
};
