import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MemberWithDetails } from '@shared/memberDetails.types';
import { getCurrentDate } from '../../../utils/dateUtils';
import { parseDate } from '../../../utils/dateUtils';

interface StatisticsViewProps {
  members: MemberWithDetails[];
}

/**
 * Komponenta za prikaz statistike članstva
 */
export const StatisticsView: React.FC<StatisticsViewProps> = ({ members }) => {
  const { t } = useTranslation('members');
  // Računanje dobnih skupina u rasponima od 5 godina
  const ageGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    
    // Inicijalizacija grupa po 5 godina
    for (let i = 0; i <= 14; i++) {
      const start = i * 5;
      const end = start + 4;
      if (i === 14) {
        groups['70+'] = 0;
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
      if (age >= 70) {
        groups['70+']++;
      } else {
        const groupStart = Math.floor(age / 5) * 5;
        const groupKey = `${groupStart}-${groupStart + 4}`;
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
    () => registeredMembers.filter(member => (member.total_hours ?? 0) >= 1200).length,
    [registeredMembers]
  );

  const passiveMembersCount = useMemo(
    () => registeredMembers.length - activeMembersCount,
    [registeredMembers, activeMembersCount]
  );

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">{t('statistics.totalMembers')}: {registeredMembers.length}</h3>
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
          <h3 className="text-lg font-semibold mb-4">{t('statistics.genderDistribution')}</h3>
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
          <h3 className="text-lg font-semibold mb-4">{t('statistics.categoryDistribution')}</h3>
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
          <h3 className="text-lg font-semibold mb-4">{t('statistics.feeDistribution')}</h3>
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
        
        {/* Nova statistika po dobnim skupinama */}
        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">{t('statistics.ageDistribution')}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-2">
            {Object.entries(ageGroups).map(([group, count]) => (
              <div key={group} className="bg-gray-50 p-2 rounded-md">
                <div className="text-center">
                  <div className="text-sm text-gray-500">{t('statistics.years', { range: group })}</div>
                  <div className="text-lg font-bold">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
