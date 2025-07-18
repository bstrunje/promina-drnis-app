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
  const { t } = useTranslation();
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

  // Filtriramo samo članove s važećim članstvom za statistiku aktivnosti
  const currentMembers = useMemo(
    () => members.filter(m => m.membershipStatus === 'registered'),
    [members]
  );

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Ukupno članova: {currentMembers.length}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Aktivni članovi:</span>
              <span>{currentMembers.filter(m => m.isActive).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Pasivni članovi:</span>
              <span>{currentMembers.filter(m => !m.isActive).length}</span>
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
          <h3 className="text-lg font-semibold mb-4">Podjela po kategoriji</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Članstvo važeće:</span>
              <span>{members.filter(m => m.membershipStatus === 'registered').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Neaktivni:</span>
              <span>{members.filter(m => m.membershipStatus === 'inactive').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Na čekanju:</span>
              <span>{members.filter(m => m.membershipStatus === 'pending').length}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Podjela po plaćanju članarine</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Plaćena članarina:</span>
              <span>{members.filter(m => m.feeStatus === 'current').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Potrebno platiti:</span>
              <span>{members.filter(m => m.feeStatus === 'payment required').length}</span>
            </div>
          </div>
        </div>
        
        {/* Nova statistika po dobnim skupinama */}
        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Statistika po dobnim skupinama</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-2">
            {Object.entries(ageGroups).map(([group, count]) => (
              <div key={group} className="bg-gray-50 p-2 rounded-md">
                <div className="text-center">
                  <div className="text-sm text-gray-500">{group} godina</div>
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
