import { Activity } from '@shared/activity.types';

/**
 * Provjera je li aktivnost završena
 * @param activity Aktivnost za provjeru
 * @returns true ako je aktivnost završena
 */
const isActivityCompleted = (activity: Activity): boolean => {
  return activity.status === 'COMPLETED';
};

/**
 * Centralna funkcija za izračun sati pojedinačne aktivnosti
 * 
 * Prioritetni redoslijed izračuna:
 * 1. Ručno uneseni sati sudionika (manual_hours u ActivityParticipation)
 * 2. Ručni unos sati u nazivu aktivnosti ("Ručni unos X sati")
 * 3. Stvarno vrijeme početka i završetka aktivnosti (actual_start_time i actual_end_time)
 * 
 * Svi izračuni uzimaju u obzir postotak priznavanja (recognition_override ili recognition_percentage)
 * 
 * @param activity Aktivnost za koju se računaju sati
 * @returns Račun sati po aktivnosti (formatiran ili kao broj)
 */

/**
 * Provjerava ima li aktivnost "ručni unos" u nazivu i vraća broj sati ako postoji
 * @param activity Aktivnost koju provjeravamo
 * @returns Broj sati iz naziva ili null ako ne postoji
 */
const getHoursFromActivityName = (activity: Activity): number | null => {
  if (!activity.name?.toLowerCase().includes('ručni unos')) {
    return null;
  }
  
  // Default vrijednost ako nema specifičnog broja u nazivu
  let hours = 7;
  
  // Pokušaj pronaći broj u nazivu (npr. "Ručni unos 4 sata")
  const hoursMatch = activity.name.match(/\d+/);
  if (hoursMatch) {
    hours = parseInt(hoursMatch[0], 10);
  }
  
  return hours;
};

/**
 * Izračunava sate iz stvarnog vremena početka i završetka aktivnosti
 * @param activity Aktivnost s vremenima
 * @returns Sati kao decimalni broj ili null ako nema vremena
 */
const getHoursFromActivityTimes = (activity: Activity): number | null => {
  if (!activity.actual_start_time || !activity.actual_end_time) {
    return null;
  }
  
  const startTime = new Date(activity.actual_start_time);
  const endTime = new Date(activity.actual_end_time);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  
  return durationHours > 0 ? durationHours : 0;
};

/**
 * Dohvaća maksimalne sate iz ručnih unosa sudionika
 * @param activity Aktivnost sa sudionicima
 * @returns Maksimalni broj sati ili null ako nema ručnih unosa
 */
const getHoursFromManualInputs = (activity: Activity): number | null => {
  if (!activity.participants || activity.participants.length === 0) {
    return null;
  }

  const manualHours = activity.participants
    .map(p => p.manual_hours)
    .filter((h): h is number => h !== null && h !== undefined && h > 0);

  if (manualHours.length === 0) {
    return null;
  }

  return Math.max(...manualHours);
};

/**
 * Izračunava sate za pojedinačnu aktivnost (bez množenja s brojem sudionika)
 * @param activity Aktivnost za koju se računaju sati
 * @returns Sati kao decimalni broj (npr. 2.5h = 2h 30min)
 */
export const calculateActivityHours = (activity: Activity): number => {
  // Aktivnost mora biti završena da bi se računali sati
  if (activity.status !== 'COMPLETED') {
    return 0;
  }

  // Prioritet 1: Ručni unos sati sudionika
  const hoursFromManual = getHoursFromManualInputs(activity);
  if (hoursFromManual !== null) {
    return hoursFromManual;
  }

  // Prioritet 2: Ručni unos iz naziva aktivnosti
  const hoursFromName = getHoursFromActivityName(activity);
  if (hoursFromName !== null) {
    return hoursFromName;
  }

  // Prioritet 3: Stvarno vrijeme početka i završetka
  const hoursFromTimes = getHoursFromActivityTimes(activity);
  if (hoursFromTimes !== null) {
    return hoursFromTimes;
  }

  return 0; // Vraća 0 ako se sati ne mogu izračunati
};

/**
 * Izračunava ukupne sate za aktivnost po sudioniku
 * @param activity Aktivnost
 * @param participant Sudionik aktivnosti
 * @returns Sati za ovog sudionika
 */
const calculateParticipantHours = (activity: Activity, participant: any): number => {
  // 1. Ako sudionik ima ručno unesene sate, koristi njih
  if (participant.manual_hours != null) {
    const recognition = participant.recognition_override || activity.recognition_percentage || 100;
    return participant.manual_hours * (recognition / 100);
  }
  
  // 2. Za ručni unos u nazivu aktivnosti
  const manualHours = getHoursFromActivityName(activity);
  if (manualHours !== null) {
    const recognition = participant.recognition_override || activity.recognition_percentage || 100;
    return manualHours * (recognition / 100);
  }
  
  // 3. Ako sudionik ima svoje vrijeme početka i kraja
  if (participant.start_time && participant.end_time) {
    const startTime = new Date(participant.start_time);
    const endTime = new Date(participant.end_time);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const recognition = participant.recognition_override || activity.recognition_percentage || 100;
    return durationHours * (recognition / 100);
  }
  
  // 4. Ako aktivnost ima opće vrijeme početka i kraja
  const timeHours = getHoursFromActivityTimes(activity);
  if (timeHours !== null) {
    const recognition = participant.recognition_override || activity.recognition_percentage || 100;
    return timeHours * (recognition / 100);
  }
  
  return 0;
};

/**
 * Izračunava sate za pojedinog sudionika samo na temelju zapisa o sudjelovanju (bez priznavanja).
 * Koristi se za jednostavne prikaze gdje kontekst cijele aktivnosti nije dostupan.
 * @param participation - Objekt sudjelovanja koji sadrži vremena i/ili ručne sate.
 * @returns Broj sati kao decimalni broj.
 */
export const calculateSimpleHours = (
  participation: {
    start_time?: string | null;
    end_time?: string | null;
    manual_hours?: number | null;
  }
): number => {
  if (participation.manual_hours != null && participation.manual_hours > 0) {
    return participation.manual_hours;
  }

  if (participation.start_time && participation.end_time) {
    const start = new Date(participation.start_time);
    const end = new Date(participation.end_time);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs > 0) {
      return diffMs / (1000 * 60 * 60);
    }
  }

  return 0;
};

/**
 * Izračunava ukupne sate za jednu aktivnost, uključujući sve sudionike
 * @param activity Aktivnost za koju se računaju sati
 * @returns Ukupni sati kao decimalni broj
 */
export const calculateTotalActivityHours = (activity: Activity): number => {
  // Aktivnost mora biti završena da bi se računali sati
  if (activity.status !== 'COMPLETED') {
    return 0;
  }
  
  // Ako aktivnost nema sudionike, računamo samo osnovne sate
  if (!activity.participants || activity.participants.length === 0) {
    const hours = calculateActivityHours(activity);
    console.log(`Aktivnost ${activity.name} (ID: ${activity.activity_id}) nema sudionike, sati: ${hours}`);
    return hours;
  }
  
  // Zbrajamo sate svih sudionika
  const totalHours = activity.participants.reduce((total, participant) => {
    const partHours = calculateParticipantHours(activity, participant);
    console.log(`  - Sudionik ${participant.member_id}: ${partHours}h (manual: ${participant.manual_hours}, recognition: ${participant.recognition_override || activity.recognition_percentage || 100}%)`);
    return total + partHours;
  }, 0);
  
  console.log(`Aktivnost ${activity.name} (ID: ${activity.activity_id}) ukupno sati: ${totalHours}`);
  return totalHours;
};

/**
 * Izračunava ukupne sate za listu aktivnosti, koristi se za kategorije
 * @param activities Lista aktivnosti
 * @returns Ukupni sati za sve aktivnosti
 */
export const calculateTotalHours = (activities: Activity[]): number => {
  if (!activities || activities.length === 0) {
    return 0;
  }
  
  // Zbrajamo osnovne sate aktivnosti (bez množenja s brojem sudionika)
  return activities.reduce((total, activity) => {
    return total + calculateActivityHours(activity);
  }, 0);
};

/**
 * Izračunava grand total sate za sve aktivnosti, uključujući sate svih sudionika
 * @param activities Lista aktivnosti
 * @returns Ukupni sati za sve aktivnosti i sve sudionike
 */
export const calculateGrandTotalHours = (activities: Activity[]): number => {
  if (!activities || activities.length === 0) {
    return 0;
  }
  
  console.log(`Računanje ukupnih sati za ${activities.length} aktivnosti...`);
  console.log(`Aktivnosti imaju sudionike? ${activities.map(a => a.participants?.length || 0).join(', ')}`);
  
  // Zbrajamo ukupne sate svih aktivnosti, uključujući sve sudionike
  const grandTotal = activities.reduce((total, activity) => {
    const activityTotal = calculateTotalActivityHours(activity);
    return total + activityTotal;
  }, 0);
  
  console.log(`GRAND TOTAL sati: ${grandTotal}`);
  return grandTotal;
};

/**
 * Formatira broj sati u format HH:MM
 * @param hours Broj sati kao decimalni broj (npr. 2.5 = 2h 30min)
 * @returns Formatirani string (npr. "02:30")
 */
export const formatHoursToHHMM = (hours: number): string => {
  // Zaokruživanje na najbližu minutu
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};
