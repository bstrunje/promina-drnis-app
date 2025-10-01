import React from 'react';
import { useTranslation } from 'react-i18next';
import { DutyScheduleInfo as ScheduleInfoType } from '../../utils/api/apiDuty';
import './DutyScheduleInfo.css';

interface DutyScheduleInfoProps {
  scheduleInfo: ScheduleInfoType;
}

const DutyScheduleInfo: React.FC<DutyScheduleInfoProps> = ({ scheduleInfo }) => {
  const { t } = useTranslation('duty');

  return (
    <div className="duty-schedule-info">
      <h3>{t('scheduleTitle')}</h3>
      <p className="schedule-description">{t('scheduleDescription')}</p>

        {/* Zimska sezona */}
        <div className="season-card winter">
          <h4>❄️ {t('winter')}</h4>
          <div className="season-details">
            <p><strong>{t('months')}:</strong> {scheduleInfo.winter.months}</p>
            <p><strong>{t('daysLabel')}:</strong> {scheduleInfo.winter.days}</p>
            <p><strong>{t('hours')}:</strong> {scheduleInfo.winter.hours}</p>
            <p><strong>{t('duration')}:</strong> {scheduleInfo.winter.duration}h</p>
          </div>
        </div>
        <div className="season-card summer">
          <h4>☀️ {t('summer')}</h4>
          <div className="season-details">
            <p><strong>{t('months')}:</strong> {scheduleInfo.summer.months}</p>
            <p><strong>{t('daysLabel')}:</strong> {scheduleInfo.summer.days}</p>
            <p><strong>{t('hours')}:</strong> {scheduleInfo.summer.hours}</p>
            <p><strong>{t('duration')}:</strong> {scheduleInfo.summer.duration}h</p>
          </div>
        </div>
        <div className="season-card summer-peak">
          <h4>🔥 {t('summerPeak')}</h4>
          <div className="season-details">
            <p><strong>{t('months')}:</strong> {scheduleInfo.summerPeak.months}</p>
            <p><strong>{t('daysLabel')}:</strong> {scheduleInfo.summerPeak.days}</p>
            <p><strong>{t('hours')}:</strong> {scheduleInfo.summerPeak.hours}</p>
            <p><strong>{t('duration')}:</strong> {scheduleInfo.summerPeak.duration}h</p>
          </div>
        </div>
      <div className="schedule-note">
        <p>ℹ️ {t('scheduleNote')}</p>
      </div>
    </div>
  );
};

export default DutyScheduleInfo;
