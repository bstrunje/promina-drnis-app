import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getActivityTypes, getActivitiesByTypeId } from '../../../utils/api/apiActivities';
import type { ActivityType, Activity } from '@shared/activity.types';

export const ActivitiesStatsCard: React.FC = () => {
  const { t } = useTranslation('members');
  const { t: tActivities } = useTranslation('activities');

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [activitiesByType, setActivitiesByType] = useState<Record<number, Activity[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const types = await getActivityTypes();
        if (!isMounted) return;
        setActivityTypes(types);

        // Dohvati sve godine: poziv bez year parametra vraća sve aktivnosti s uključenim sudionicima
        const results = await Promise.all(
          types.map(async (type) => {
            const list = await getActivitiesByTypeId(String(type.type_id));
            return [type.type_id, list] as const;
          })
        );
        if (!isMounted) return;
        const map: Record<number, Activity[]> = {};
        results.forEach(([id, list]) => {
          map[id] = list ?? [];
        });
        setActivitiesByType(map);
      } catch {
        setError('load_failed');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchAll();
    return () => {
      isMounted = false;
    };
  }, []);

  // Gradiranje po godinama
  const perYearStats = useMemo(() => {
    // Skupi sve godine prisutne u podacima
    const yearsSet = new Set<number>();
    activityTypes.forEach((type) => {
      const list = activitiesByType[type.type_id] ?? [];
      list.forEach((a) => {
        const d = a.start_date ? new Date(a.start_date) : null;
        if (d && !isNaN(d.getTime())) yearsSet.add(d.getFullYear());
      });
    });

    // Ako nema podataka, prikaži tekuću godinu s nulama
    if (yearsSet.size === 0) {
      const y = new Date().getFullYear();
      return [
        { year: y, perType: activityTypes.map((type) => ({ type, activityCount: 0, participantCount: 0 })), totalActivities: 0, totalParticipants: 0 }
      ];
    }

    const minYear = Math.min(...Array.from(yearsSet));
    const maxYear = Math.max(...Array.from(yearsSet));
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);

    const statsByYear = years.map((year) => {
      const perType = activityTypes.map((type) => {
        const list = (activitiesByType[type.type_id] ?? []).filter((a) => {
          const d = a.start_date ? new Date(a.start_date) : null;
          return d && !isNaN(d.getTime()) && d.getFullYear() === year;
        });
        const activityCount = list.length;
        const distinctParticipants = new Set<number>();
        list.forEach((a) => (a.participants ?? []).forEach((p) => distinctParticipants.add(p.member_id)));
        return {
          type,
          activityCount,
          participantCount: distinctParticipants.size,
        };
      });

      const totalActivities = perType.reduce((sum, x) => sum + x.activityCount, 0);
      const totalParticipants = (() => {
        const all = new Set<number>();
        activityTypes.forEach((type) => {
          const list = (activitiesByType[type.type_id] ?? []).filter((a) => {
            const d = a.start_date ? new Date(a.start_date) : null;
            return d && !isNaN(d.getTime()) && d.getFullYear() === year;
          });
          list.forEach((a) => (a.participants ?? []).forEach((p) => all.add(p.member_id)));
        });
        return all.size;
      })();

      return { year, perType, totalActivities, totalParticipants };
    });

    return statsByYear;
  }, [activityTypes, activitiesByType]);

  // Upravljanje collapse stanjima po godini (po defaultu sve zatvoreno)
  const [openYears, setOpenYears] = useState<Set<number>>(new Set());

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  // Top-level collapse state (default collapsed)
  const [openCard, setOpenCard] = useState<boolean>(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow col-span-full">
        <button
          type="button"
          onClick={() => setOpenCard((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-block transition-transform duration-200 ${openCard ? 'rotate-90' : ''}`}
              aria-hidden
            >
              ›
            </span>
            <h3 className="text-lg font-semibold">{t('statistics.activities.title')}</h3>
          </div>
        </button>
        {openCard && (
          <>
            {loading ? (
              <div className="text-sm text-gray-500">{t('statistics.activities.loading')}</div>
            ) : error ? (
              <div className="text-sm text-red-600">{t('statistics.activities.error')}</div>
            ) : (
              <div className="space-y-6">
                {perYearStats.map(({ year, perType, totalActivities, totalParticipants }) => {
                  const isOpen = openYears.has(year);
                  return (
                    <div key={year}>
                      <button
                        type="button"
                        onClick={() => toggleYear(year)}
                        className="w-full flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                            aria-hidden
                          >
                            ›
                          </span>
                          <span className="text-base font-semibold">{year}.</span>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <span>
                            <span className="hidden sm:inline">{t('statistics.activities.totalActivities')}:</span>
                            <span className="sm:hidden">{t('statistics.activities.totalActivitiesShort')}:</span>
                            <span className="font-semibold ml-1">{totalActivities}</span>
                          </span>
                          <span>
                            <span className="hidden sm:inline">{t('statistics.activities.totalParticipants')}:</span>
                            <span className="sm:hidden">{t('statistics.activities.totalParticipantsShort')}:</span>
                            <span className="font-semibold ml-1">{totalParticipants}</span>
                          </span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="space-y-3 mt-2">
                          {perType.map(({ type, activityCount, participantCount }) => (
                            <div key={type.type_id} className="flex justify-between text-sm">
                              <div className="font-medium">
                                {tActivities(`types.${type.key}`, { defaultValue: type.custom_label ?? type.name })}
                              </div>
                              <div className="flex gap-6 text-sm">
                                <span className="text-gray-600">
                                  {t('statistics.activities.activitiesCount')}: <span className="font-semibold text-gray-900">{activityCount}</span>
                                </span>
                                <span className="text-gray-600">
                                  {t('statistics.activities.participantsCount')}: <span className="font-semibold text-gray-900">{participantCount}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="h-px bg-gray-200 my-3" />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
    </div>
  );
}
