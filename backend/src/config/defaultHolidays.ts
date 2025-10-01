/**
 * Default hrvatski praznici za 2025/2026
 * System Manager može ih importati klikom na "Seed Default Holidays"
 */

export interface DefaultHoliday {
  date: string;
  name: string;
  is_recurring: boolean;
}

export const DEFAULT_CROATIAN_HOLIDAYS_2025: DefaultHoliday[] = [
  { date: '2025-01-01', name: 'Nova godina', is_recurring: true },
  { date: '2025-01-06', name: 'Sveta tri kralja', is_recurring: true },
  { date: '2025-04-20', name: 'Uskrs', is_recurring: false },
  { date: '2025-04-21', name: 'Uskrsni ponedjeljak', is_recurring: false },
  { date: '2025-05-01', name: 'Praznik rada', is_recurring: true },
  { date: '2025-05-30', name: 'Dan državnosti', is_recurring: true },
  { date: '2025-06-19', name: 'Tijelovo', is_recurring: false },
  { date: '2025-06-22', name: 'Dan antifašističke borbe', is_recurring: true },
  { date: '2025-06-25', name: 'Dan državnosti', is_recurring: true },
  { date: '2025-08-05', name: 'Dan pobjede i domovinske zahvalnosti', is_recurring: true },
  { date: '2025-08-15', name: 'Velika Gospa', is_recurring: true },
  { date: '2025-11-01', name: 'Svi sveti', is_recurring: true },
  { date: '2025-11-18', name: 'Dan sjećanja na žrtve Domovinskog rata', is_recurring: true },
  { date: '2025-12-25', name: 'Božić', is_recurring: true },
  { date: '2025-12-26', name: 'Sveti Stjepan', is_recurring: true }
];

export const DEFAULT_CROATIAN_HOLIDAYS_2026: DefaultHoliday[] = [
  { date: '2026-01-01', name: 'Nova godina', is_recurring: true },
  { date: '2026-01-06', name: 'Sveta tri kralja', is_recurring: true },
  { date: '2026-04-05', name: 'Uskrs', is_recurring: false },
  { date: '2026-04-06', name: 'Uskrsni ponedjeljak', is_recurring: false },
  { date: '2026-05-01', name: 'Praznik rada', is_recurring: true },
  { date: '2026-05-30', name: 'Dan državnosti', is_recurring: true },
  { date: '2026-06-04', name: 'Tijelovo', is_recurring: false },
  { date: '2026-06-22', name: 'Dan antifašističke borbe', is_recurring: true },
  { date: '2026-06-25', name: 'Dan državnosti', is_recurring: true },
  { date: '2026-08-05', name: 'Dan pobjede i domovinske zahvalnosti', is_recurring: true },
  { date: '2026-08-15', name: 'Velika Gospa', is_recurring: true },
  { date: '2026-11-01', name: 'Svi sveti', is_recurring: true },
  { date: '2026-11-18', name: 'Dan sjećanja na žrtve Domovinskog rata', is_recurring: true },
  { date: '2026-12-25', name: 'Božić', is_recurring: true },
  { date: '2026-12-26', name: 'Sveti Stjepan', is_recurring: true }
];

/**
 * Vraća sve default praznike za određenu godinu
 */
export function getDefaultHolidaysForYear(year: number): DefaultHoliday[] {
  switch (year) {
    case 2025:
      return DEFAULT_CROATIAN_HOLIDAYS_2025;
    case 2026:
      return DEFAULT_CROATIAN_HOLIDAYS_2026;
    default:
      // Za druge godine vraćamo recurring praznike s tom godinom
      return DEFAULT_CROATIAN_HOLIDAYS_2025
        .filter(h => h.is_recurring)
        .map(h => ({
          ...h,
          date: h.date.replace('2025', year.toString())
        }));
  }
}
