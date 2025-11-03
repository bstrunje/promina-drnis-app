import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MemberWithDetails } from '@shared/memberDetails.types';
import { parseDate } from '../../../utils/dateUtils';
import { getCurrentDate } from '../../../utils/dateUtils';
import { useSystemSettings } from '../../../hooks/useSystemSettings';
import { isActiveMember } from '../../../utils/activityStatusHelpers';
import { ActivitiesStatsCard } from './ActivitiesStatsCard';

interface StatisticsViewProps {
  members: MemberWithDetails[];
}

/**
 * Komponenta za prikaz statistike članstva
 */
export const StatisticsView: React.FC<StatisticsViewProps> = ({ members }) => {
  const { t } = useTranslation('members');
  const { systemSettings } = useSystemSettings();
  
  // Dohvati activity hours threshold iz system settings (default 20)
  const activityHoursThreshold = systemSettings?.activityHoursThreshold ?? 20;
  
  // Računanje dobnih skupina u rasponima od 5 godina
  const ageGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    
    // Inicijalizacija grupa po 5 godina
    for (let i = 0; i <= 15; i++) {
      const start = i * 5;
      const end = start + 4;
      if (i === 15) {
        groups['75+'] = 0;
      } else if (i === 14) {
        groups['70-74'] = 0;
      } else {
        groups[`${start}-${end}`] = 0;
      }
    }
    
    members.forEach(member => {
      if (!member.date_of_birth) return;
      const birthDate = parseDate(member.date_of_birth);
      if (!birthDate) return;
      const today = getCurrentDate();
      
      // Računanje godina
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Svrstavanje u dobnu skupinu
      if (age >= 75) {
        groups['75+']++;
      } else if (age >= 70) {
        groups['70-74']++;
      } else {
        const groupStart = Math.floor(age / 5) * 5;
        const groupKey = `${groupStart}-${groupStart + 4}`;
        groups[groupKey] ??= 0;
        groups[groupKey]++;
      }
    });
    
    return groups;
  }, [members]);

  const registeredMembers = useMemo(
    () => members.filter(m => m.membershipStatus === 'registered'),
    [members]
  );

  const activeMembersCount = useMemo(
    () => registeredMembers.filter(member => isActiveMember(member.activity_hours, activityHoursThreshold)).length,
    [registeredMembers, activityHoursThreshold]
  );

  const passiveMembersCount = useMemo(
    () => registeredMembers.length - activeMembersCount,
    [registeredMembers, activeMembersCount]
  );

  // Collapsible state for Age Distribution (default collapsed)
  const [openAge, setOpenAge] = useState<boolean>(false);
  // Collapsible state for Membership section (default collapsed)
  const [openMembership, setOpenMembership] = useState<boolean>(false);

  return (
    <div className="space-y-4 px-4 pb-4 pt-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Sekcija: Članstvo */}
        <div className={`bg-white p-6 rounded-lg shadow col-span-full`}>
          <button
            type="button"
            onClick={() => setOpenMembership(v => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block transition-transform duration-200 ${openMembership ? 'rotate-90' : ''}`} aria-hidden>
                ›
              </span>
              <h3 className="text-lg font-semibold">{t('permissions.categories.membership')}</h3>
            </div>
          </button>
          {openMembership && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">{t('statistics.totalMembers')}: {registeredMembers.length}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('statistics.activeMembers')}:</span>
                    <span>{activeMembersCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('statistics.passiveMembers')}:</span>
                    <span>{passiveMembersCount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">{t('statistics.genderDistribution')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('statistics.male')}</span>
                    <span>{members.filter(m => m.gender === 'male').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('statistics.female')}</span>
                    <span>{members.filter(m => m.gender === 'female').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">{t('statistics.categoryDistribution')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('statistics.validMembership')}:</span>
                    <span>{members.filter(m => m.membershipStatus === 'registered').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('statistics.inactive')}:</span>
                    <span>{members.filter(m => m.membershipStatus === 'inactive').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('statistics.pending')}:</span>
                    <span>{members.filter(m => m.membershipStatus === 'pending').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">{t('statistics.feeDistribution')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('statistics.feePaid')}:</span>
                    <span>{members.filter(m => m.feeStatus === 'current').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('statistics.feeRequired')}:</span>
                    <span>{members.filter(m => m.feeStatus === 'payment required').length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aktivnosti po kategorijama - sve godine */}
        <ActivitiesStatsCard />

        {/* Nova statistika po dobnim skupinama (collapsible) */}
        <div className="bg-white p-6 rounded-lg shadow col-span-full">
          <button
            type="button"
            onClick={() => setOpenAge(v => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block transition-transform duration-200 ${openAge ? 'rotate-90' : ''}`} aria-hidden>
                ›
              </span>
              <h3 className="text-lg font-semibold">{t('statistics.ageDistribution')}</h3>
            </div>
          </button>
          {openAge && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-2">
              {Object.entries(ageGroups).map(([group, count]) => (
                <div key={group} className="bg-gray-50 p-2 rounded-md">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">{t('statistics.years', { range: group })}</div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
