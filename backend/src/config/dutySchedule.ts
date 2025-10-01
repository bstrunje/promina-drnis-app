// Funkcije za rad s duty calendar rasporedom

export interface DutySchedule {
  startTime: string;  // "09:00"
  endTime: string;    // "16:00" | "18:00" | "19:00"
  hours: number;      // 7 | 9 | 10
}

/**
 * Određuje raspored radnih vremena prema sezoni i datumu
 * ZIMSKO (X-III): sub/ned 09:00-16:00 (7h)
 * LJETNO (IV-VI, IX): sub/ned 09:00-18:00 (9h)
 * LJETNO PEAK (VII-VIII): nedjelja 09:00-19:00 (10h)
 */
export function getScheduleForDate(date: Date): DutySchedule {
  const month = date.getMonth() + 1; // 1-12
  const dayOfWeek = date.getDay();   // 0=ned, 6=sub
  
  // ZIMSKO (listopad-ožujak): sub/ned 09:00-16:00
  if (month >= 10 || month <= 3) {
    return { 
      startTime: "09:00", 
      endTime: "16:00", 
      hours: 7 
    };
  }
  
  // LJETNO PEAK (srpanj-kolovoz): SAMO nedjelja 09:00-19:00
  if (month === 7 || month === 8) {
    if (dayOfWeek === 0) { // nedjelja
      return { 
        startTime: "09:00", 
        endTime: "19:00", 
        hours: 10 
      };
    }
    // Subota u srpnju/kolovozu nije dopuštena
    throw new Error("Dežurstva u srpnju/kolovozu samo nedjeljom");
  }
  
  // LJETNO (travanj-lipanj, rujan): sub/ned 09:00-18:00
  return { 
    startTime: "09:00", 
    endTime: "18:00", 
    hours: 9 
  };
}

/**
 * Provjerava je li datum vikend
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // nedjelja ili subota
}

/**
 * Provjerava je li datum dopušten za dežurstvo
 * (vikend ili specifična logika po mjesecu)
 */
export function isDutyDateAllowed(date: Date): boolean {
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  
  // Srpanj/kolovoz - samo nedjelja
  if (month === 7 || month === 8) {
    return dayOfWeek === 0; // samo nedjelja
  }
  
  // Ostali mjeseci - vikend (subota ili nedjelja)
  return isWeekend(date);
}

/**
 * Kreira DateTime objekt za početak dežurstva
 */
export function createDutyStartTime(date: Date): Date {
  const schedule = getScheduleForDate(date);
  const [hours, minutes] = schedule.startTime.split(':').map(Number);
  
  const startTime = new Date(date);
  startTime.setHours(hours, minutes, 0, 0);
  
  return startTime;
}

/**
 * Kreira DateTime objekt za kraj dežurstva
 */
export function createDutyEndTime(date: Date): Date {
  const schedule = getScheduleForDate(date);
  const [hours, minutes] = schedule.endTime.split(':').map(Number);
  
  const endTime = new Date(date);
  endTime.setHours(hours, minutes, 0, 0);
  
  return endTime;
}

/**
 * Vraća info o svim sezonama za prikaz korisniku
 */
export function getAllScheduleInfo() {
  return {
    winter: {
      months: "X-III (Listopad-Ožujak)",
      days: "Subota/Nedjelja",
      hours: "09:00-16:00",
      duration: 7
    },
    summer: {
      months: "IV-VI, IX (Travanj-Lipanj, Rujan)",
      days: "Subota/Nedjelja",
      hours: "09:00-18:00",
      duration: 9
    },
    summerPeak: {
      months: "VII-VIII (Srpanj-Kolovoz)",
      days: "Samo Nedjelja",
      hours: "09:00-19:00",
      duration: 10
    }
  };
}
