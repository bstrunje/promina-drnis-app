import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Award, Archive, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { useUsedSkills } from '../../../hooks/useUsedSkills';
import { ApiUsedSkill } from '../../../utils/api/apiTypes';
import { getMembersWithFunctions, getMembersBySkill } from '../../../utils/api/apiMembers';
import { MemberWithDetails } from '@shared/memberDetails.types';

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
  onArchiveSelect: (filterValue: 'all' | 'inactive', year?: number, searchTerm?: string) => void;
  members: MemberWithDetails[];
}

const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  isOpen,
  onClose,
  onSkillSelect,
  onFunctionSelect,
  onArchiveSelect,
  members
}) => {
  const { t } = useTranslation('members');
  const { t: tProfile } = useTranslation('profile');
  const { skills, loading: skillsLoading } = useUsedSkills();
  const [functions, setFunctions] = useState<MemberWithFunction[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [skillMembers, setSkillMembers] = useState<Record<string, MemberWithSkill[]>>({});

  // Helper funkcija za hrvatsku pluralizaciju
  const getHrPluralKey = (count: number, baseKey: string): string => {
    if (count === 1) return `${baseKey}_one`;
    if (count >= 2 && count <= 4) return `${baseKey}_few`;
    return `${baseKey}_other`;
  };
  
  // State za kolapsibilne sekcije
  const [skillsCollapsed, setSkillsCollapsed] = useState(true);
  const [functionsCollapsed, setFunctionsCollapsed] = useState(true);
  const [archiveCollapsed, setArchiveCollapsed] = useState(true);
  const [archiveSearch, setArchiveSearch] = useState('');
  
  // State za pronađene članove u arhivi
  const [archiveResults, setArchiveResults] = useState<MemberWithDetails[]>([]);

  // Real-time pretraga arhive - filtrira članove lokalno bez zatvaranja modala
  useEffect(() => {
    if (archiveSearch.trim()) {
      const searchLower = archiveSearch.toLowerCase();
      const inactiveMembers = members.filter(member => {
        // Filtriraj samo neaktivne članove
        const periods = member.membership_history?.periods ?? [];
        const hasEndedMembership = periods.some(period => period.end_date);
        return hasEndedMembership;
      });

      // Pretraži po imenu
      const results = inactiveMembers.filter(member => {
        const fullName = member.full_name ?? `${member.first_name} ${member.last_name}`;
        return fullName.toLowerCase().includes(searchLower);
      });

      setArchiveResults(results);
    } else {
      setArchiveResults([]);
    }
  }, [archiveSearch, members]);

  // Handler za odabir člana iz rezultata pretrage
  const handleSelectArchiveMember = (memberName: string) => {
    console.log('[AdvancedFiltersModal] Selected archive member:', memberName);
    onArchiveSelect('inactive', undefined, memberName);
    onClose();
  };

  // Handler za prikaz svih bivših članova
  const handleShowAllInactive = () => {
    console.log('[AdvancedFiltersModal] Show all inactive members');
    onArchiveSelect('inactive', undefined, archiveSearch.trim() || undefined);
    onClose();
  };

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
          <div className="mb-4 border rounded-lg">
            <button
              onClick={() => setSkillsCollapsed(!skillsCollapsed)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">{t('advancedFilters.skillsTitle')}</h3>
              </div>
              {skillsCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>
            
            {!skillsCollapsed && (
              <div className="p-4 border-t">
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
            )}
          </div>

          {/* Funkcije u društvu */}
          <div className="mb-4 border rounded-lg">
            <button
              onClick={() => setFunctionsCollapsed(!functionsCollapsed)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">{t('advancedFilters.functionsTitle')}</h3>
              </div>
              {functionsCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>
            
            {!functionsCollapsed && (
              <div className="p-4 border-t">
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
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Arhiva */}
          <div className="border rounded-lg">
            <button
              onClick={() => setArchiveCollapsed(!archiveCollapsed)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">{t('advancedFilters.archiveTitle')}</h3>
              </div>
              {archiveCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>
            
            {!archiveCollapsed && (
              <div className="p-4 border-t space-y-2">
                {/* Tražilica za arhivu */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={t('advancedFilters.searchArchivePlaceholder')}
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Rezultati pretrage */}
                  {archiveSearch && archiveResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto bg-white">
                      <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b">
                        {t(getHrPluralKey(archiveResults.length, 'advancedFilters.foundMembers'), { count: archiveResults.length })}
                      </p>
                      {archiveResults.map(member => (
                        <button
                          key={member.member_id}
                          onClick={() => handleSelectArchiveMember(member.full_name ?? `${member.first_name} ${member.last_name}`)}
                          className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm transition-colors border-b last:border-b-0"
                        >
                          {member.full_name ?? `${member.first_name} ${member.last_name}`}
                        </button>
                      ))}
                    </div>
                  )}

                </div>

                {/* Gumb za sve bivše članove - prikaži samo ako nema rezultata pretrage */}
                {!archiveSearch && (
                  <button
                    onClick={handleShowAllInactive}
                    className="w-full text-left px-4 py-2 hover:bg-orange-50 rounded text-sm transition-colors mb-3 font-medium text-orange-600 border border-orange-200"
                  >
                    {t('advancedFilters.allInactive')}
                  </button>
                )}

                {/* Prikaži godine samo ako nema rezultata pretrage članova */}
                {!archiveSearch && (
                  <p className="text-sm text-gray-500 mb-2">{t('advancedFilters.byPeriod')}</p>
                )}
                
                {/* Nema rezultata - prikaži samo ako nema pronađenih članova */}
                {archiveSearch && archiveResults.length === 0 && (
                  <p className="text-sm text-gray-400 px-4 py-2 mb-2">
                    {t('advancedFilters.noResults', { search: archiveSearch })}
                  </p>
                )}
                {/* Dinamički generirane godine - prikaži samo kada nema pretrage članova */}
                {!archiveSearch && (() => {
                  // Izvuci sve godine završetka članstva
                  const endYears = new Set<number>();
                  members.forEach(member => {
                    const periods = member.membership_history?.periods ?? [];
                    periods.forEach(period => {
                      if (period.end_date) {
                        const year = new Date(period.end_date).getFullYear();
                        endYears.add(year);
                      }
                    });
                  });
                  
                  // Sortiraj godine silazno
                  const sortedYears = Array.from(endYears).sort((a, b) => b - a);
                  
                  if (sortedYears.length === 0) {
                    return <p className="text-sm text-gray-400 px-4 py-2">{t('advancedFilters.noArchive', 'Nema arhiviranih članova')}</p>;
                  }
                  
                  return sortedYears.map(year => (
                    <button
                      key={year}
                      onClick={() => { onArchiveSelect('inactive', year); onClose(); }}
                      className="w-full text-left px-4 py-2 hover:bg-orange-50 rounded text-sm transition-colors mb-1"
                    >
                      {t('advancedFilters.year', { year })}
                    </button>
                  ));
                })()}
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
