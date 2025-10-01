import prisma from '../utils/prisma.js';
import { createActivityService } from './activities.service.js';
import * as holidayService from './holiday.service.js';
import { 
  isDutyDateAllowed,
  createDutyStartTime,
  getAllScheduleInfo
} from '../config/dutySchedule.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Dohvaća ID tipa aktivnosti "DEŽURSTVA"
 */
const getDutyActivityTypeId = async (): Promise<number> => {
  const dutyType = await prisma.activityType.findUnique({
    where: { key: 'dezurstva' }
  });
  
  if (!dutyType) {
    throw new Error('Duty activity type (dezurstva) not found in database. Please run seed.');
  }
  
  return dutyType.type_id;
};

/**
 * Dohvaća System Settings za duty calendar
 */
const getDutySettings = async () => {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'default' },
    select: {
      dutyCalendarEnabled: true,
      dutyMaxParticipants: true,
      dutyAutoCreateEnabled: true
    }
  });
  
  return settings || {
    dutyCalendarEnabled: false,
    dutyMaxParticipants: 2,
    dutyAutoCreateEnabled: true
  };
};

/**
 * Provjerava validnost dežurstva prije kreiranja
 */
const validateDutySlot = async (date: Date, memberId: number) => {
  // 1. Provjeri System Settings - je li kalendar omogućen
  const settings = await getDutySettings();
  if (!settings.dutyCalendarEnabled) {
    throw new Error('Duty calendar is currently disabled by System Manager');
  }
  
  // 2. Provjeri je li datum dopušten (vikend ili specifična logika)
  if (!isDutyDateAllowed(date)) {
    const month = date.getMonth() + 1;
    if (month === 7 || month === 8) {
      throw new Error('Dežurstva u srpnju/kolovozu samo nedjeljom');
    }
    throw new Error('Dežurstva su moguća samo vikendom');
  }
  
  // 3. Dohvati postojeće dežurstvo za taj datum
  const dutyTypeId = await getDutyActivityTypeId();
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  const existingDuty = await prisma.activity.findFirst({
    where: {
      type_id: dutyTypeId,
      start_date: {
        gte: dayStart,
        lt: dayEnd
      }
    },
    include: {
      participants: true
    }
  });
  
  // 4. Ako ne postoji, sve OK
  if (!existingDuty) {
    return { canCreate: true, existingDuty: null };
  }
  
  // 5. Provjeri broj sudionika (iz settings)
  const maxParticipants = settings.dutyMaxParticipants || 2;
  if (existingDuty.participants.length >= maxParticipants) {
    throw new Error(`Dežurstvo je popunjeno (maksimalno ${maxParticipants} člana)`);
  }
  
  // 6. Provjeri da član nije već prijavljen
  const alreadyJoined = existingDuty.participants.some(p => p.member_id === memberId);
  if (alreadyJoined) {
    throw new Error('Već ste prijavljeni na ovo dežurstvo');
  }
  
  return { canCreate: false, existingDuty };
};

/**
 * Kreira novo dežurstvo ili dodaje člana na postojeće
 */
export const createDutyShift = async (memberId: number, date: Date) => {
  const validation = await validateDutySlot(date, memberId);
  
  // Ako već postoji dežurstvo, pridruži člana
  if (validation.existingDuty) {
    await prisma.activityParticipation.create({
      data: {
        activity_id: validation.existingDuty.activity_id,
        member_id: memberId,
        // start_time i end_time se postavljaju samo ako su actual vremena već upisana
        // Za PLANNED aktivnosti ostavlja se null
        start_time: validation.existingDuty.actual_start_time || null,
        end_time: validation.existingDuty.actual_end_time || null
      }
    });
    
    // Vrati ažurirani duty
    return prisma.activity.findUnique({
      where: { activity_id: validation.existingDuty.activity_id },
      include: {
        participants: {
          include: {
            member: {
              select: {
                member_id: true,
                full_name: true
              }
            }
          }
        },
        activity_type: true
      }
    });
  }
  
  // Inače kreiraj novo dežurstvo
  const startTime = createDutyStartTime(date);
  // const endTime = createDutyEndTime(date); // Ne trebamo end time za PLANNED aktivnost
  
  // Provjeri je li praznik
  const holiday = await holidayService.getHolidayForDate(date);
  
  // Generiraj naziv aktivnosti
  const formattedDate = format(date, 'dd.MM.yyyy');
  const activityName = holiday 
    ? `Dežurstvo - ${holiday.name} (${formattedDate})`
    : `Dežurstvo ${formattedDate}`;
  
  // Kreiraj aktivnost kroz postojeći service
  const dutyTypeId = await getDutyActivityTypeId();
  
  // Aktivnost se kreira sa statusom PLANNED
  // start_date je postavljeno na planirano vrijeme početka dežurstva
  // actual_start_time i actual_end_time ostaju null dok admin ne završi aktivnost
  // Status će automatski biti 'PLANNED' jer actual_start_time i actual_end_time nisu postavljeni
  const activity = await createActivityService({
    name: activityName,
    activity_type_id: dutyTypeId,
    start_date: startTime, // Postavljamo na planirano vrijeme početka (npr. 07:00)
    // actual_start_time: NE šaljemo - ostavlja se null
    // actual_end_time: NE šaljemo - ostavlja se null
    participant_ids: [memberId],
    recognition_percentage: 100
  }, memberId);
  
  return activity;
};

/**
 * Dohvaća sve dužurstva za određeni mjesec
 */
export const getDutiesForMonth = async (year: number, month: number) => {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  
  const dutyTypeId = await getDutyActivityTypeId();
  
  const duties = await prisma.activity.findMany({
    where: {
      type_id: dutyTypeId,
      start_date: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    include: {
      participants: {
        include: {
          member: {
            select: {
              member_id: true,
              full_name: true
            }
          }
        }
      },
      activity_type: true,
      organizer: {
        select: {
          member_id: true,
          full_name: true
        }
      }
    },
    orderBy: {
      start_date: 'asc'
    }
  });
  
  return duties;
};

/**
 * Dohvaća praznike za mjesec (za prikaz u kalendaru)
 */
export const getHolidaysForMonth = async (year: number, month: number) => {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  
  return prisma.holiday.findMany({
    where: {
      date: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    orderBy: {
      date: 'asc'
    }
  });
};

/**
 * Dohvaća kalendar za mjesec (duties + holidays + settings)
 */
export const getCalendarForMonth = async (year: number, month: number) => {
  const [duties, holidays, settings] = await Promise.all([
    getDutiesForMonth(year, month),
    getHolidaysForMonth(year, month),
    getDutySettings()
  ]);
  
  return {
    duties,
    holidays,
    settings,
    scheduleInfo: getAllScheduleInfo()
  };
};

/**
 * Ažurira duty calendar settings (System Manager only)
 */
export const updateDutySettings = async (data: {
  dutyCalendarEnabled?: boolean;
  dutyMaxParticipants?: number;
  dutyAutoCreateEnabled?: boolean;
}) => {
  const updateData: {
    dutyCalendarEnabled?: boolean;
    dutyMaxParticipants?: number;
    dutyAutoCreateEnabled?: boolean;
  } = {};
  
  if (data.dutyCalendarEnabled !== undefined) {
    updateData.dutyCalendarEnabled = data.dutyCalendarEnabled;
  }
  if (data.dutyMaxParticipants !== undefined) {
    updateData.dutyMaxParticipants = data.dutyMaxParticipants;
  }
  if (data.dutyAutoCreateEnabled !== undefined) {
    updateData.dutyAutoCreateEnabled = data.dutyAutoCreateEnabled;
  }
  
  return prisma.systemSettings.update({
    where: { id: 'default' },
    data: updateData
  });
};

/**
 * Dohvaća duty settings (za prikaz korisniku)
 */
export const getDutySettingsPublic = async () => {
  const settings = await getDutySettings();
  const scheduleInfo = getAllScheduleInfo();
  
  return {
    ...settings,
    scheduleInfo
  };
};
