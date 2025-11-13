import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  startOfDay
} from 'date-fns';
import { hr } from 'date-fns/locale';
import { dutyApi, DutyCalendarData, DutyActivity, Holiday } from '../../utils/api/apiDuty';
import DutyCalendarDay from './DutyCalendarDay';
import DutyScheduleInfo from './DutyScheduleInfo';
import { useAuth } from '../../context/useAuth';
import { useBranding } from '../../hooks/useBranding';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@components/ui/dialog';
import './DutyCalendar.css';

interface DutyOption {
  type: 'join_existing' | 'extend_own' | 'join_group' | 'create_new';
  activity?: DutyActivity;
  newName?: string;
  message: string;
}

const DutyCalendar: React.FC = () => {
  const { t, i18n } = useTranslation('duty');
  const { user } = useAuth();
  const { branding } = useBranding();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DutyCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Provjera je li korisnik superuser
  const isSuperUser = user?.role === 'member_superuser';
  
  // Filtri
  const [filters, setFilters] = useState({
    weekend: true,
    holiday: true,
    allDays: false, // Po defaultu isključeno - prikazuje samo vikende/praznike
    partial: true,
    full: true
  });
  
  // Mobilni filter toggle
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // State za Smart Grouping modal
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);
  const [smartDialogDate, setSmartDialogDate] = useState<Date | null>(null);
  const [smartDialogOptions, setSmartDialogOptions] = useState<DutyOption[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  const locale = i18n.language === 'hr' ? hr : undefined;

  // Dohvati podatke za trenutni mjesec
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const data = await dutyApi.getCalendarMonth(year, month);
        setCalendarData(data);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(t('errorLoadingCalendar'));
      } finally {
        setLoading(false);
      }
    };

    void fetchCalendarData();
  }, [currentDate, t]);

  // Generiraj sve dane u mjesecu
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Helper - izvuci datume iz naziva aktivnosti (kopija backend logike)
  const extractDatesFromActivity = (activity: DutyActivity): Date[] => {
    const dates = [new Date(activity.start_date)];
    
    // Pokušaj parsirati dodatne datume iz naziva aktivnosti
    // Format: "Dežurstvo 26.10-27.10.2024" ili "Dežurstvo 26.10.2024"
    const regex = /(\d{1,2}\.\d{1,2})(?:-(\d{1,2}\.\d{1,2}))?\.(\d{4})/;
    const nameMatch = regex.exec(activity.name);
    if (nameMatch) {
      const year = parseInt(nameMatch[3]);
      const startDateStr = `${nameMatch[1]}.${year}`;
      const endDateStr = nameMatch[2] ? `${nameMatch[2]}.${year}` : null;
      
      try {
        // Dodaj start datum ako nije već dodan
        const startDate = new Date(startDateStr.split('.').reverse().join('-'));
        if (!dates.some(d => isSameDay(d, startDate))) {
          dates.push(startDate);
        }
        
        // Dodaj end datum ako postoji
        if (endDateStr) {
          const endDate = new Date(endDateStr.split('.').reverse().join('-'));
          if (!dates.some(d => isSameDay(d, endDate))) {
            dates.push(endDate);
          }
        }
      } catch {
        // Ignoriraj greške parsiranja
      }
    }
    
    return dates;
  };

  // Helper - pronađi duty za određeni datum
  const getDutyForDate = (date: Date): DutyActivity | undefined => {
    if (!calendarData) return undefined;
    
    return calendarData.duties.find(duty => {
      const activityDates = extractDatesFromActivity(duty);
      return activityDates.some(activityDate => isSameDay(activityDate, date));
    });
  };

  // Helper - provjeri je li praznik
  const getHolidayForDate = (date: Date): Holiday | undefined => {
    if (!calendarData) return undefined;
    
    return calendarData.holidays.find(holiday => 
      isSameDay(new Date(holiday.date), date)
    );
  };

  // Helper - izračunaj koliko praznih ćelija treba na početku mjeseca
  const getEmptyDaysAtStart = (): number => {
    const firstDayOfMonth = startOfMonth(currentDate);
    const dayOfWeek = firstDayOfMonth.getDay();
    
    // getDay() vraća: 0=nedjelja, 1=ponedjeljak, 2=utorak, ..., 6=subota
    // Trebamo konvertirati u: 0=ponedjeljak, 1=utorak, ..., 6=nedjelja
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  // Helper - provjeri popunjenost dežurstva
  const getDutyStatus = (duty: DutyActivity | undefined, maxParticipants: number): 'available' | 'partial' | 'full' | null => {
    if (!duty) return 'available';
    
    const participantCount = duty.participants?.length || 0;
    
    if (participantCount === 0) return 'available';
    if (participantCount >= maxParticipants) return 'full';
    return 'partial';
  };

  // Handler za promjenu filtera
  const handleFilterChange = (filterKey: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Provjeri treba li prikazati dan prema filterima
  const shouldShowDay = (date: Date, duty: DutyActivity | undefined, holiday: Holiday | undefined, isWeekend: boolean): boolean => {
    const maxParticipants = calendarData?.settings.dutyMaxParticipants ?? 2;
    const status = getDutyStatus(duty, maxParticipants);
    
    // Ako je "Svi dani" uključen, prikaži SVE dane bez obzira na ostale filtere
    if (filters.allDays) {
      return true;
    }
    
    // NOVA FUNKCIONALNOST: Ako postoji duty s prijavljenim članovima, UVIJEK prikaži
    // (bez obzira je li vikend/praznik)
    if ((duty?.participants?.length ?? 0) > 0) {
      // Provjeri status popunjenosti - respektiraj filtere za popunjenost
      if (status === 'partial' && !filters.partial) return false;
      if (status === 'full' && !filters.full) return false;
      return true;
    }
    
    // Inače, prikaži samo dane koji zadovoljavaju kriterije (vikend/praznik)
    // Ako dan nije vikend NI praznik, ne prikazuj ga
    if (!isWeekend && !holiday) {
      return false;
    }
    
    // Provjeri vikend filter
    if (isWeekend && !filters.weekend) return false;
    
    // Provjeri praznik filter
    if (holiday && !filters.holiday) return false;
    
    // Provjeri status popunjenosti
    if (status === 'partial' && !filters.partial) return false;
    if (status === 'full' && !filters.full) return false;
    
    return true;
  };

  // Navigacija
  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper za stvaranje dežurstva i refresh kalendara
  const createDutyForDate = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Kreiraj dežurstvo (backend će automatski primijeniti Smart Grouping)
    await dutyApi.createDutyShift(dateStr);

    // Osvježi podatke
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const data = await dutyApi.getCalendarMonth(year, month);
    setCalendarData(data);

    alert(t('successJoined'));
  };

  // Handler za potvrdu izbora u Smart Grouping modalu
  const handleConfirmSmartOption = async () => {
    if (!smartDialogDate) {
      setSmartDialogOpen(false);
      return;
    }
    try {
      await createDutyForDate(smartDialogDate);
    } catch (err) {
      console.error('Error joining duty:', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('errorJoining');
      alert(errorMsg);
    } finally {
      setSmartDialogOpen(false);
    }
  };

  // Handler za pridruživanje dežurstvu s Smart Grouping
  const handleJoinDuty = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Dohvati opcije za Smart Grouping
      const options = await dutyApi.getDutyCreationOptions(dateStr);
      
      if (!options.canCreate) {
        alert(options.error ?? t('errorJoining'));
        return;
      }

      // Lokaliziraj poruke za opcije umjesto da koristiš opt.message s backend-a
      const localizedOptions: DutyOption[] = options.options.map((opt) => {
        let message = opt.message;
        switch (opt.type) {
          case 'extend_own':
            message = t('smartGrouping.extendOwn', { date: format(date, 'dd.MM.yyyy') });
            break;
          case 'join_group':
            message = t('smartGrouping.joinGroup', { activityName: opt.activity?.name ?? '' });
            break;
          case 'create_new':
            message = t('smartGrouping.createNew', { activityName: opt.newName ?? '' });
            break;
          case 'join_existing':
            message = t('smartGrouping.joinExisting', { date: format(date, 'dd.MM.yyyy') });
            break;
        }
        return {
          type: opt.type,
          activity: opt.activity,
          newName: opt.newName,
          message
        };
      });

      // Ako nema ili ima samo jednu opciju, nema potrebe za dijalogom
      if (localizedOptions.length <= 1) {
        await createDutyForDate(date);
        return;
      }

      // Inače otvori modal s popisom lokaliziranih opcija (konkretnu odluku i dalje obrađuje backend)
      setSmartDialogDate(date);
      setSmartDialogOptions(localizedOptions);
      setSelectedOptionIndex(0);
      setSmartDialogOpen(true);
    } catch (err) {
      console.error('Error joining duty:', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('errorJoining');
      alert(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="duty-calendar-loading">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="duty-calendar-error">
        <p>{error}</p>
        <button onClick={() => setCurrentDate(new Date())}>{t('retry')}</button>
      </div>
    );
  }

  if (!calendarData) {
    return null;
  }

  // Provjeri je li kalendar omogućen
  if (!calendarData.settings.dutyCalendarEnabled) {
    return (
      <div className="duty-calendar-disabled">
        <h2>{t('title')}</h2>
        <p>{t('calendarDisabled')}</p>
      </div>
    );
  }

  return (
    <div className="duty-calendar-container">
      <div className="duty-calendar-header">
        <h2>{t('title')}</h2>
        <p className="duty-calendar-subtitle">{t('subtitle')}</p>
      </div>

      {/* Navigacija */}
      <div className="duty-calendar-navigation">
        <h3 className="current-month">
          {format(currentDate, 'LLLL yyyy', { locale })}
        </h3>
        <button onClick={handlePreviousMonth} className="nav-button">
          <span className="nav-text">← {t('previousMonth')}</span>
          <span className="nav-icon">←</span>
        </button>
        <button onClick={handleToday} className="nav-button-today">
          {t('today')}
        </button>
        <button onClick={handleNextMonth} className="nav-button">
          <span className="nav-text">{t('nextMonth')} →</span>
          <span className="nav-icon">→</span>
        </button>
      </div>

      {/* Filter Toggle za mobilni */}
      <button 
        className="filter-toggle-mobile"
        onClick={() => setFiltersExpanded(!filtersExpanded)}
      >
        {filtersExpanded ? '▲ ' : '▼ '} Filtri
      </button>

      {/* Filtri */}
      <div className={`duty-calendar-legend ${!filtersExpanded ? 'collapsed' : ''}`}>
        <label className="legend-item filter-checkbox">
          <input
            type="checkbox"
            checked={filters.weekend}
            onChange={() => handleFilterChange('weekend')}
          />
          <span className="legend-color weekend"></span>
          <span>{t('weekend')}</span>
        </label>
        <label className="legend-item filter-checkbox">
          <input
            type="checkbox"
            checked={filters.holiday}
            onChange={() => handleFilterChange('holiday')}
          />
          <span className="legend-color holiday"></span>
          <span>{t('holiday')}</span>
        </label>
        <label className="legend-item filter-checkbox">
          <input
            type="checkbox"
            checked={filters.allDays}
            onChange={() => handleFilterChange('allDays')}
          />
          <span className="legend-color available"></span>
          <span>{t('allDays')}</span>
        </label>
        <label className="legend-item filter-checkbox">
          <input
            type="checkbox"
            checked={filters.partial}
            onChange={() => handleFilterChange('partial')}
          />
          <span className="legend-color partial"></span>
          <span>{t('partial')}</span>
        </label>
        <label className="legend-item filter-checkbox">
          <input
            type="checkbox"
            checked={filters.full}
            onChange={() => handleFilterChange('full')}
          />
          <span className="legend-color full"></span>
          <span>{t('full')}</span>
        </label>
      </div>

      {/* Grid kalendara */}
      <div className="duty-calendar-grid">
        {/* Zaglavlje dana u tjednu */}
        {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map(day => (
          <div key={day} className="calendar-day-header">
            {t(`days.${day.toLowerCase()}`)}
          </div>
        ))}

        {/* Prazne ćelije na početku mjeseca da se prvi dan postavi na pravu poziciju */}
        {Array.from({ length: getEmptyDaysAtStart() }, (_, i) => (
          <div key={`empty-${i}`} className="calendar-day-empty" />
        ))}

        {/* Dani */}
        {daysInMonth.map(date => {
          const duty = getDutyForDate(date);
          const holiday = getHolidayForDate(date);
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          // Provjeri treba li prikazati ovaj dan prema filterima
          if (!shouldShowDay(date, duty, holiday, isWeekend)) {
            // Prikaži prazan prostor da se grid ne poremeti
            return (
              <div 
                key={date.toISOString()} 
                className="calendar-day-filtered"
                style={{ visibility: 'hidden' }}
              />
            );
          }

          return (
            <DutyCalendarDay
              key={date.toISOString()}
              date={date}
              duty={duty}
              holiday={holiday}
              isWeekend={isWeekend}
              maxParticipants={calendarData.settings.dutyMaxParticipants ?? 2}
              onJoin={(date) => void handleJoinDuty(date)}
              isSuperUser={isSuperUser}
            />
          );
        })}
      </div>

      {/* Mobile List View */}
      <div className="duty-calendar-list">
        {daysInMonth.map(date => {
          const duty = getDutyForDate(date);
          const holiday = getHolidayForDate(date);
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const maxParticipants = calendarData.settings.dutyMaxParticipants ?? 2;
          const status = getDutyStatus(duty, maxParticipants);
          const isPastDate = isBefore(startOfDay(date), startOfDay(new Date()));

          // Provjeri treba li prikazati ovaj dan prema filterima
          if (!shouldShowDay(date, duty, holiday, isWeekend)) {
            return null; // Na mobitelu potpuno sakrij
          }

          const participantCount = duty?.participants?.length ?? 0;
          const isFull = participantCount >= maxParticipants;
          
          // Radni dan - minimalistička kartica (samo datum)
          const isWorkday = !isWeekend && !holiday;

          return (
            <div 
              key={date.toISOString()} 
              className={`duty-list-card ${holiday ? 'holiday' : ''} ${isWorkday ? 'workday' : status}`}
            >
              {/* Header sa datumom i badge */}
              <div className="duty-card-header">
                <div className="duty-card-date">
                  {format(date, 'EEEE, d. MMMM', { locale })}
                </div>
                {isWeekend && (
                  <span className="duty-card-badge weekend">
                    {t('weekend')}
                  </span>
                )}
                {holiday && (
                  <span className="duty-card-badge holiday">
                    {t('holiday')}
                  </span>
                )}
              </div>

              {/* Samo za vikende i praznike prikazuj detalje */}
              {!isWorkday && (
                <>
                  {/* Info */}
                  {holiday && (
                    <div className="duty-card-info">
                      🎉 {holiday.name}
                    </div>
                  )}

                  <div className="duty-card-info">
                    👥 Prijavljeno: {participantCount} / {maxParticipants}
                  </div>

                  {/* Participants */}
                  {(duty?.participants?.length ?? 0) > 0 && (
                    <div className="duty-card-participants">
                      {duty?.participants?.map(p => (
                        <span key={p.participation_id} className="participant-chip">
                          {p.member.full_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <div className="duty-card-action">
                    {isFull ? (
                      <button className="full" disabled>
                        {t('fullLabel')}
                      </button>
                    ) : (
                      !isPastDate && (
                        <button 
                          className="join"
                          onClick={() => {
                            const confirmMsg = holiday
                              ? t('confirmJoinHoliday', { holiday: holiday.name, date: format(date, 'dd.MM.yyyy') })
                              : t('confirmJoin', { date: format(date, 'dd.MM.yyyy') });

                            if (window.confirm(confirmMsg)) {
                              void handleJoinDuty(date);
                            }
                          }}
                        >
                          ✓ {t('join')}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Schedule Info - samo za pdpromina tenant */}
      {branding?.subdomain === 'promina' && (
        <DutyScheduleInfo scheduleInfo={calendarData.scheduleInfo} />
      )}

      {/* Smart Grouping modal za odabir opcije dežurstva */}
      <Dialog open={smartDialogOpen} onOpenChange={setSmartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('smartGrouping.optionsTitle')}</DialogTitle>
            {smartDialogDate && (
              <DialogDescription>
                {format(smartDialogDate, 'dd.MM.yyyy')}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-2 mt-2">
            {smartDialogOptions.map((opt, index) => (
              <label key={index} className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="duty-option"
                  className="mt-1"
                  checked={selectedOptionIndex === index}
                  onChange={() => setSelectedOptionIndex(index)}
                />
                <span>{opt.message}</span>
              </label>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setSmartDialogOpen(false)}
            >
              {t('smartGrouping.cancel')}
            </Button>
            <Button onClick={() => { void handleConfirmSmartOption(); }}>
              {t('smartGrouping.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DutyCalendar;
