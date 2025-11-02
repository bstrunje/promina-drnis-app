import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Award } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useUsedSkills } from '../../../hooks/useUsedSkills';
import { ApiUsedSkill } from '../../../utils/api/apiTypes';
import { getMembersWithFunctions, getMembersBySkill } from '../../../utils/api/apiMembers';

interface MemberWithFunction {
  member_id: number;
  full_name: string;
  functions_in_society: string;
}

interface MemberWithSkill {
  member_id: number;
  full_name: string;
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillSelect: (skillName: string, members: string[]) => void;
  onFunctionSelect: (member: MemberWithFunction) => void;
}

const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  isOpen,
  onClose,
  onSkillSelect,
  onFunctionSelect
}) => {
  const { t } = useTranslation('members');
  const { t: tProfile } = useTranslation('profile');
  const { skills, loading: skillsLoading } = useUsedSkills();
  const [functions, setFunctions] = useState<MemberWithFunction[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillMembers, setSkillMembers] = useState<Record<string, MemberWithSkill[]>>({});

  // Dohvati članove s funkcijama
  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        setLoadingFunctions(true);
        const data = await getMembersWithFunctions();
        setFunctions(data);
      } catch (error) {
        console.error('Greška prilikom dohvaćanja funkcija:', error);
        setFunctions([]); // Fallback na prazan array
      } finally {
        setLoadingFunctions(false);
      }
    };

    if (isOpen) {
      void fetchFunctions();
    }
  }, [isOpen]);

  // Dohvati članove po vještini
  const fetchMembersBySkill = async (skillName: string) => {
    if (skillMembers[skillName]) {
      // Ako su članovi već dohvaćeni, samo toggle expand
      setExpandedSkill(expandedSkill === skillName ? null : skillName);
      return;
    }

    try {
      const data = await getMembersBySkill(skillName);
      setSkillMembers(prev => ({
        ...prev,
        [skillName]: data
      }));
      setExpandedSkill(skillName);
    } catch (error) {
      console.error('Greška prilikom dohvaćanja članova po vještini:', error);
      setSkillMembers(prev => ({
        ...prev,
        [skillName]: []
      }));
    }
  };

  // Nema potrebe za posebnim handlerom; člana biramo direktno u listi

  const handleFunctionClick = (member: MemberWithFunction) => {
    onFunctionSelect(member);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-end p-6 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { window.dispatchEvent(new CustomEvent('advancedFilters:explicitClose')); onClose(); }}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Vještine i osposobljenosti */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">{t('advancedFilters.skillsTitle')}</h3>
            </div>
            
            {skillsLoading ? (
              <div className="text-center py-8 text-gray-500">{t('advancedFilters.loadingSkills')}</div>
            ) : skills.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('advancedFilters.noSkills')}</div>
            ) : (
              <div className="space-y-3">
                {skills.map((skill: ApiUsedSkill) => (
                  <div key={skill.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => void fetchMembersBySkill(skill.name)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{tProfile(`skills.${skill.name}`)}</span>
                        <span className="text-sm text-gray-500">({skillMembers[skill.name]?.length ?? skill._count.member_skills} {t('advancedFilters.membersCount')})</span>
                      </div>
                      <div className="text-sm text-blue-600">
                        {expandedSkill === skill.name ? t('advancedFilters.hideMembers') : t('advancedFilters.showMembers')}
                      </div>
                    </button>
                    
                    {expandedSkill === skill.name && skillMembers[skill.name] && (
                      <div className="px-4 py-3 bg-white border-t">
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {skillMembers[skill.name]?.map(member => (
                            <button
                              key={member.member_id}
                              onClick={() => { onSkillSelect(skill.name, [member.full_name]); onClose(); }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded text-sm transition-colors"
                            >
                              • {member.full_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Funkcije u društvu */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">{t('advancedFilters.functionsTitle')}</h3>
            </div>
            
            {loadingFunctions ? (
              <div className="text-center py-8 text-gray-500">{t('advancedFilters.loadingFunctions')}</div>
            ) : !Array.isArray(functions) || functions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('advancedFilters.noFunctions')}</div>
            ) : (
              <div className="space-y-2">
                {functions.map(member => (
                  <button
                    key={member.member_id}
                    onClick={() => handleFunctionClick(member)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-green-700">
                          {member.functions_in_society}
                        </span>
                        <span className="text-gray-500"> - </span>
                        <span className="text-gray-700">{member.full_name}</span>
                      </div>
                      {/* Uklonjen tekst desno; cijeli red je klikabilan */}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => { window.dispatchEvent(new CustomEvent('advancedFilters:explicitClose')); onClose(); }}
            className="w-full"
          >
            {t('advancedFilters.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFiltersModal;
