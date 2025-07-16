import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../src/utils/api';

// Definicija tipova
interface Skill {
  id: number;
  name: string;
  is_instructor_possible: boolean;
}

export interface SelectedSkill {
  skill_id: number;
  is_instructor: boolean;
}

interface SkillsSelectorProps {
  value: SelectedSkill[];
  otherSkills: string;
  onChange: (selected: SelectedSkill[], other: string) => void;
  isEditing?: boolean;
}

const SkillsSelector: React.FC<SkillsSelectorProps> = ({ value, otherSkills, onChange, isEditing = true }) => {
  const { t } = useTranslation();
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const response = await api.get<Skill[]>('/skills');
        setAllSkills(response.data);
        setError(null);
      } catch (err) {
        setError(t('skillsSelector.errors.fetchError'));
        console.error('Failed to fetch skills:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [t]);

  const handleSkillChange = (skillId: number) => {
    const isSelected = value.some(s => s.skill_id === skillId);
    let newSelection;

    if (isSelected) {
      newSelection = value.filter(s => s.skill_id !== skillId);
    } else {
      newSelection = [...value, { skill_id: skillId, is_instructor: false }];
    }
    onChange(newSelection, otherSkills);
  };

  const handleInstructorChange = (skillId: number) => {
    const newSelection = value.map(s => 
      s.skill_id === skillId ? { ...s, is_instructor: !s.is_instructor } : s
    );
    onChange(newSelection, otherSkills);
  };

  const handleOtherSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(value, e.target.value);
  };

  if (loading) {
    return <div>{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!isEditing) {
    const selectedSkillDetails = value
      .map(selected => {
        const skillInfo = allSkills.find(s => s.id === selected.skill_id);
        if (!skillInfo) return null;
        return {
          ...skillInfo,
          is_instructor: selected.is_instructor,
        };
      })
      .filter(Boolean) as (Skill & { is_instructor: boolean })[];

    const hasSkills = selectedSkillDetails.length > 0 || (otherSkills && otherSkills.trim() !== '');

    if (!hasSkills) {
      return null;
    }

    return (
      <div className="py-2">
        <ul className="space-y-1">
          {selectedSkillDetails.map(skill => (
            <li key={skill.id} className="text-sm text-gray-800">
              <span className="font-medium">{skill.name}</span>
              {skill.is_instructor && <span className="ml-2 text-xs font-semibold text-white bg-blue-500 px-2 py-0.5 rounded-full">{t('skillsSelector.instructor')}</span>}
            </li>
          ))}
        </ul>
        {otherSkills && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-800">{t('skillsSelector.other')}:</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{otherSkills}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-md bg-blue-50 border-blue-200">
      <div className="space-y-3">
        {allSkills.map(skill => {
          const selection = value.find(s => s.skill_id === skill.id);
          const isSelected = !!selection;

          return (
            <div key={skill.id} className="flex items-center justify-between p-2 rounded-md transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}">
              <div className="flex-1">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSkillChange(skill.id)}
                    disabled={!isEditing}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-gray-800 font-medium">{skill.name}</span>
                </label>
              </div>
              {skill.is_instructor_possible && (
                <div className="flex-shrink-0 ml-4">
                  <label className={`flex items-center cursor-pointer ${!isSelected ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selection?.is_instructor ?? false}
                      onChange={() => handleInstructorChange(skill.id)}
                      disabled={!isSelected || !isEditing}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{t('skillsSelector.instructor')}</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="pt-3 border-t">
        <label htmlFor="other_skills" className="block text-sm font-medium text-gray-700">
          {t('skillsSelector.other')}
        </label>
        <div className="mt-1 w-full">
          <input
            type="text"
            id="other_skills"
            value={otherSkills}
            onChange={handleOtherSkillsChange}
            disabled={!isEditing}
            placeholder={t('skillsSelector.otherPlaceholder', 'Unesite ostale vještine...')}
            className="block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default SkillsSelector;

