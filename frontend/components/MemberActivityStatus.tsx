import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { Member } from '@shared/member';
import { formatMinutesToHoursAndMinutes } from '../src/utils/dateUtils';

interface MemberActivityStatusProps {
  member: Member;
}

const MemberActivityStatus: React.FC<MemberActivityStatusProps> = ({ member }) => {
  const { t } = useTranslation('profile');
  // Koristimo activity_hours za status aktivnosti (prošla + tekuća godina)
  // Ako je članstvo završeno (inactive), prikaži 0 sati
  const activityMinutes = member.status === 'inactive' ? 0 : (member.activity_hours ?? 0);
  const activityHours = activityMinutes / 60;

  const getActivityStatus = (hours: number) => {
    return hours >= 20 ? 'active' : 'passive';
  };

  const status = getActivityStatus(activityHours);
  const hoursNeeded = Math.max(0, 20 - activityHours);

  return (
    <div className="mt-6 pt-4 border-t">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <Clock className="w-5 h-5 mr-2" />
        {t('activityStatus.title')}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-500">{t('activityStatus.totalHours')}</label>
          <p className="font-bold text-lg">{formatMinutesToHoursAndMinutes(activityMinutes)}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">{t('activityStatus.status')}</label>
          <p className={`font-bold text-lg ${status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
            {t(`activityStatus.${status}`)}
          </p>
        </div>
      </div>
      {status === 'passive' && (
        <p className="text-xs text-gray-500 mt-2">
          {t('activityStatus.hoursNeeded', { count: Math.ceil(hoursNeeded) })}
        </p>
      )}
    </div>
  );
};

export default MemberActivityStatus;