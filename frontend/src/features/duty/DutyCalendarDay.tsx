import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, isBefore, startOfDay } from 'date-fns';
import { DutyActivity, Holiday } from '../../utils/api/apiDuty';
import './DutyCalendarDay.css';

interface DutyCalendarDayProps {
  date: Date;
  duty?: DutyActivity;
  holiday?: Holiday;
  isWeekend: boolean;
  maxParticipants: number;
  onJoin: (date: Date) => void;
  isSuperUser?: boolean;
}

const DutyCalendarDay: React.FC<DutyCalendarDayProps> = ({
  date,
  duty,
  holiday,
  isWeekend,
  maxParticipants,
  onJoin,
  isSuperUser = false
}) => {
  const { t } = useTranslation('duty');
  
  const participantCount = duty?.participants?.length ?? 0;
  const isFull = participantCount >= maxParticipants;
  
  // Provjera je li datum u prošlosti
  const isPastDate = isBefore(startOfDay(date), startOfDay(new Date()));
  
  // Određivanje može li se kliknuti
  // Prošli datumi: samo superuser može kliknuti (za editiranje povijesti)
  // Budući datumi: svi mogu kliknuti ako je vikend/praznik i nije puno
  const canJoin = isPastDate 
    ? isSuperUser 
    : (isWeekend || holiday) && !isFull;
  
  // Određivanje CSS klasa
  const getDayClasses = () => {
    const classes = ['duty-calendar-day'];
    
    if (!isWeekend && !holiday) {
      classes.push('not-available');
    } else if (isFull) {
      classes.push('full');
    } else if (participantCount > 0) {
      classes.push('partial');
    } else {
      classes.push('available');
    }
    
    if (holiday) {
      classes.push('holiday');
    } else if (isWeekend) {
      classes.push('weekend');
    }
    
    if (canJoin) {
      classes.push('clickable');
    }
    
    return classes.join(' ');
  };

  const handleClick = () => {
    if (canJoin) {
      const confirmMsg = holiday 
        ? t('confirmJoinHoliday', { holiday: holiday.name, date: format(date, 'dd.MM.yyyy') })
        : t('confirmJoin', { date: format(date, 'dd.MM.yyyy') });
      
      if (window.confirm(confirmMsg)) {
        onJoin(date);
      }
    }
  };

  return (
    <div className={getDayClasses()} onClick={handleClick}>
      {/* Broj dana */}
      <div className="day-number">{format(date, 'd')}</div>
      
      {/* Oznaka praznika */}
      {holiday && (
        <div className="holiday-badge" title={holiday.name}>
          🔴
        </div>
      )}
      
      {/* Oznaka vikenda */}
      {isWeekend && !holiday && (
        <div className="weekend-badge">
          🟢
        </div>
      )}
      
      {/* Sudionici */}
      {duty && (
        <div className="participants-section">
          <div className="participants-count">
            {participantCount}/{maxParticipants}
          </div>
          <div className="participants-list">
            {duty.participants.map(p => (
              <div key={p.participation_id} className="participant-name" title={p.member.full_name}>
                {p.member.full_name}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Button za pridruživanje */}
      {!isPastDate && canJoin && !duty && (
        <button className="join-button" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
          {t('join')}
        </button>
      )}
      
      {!isPastDate && canJoin && duty && participantCount < maxParticipants && (
        <button className="join-button" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
          +
        </button>
      )}
      
      {/* Status oznake */}
      {!isWeekend && !holiday && (
        <div className="not-available-label">{t('workday')}</div>
      )}
      
      {isFull && (
        <div className="full-label">{t('fullLabel')}</div>
      )}
    </div>
  );
};

export default DutyCalendarDay;
