import prisma from '../utils/prisma.js';
import { createActivityService } from './activities.service.js';
import * as holidayService from './holiday.service.js';
import { 
  isDutyDateAllowed,
  createDutyStartTime,
  getAllScheduleInfo
} from '../config/dutySchedule.js';
import { startOfDay, endOfDay, format, addDays, subDays, isSameDay } from 'date-fns';
import { Request } from 'express';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { tBackend, detectLocale, type Locale } from '../utils/i18n.js';

/**
 * Helper funkcija za dohvaćanje locale-a iz Request objekta
 */
const getLocale = (req: Request): Locale => {
  const acceptLanguage = req.get('accept-language');
  return detectLocale(acceptLanguage);
};

/**
 * Dohvaća ID tipa aktivnosti "DEŽURSTVA"
 */
const getDutyActivityTypeId = async (req: Request, organizationId: number): Promise<number> => {
  const dutyType = await prisma.activityType.findUnique({
    where: { 
      organization_id_key: {
        organization_id: organizationId,
        key: 'dezurstva'
      }
    }
  });
  
  if (!dutyType) {
    const locale = getLocale(req);
    throw new Error(tBackend('duty.errors.typeNotFound', locale));
  }
  
  return dutyType.type_id;
};

/**
 * Dohvaća System Settings za duty calendar
 */
const getDutySettings = async (organizationId: number) => {
  const settings = await prisma.systemSettings.findUnique({
    where: { organization_id: organizationId },
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
 * Smart Grouping: Pronalazi povezana dežurstva u rasponu ±2 dana
 * Traži aktivnosti istog člana ili bilo kojeg člana (za pridruživanje)
 */
const findRelatedDutyActivities = async (
  req: Request,
  organizationId: number, 
  date: Date, 
  memberId: number
): Promise<{
  memberOwnDuties: unknown[];
  availableGroupDuties: unknown[];
}> => {
  const dutyTypeId = await getDutyActivityTypeId(req, organizationId);
  
  // Definiraj raspon pretraživanja (±2 dana)
  const searchStart = startOfDay(subDays(date, 2));
  const searchEnd = endOfDay(addDays(date, 2));
  
  // Pronađi sve duty aktivnosti u rasponu
  const relatedActivities = await prisma.activity.findMany({
    where: {
      organization_id: organizationId,
      type_id: dutyTypeId,
      start_date: {
        gte: searchStart,
        lte: searchEnd
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
  
  // Filtriraj aktivnosti člana (za grupiranje vlastitih dežurstava)
  const memberOwnDuties = relatedActivities.filter(activity => 
    activity.participants.some(p => p.member_id === memberId)
  );
  
  // Filtriraj dostupne aktivnosti drugih članova (za pridruživanje)
  const settings = await getDutySettings(organizationId);
  const maxParticipants = settings.dutyMaxParticipants || 2;
  
  const availableGroupDuties = relatedActivities.filter(activity => {
    const isNotMemberOwn = !activity.participants.some(p => p.member_id === memberId);
    const hasSpace = activity.participants.length < maxParticipants;
    return isNotMemberOwn && hasSpace;
  });
  
  return {
    memberOwnDuties,
    availableGroupDuties
  };
};

/**
 * Generiraj pametni naziv aktivnosti na temelju datuma
 */
const generateSmartActivityName = async (dates: Date[], organizationId?: number): Promise<string> => {
  if (dates.length === 0) return 'Dežurstvo';
  
  // Sortiraj datume
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  
  // Provjeri ima li blagdana u rasponu
  const holidays = await Promise.all(
    sortedDates.map(date => holidayService.getHolidayForDate(date, organizationId))
  );
  const hasHoliday = holidays.some(h => h !== null);
  
  if (sortedDates.length === 1) {
    const holiday = holidays[0];
    const formattedDate = format(firstDate, 'dd.MM.yyyy');
    return holiday 
      ? `${formattedDate} - Dežurstvo - ${holiday.name}`
      : `${formattedDate} - Dežurstvo`;
  }
  
  // Više datuma - generiraj raspon
  const startFormatted = format(firstDate, 'dd.MM');
  const endFormatted = format(lastDate, 'dd.MM.yyyy');
  
  if (hasHoliday) {
    const holidayNames = holidays.filter(h => h).map(h => h!.name).join(', ');
    return `${startFormatted}-${endFormatted} - Dežurstvo (${holidayNames})`;
  }
  
  return `${startFormatted}-${endFormatted} - Dežurstvo`;
};

/**
 * Izvuci datume iz aktivnosti (iz start_date i naziva)
 */
const extractDatesFromActivity = (activity: unknown): Date[] => {
  const activityData = activity as { start_date: string; name: string };
  const dates = [new Date(activityData.start_date)];
  
  // Pokušaj parsirati dodatne datume iz naziva aktivnosti
  // Format: "Dežurstvo 26.10-27.10.2024" ili "Dežurstvo 26.10.2024"
  const nameMatch = activityData.name.match(/(\d{1,2}\.\d{1,2})(?:-(\d{1,2}\.\d{1,2}))?\.(\d{4})/);
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
  
  return dates.sort((a, b) => a.getTime() - b.getTime());
};

/**
 * Provjerava validnost dežurstva prije kreiranja
 */
const validateDutySlot = async (req: Request, organizationId: number, date: Date, memberId: number) => {
  const locale = getLocale(req);
  // 1. Provjeri System Settings - je li kalendar omogućen
  const settings = await getDutySettings(organizationId);
  if (!settings.dutyCalendarEnabled) {
    throw new Error(tBackend('duty.errors.calendarDisabled', locale));
  }
  
  // 2. Provjeri je li datum dopušten (vikend, praznik ili specifična logika po mjesecu)
  const isDateAllowed = await isDutyDateAllowed(date, organizationId);
  if (!isDateAllowed) {
    throw new Error(tBackend('duty.errors.dateNotAllowed', locale));
  }
  
  // 3. Dohvati postojeće dežurstvo za taj datum
  const dutyTypeId = await getDutyActivityTypeId(req, organizationId);
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
  
  // 5. Provjeri broj sudionika (iz postavki)
  const maxParticipants = settings.dutyMaxParticipants || 2;
  if (existingDuty.participants.length >= maxParticipants) {
    throw new Error(tBackend('duty.errors.shiftFull', locale, { maxParticipants: String(maxParticipants) }));
  }
  
  // 6. Provjeri je li član već prijavljen
  const alreadyJoined = existingDuty.participants.some(p => p.member_id === memberId);
  if (alreadyJoined) {
    throw new Error(tBackend('duty.errors.alreadyRegistered', locale));
  }
  
  return { canCreate: false, existingDuty };
};

/**
 * Kreira novo dežurstvo ili dodaje člana postojećem s Smart Grouping logikom
 */
export const createDutyShift = async (req: Request, memberId: number, date: Date) => {
  const organizationId = await getOrganizationId(req);
  const validation = await validateDutySlot(req, organizationId, date, memberId);
  
  // Ako dežurstvo već postoji za ovaj točan datum, dodaj člana u njega
  if (validation.existingDuty) {
    await prisma.activityParticipation.create({
      data: {
        organization_id: organizationId,
        activity_id: validation.existingDuty.activity_id,
        member_id: memberId,
        start_time: validation.existingDuty.actual_start_time || null,
        end_time: validation.existingDuty.actual_end_time || null
      }
    });
    
    // Vrati ažurirano dežurstvo
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
        activity_type: true,
        organizer: {
          select: {
            member_id: true,
            full_name: true
          }
        }
      }
    });
  }
  
  // Smart Grouping: Provjeri ima li povezanih dežurstava
  const relatedDuties = await findRelatedDutyActivities(req, organizationId, date, memberId);
  
  // Prioritet 1: Dodaj u vlastito postojeće dežurstvo (grupiranje)
  if (relatedDuties.memberOwnDuties.length > 0) {
    const targetDuty = relatedDuties.memberOwnDuties[0] as { activity_id: number; actual_start_time?: Date; actual_end_time?: Date; participants: { member_id: number }[] }; // Uzmi prvo pronađeno
    
    // Provjeri je li član već u aktivnosti
    const alreadyParticipating = targetDuty.participants?.some(p => p.member_id === memberId);
    
    if (!alreadyParticipating) {
      // Dodaj člana u postojeću aktivnost
      await prisma.activityParticipation.create({
        data: {
          organization_id: organizationId,
          activity_id: targetDuty.activity_id,
          member_id: memberId,
          start_time: targetDuty.actual_start_time || null,
          end_time: targetDuty.actual_end_time || null
        }
      });
    }
    
    // Ažuriraj naziv aktivnosti da uključuje novi datum
    const existingDates = extractDatesFromActivity(targetDuty);
    const allDates = [...existingDates, date];
    const newName = await generateSmartActivityName(allDates, organizationId);
    
    await prisma.activity.update({
      where: { activity_id: targetDuty.activity_id },
      data: { name: newName }
    });
    
    // Vrati ažuriranu aktivnost
    return prisma.activity.findUnique({
      where: { activity_id: targetDuty.activity_id },
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
      }
    });
  }
  
  // Prioritet 2: Pridruži se tuđem dežurstvu (ako ima mjesta)
  if (relatedDuties.availableGroupDuties.length > 0) {
    const targetDuty = relatedDuties.availableGroupDuties[0] as { activity_id: number; actual_start_time?: Date; actual_end_time?: Date; participants: { member_id: number }[] }; // Uzmi prvo dostupno
    
    // Provjeri je li član već u aktivnosti
    const alreadyParticipating = targetDuty.participants?.some(p => p.member_id === memberId);
    
    if (!alreadyParticipating) {
      await prisma.activityParticipation.create({
        data: {
          organization_id: organizationId,
          activity_id: targetDuty.activity_id,
          member_id: memberId,
          start_time: targetDuty.actual_start_time || null,
          end_time: targetDuty.actual_end_time || null
        }
      });
    }
    
    // Vrati ažuriranu aktivnost
    return prisma.activity.findUnique({
      where: { activity_id: targetDuty.activity_id },
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
      }
    });
  }
  
  // Prioritet 3: Kreiraj novo dežurstvo
  const startTime = createDutyStartTime(date);
  const activityName = await generateSmartActivityName([date], organizationId);
  const dutyTypeId = await getDutyActivityTypeId(req, organizationId);
  
  const activity = await createActivityService(req, {
    name: activityName,
    activity_type_id: dutyTypeId,
    start_date: startTime,
    participant_ids: [memberId],
    recognition_percentage: 100
  }, memberId);
  
  return activity;
};

/**
 * Dohvaća sve dežurstva za određeni mjesec
 * Uključuje i ručno kreirane duty aktivnosti kroz Activities stranicu
 */
export const getDutiesForMonth = async (req: Request, organizationId: number, year: number, month: number) => {
  // Pravilno filtriranje po godini i mjesecu
  const monthStart = new Date(year, month - 1, 1); // Prvi dan mjeseca
  const monthEnd = new Date(year, month, 1); // Prvi dan sljedećeg mjeseca
  
  const dutyTypeId = await getDutyActivityTypeId(req, organizationId);
  
  const duties = await prisma.activity.findMany({
    where: {
      organization_id: organizationId, // MULTI-TENANCY: Filter by organization
      type_id: dutyTypeId, // Filter samo duty aktivnosti
      start_date: {
        gte: monthStart,
        lt: monthEnd // Koristimo lt umjesto lte za točno filtriranje
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
  
  // Transform dates to ISO strings for proper JSON serialization
  return duties.map(duty => ({
    ...duty,
    start_date: duty.start_date.toISOString(),
    actual_start_time: duty.actual_start_time?.toISOString() || null,
    actual_end_time: duty.actual_end_time?.toISOString() || null,
    created_at: duty.created_at.toISOString(),
    updated_at: duty.updated_at.toISOString(),
    activity_type: {
      ...duty.activity_type,
      created_at: duty.activity_type.created_at?.toISOString() || null
    },
    participants: duty.participants.map(p => ({
      ...p,
      created_at: p.created_at.toISOString(),
      start_time: p.start_time?.toISOString() || null,
      end_time: p.end_time?.toISOString() || null
    }))
  }));
};

/**
 * Dohvaća praznike za mjesec (za prikaz u kalendaru)
 */
export const getHolidaysForMonth = async (year: number, month: number) => {
  // Pravilno filtriranje po godini i mjesecu
  const monthStart = new Date(year, month - 1, 1); // Prvi dan mjeseca
  const monthEnd = new Date(year, month, 1); // Prvi dan sljedećeg mjeseca
  
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: monthStart,
        lt: monthEnd // Koristimo lt umjesto lte za točno filtriranje
      }
    },
    orderBy: {
      date: 'asc'
    }
  });
  
  // Transform dates to ISO strings for proper JSON serialization
  return holidays.map(holiday => ({
    ...holiday,
    date: holiday.date.toISOString(),
    created_at: holiday.created_at.toISOString()
  }));
};

/**
 * Dohvaća kalendar za mjesec (duties + holidays + settings)
 */
export const getCalendarForMonth = async (req: Request, organizationId: number, year: number, month: number) => {
  const [duties, holidays, settings] = await Promise.all([
    getDutiesForMonth(req, organizationId, year, month),
    getHolidaysForMonth(year, month),
    getDutySettings(organizationId)
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
export const updateDutySettings = async (organizationId: number, data: {
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
    where: { organization_id: organizationId },
    data: updateData
  });
};

/**
 * Dohvaća duty settings (za prikaz korisniku)
 */
export const getDutySettingsPublic = async (organizationId: number) => {
  const settings = await getDutySettings(organizationId);
  const scheduleInfo = getAllScheduleInfo();
  
  return {
    ...settings,
    scheduleInfo
  };
};

/**
 * Dohvaća opcije za kreiranje dežurstva (za Smart Grouping preview)
 */
export const getDutyCreationOptions = async (req: Request, memberId: number, date: Date) => {
  const organizationId = await getOrganizationId(req);
  const locale = getLocale(req);
  
  try {
    // Provjeri osnovne uvjete
    const validation = await validateDutySlot(req, organizationId, date, memberId);
    
    // Ako već postoji dežurstvo za taj datum
    if (validation.existingDuty) {
      return {
        canCreate: true,
        options: [{
          type: 'join_existing',
          activity: validation.existingDuty,
          message: tBackend('duty.messages.joinExisting', locale)
        }]
      };
    }
    
    // Smart Grouping opcije
    const relatedDuties = await findRelatedDutyActivities(req, organizationId, date, memberId);
    const options: unknown[] = [];
    
    // Opcija 1: Dodaj u vlastito dežurstvo
    if (relatedDuties.memberOwnDuties.length > 0) {
      const targetDuty = relatedDuties.memberOwnDuties[0] as { activity_id: number; name: string };
      const existingDates = extractDatesFromActivity(targetDuty);
      const allDates = [...existingDates, date];
      const newName = await generateSmartActivityName(allDates, organizationId);
      
      options.push({
        type: 'extend_own',
        activity: targetDuty,
        newName,
        message: tBackend('duty.messages.extendOwn', locale, { date: format(date, 'dd.MM.yyyy') })
      });
    }
    
    // Opcija 2: Pridruži se tuđem dežurstvu
    if (relatedDuties.availableGroupDuties.length > 0) {
      const targetDuty = relatedDuties.availableGroupDuties[0] as { activity_id: number; name: string };
      options.push({
        type: 'join_group',
        activity: targetDuty,
        message: tBackend('duty.messages.joinGroup', locale, { name: targetDuty.name })
      });
    }
    
    // Opcija 3: Kreiraj novo
    const newActivityName = await generateSmartActivityName([date], organizationId);
    options.push({
      type: 'create_new',
      newName: newActivityName,
      message: tBackend('duty.messages.createNew', locale, { name: newActivityName })
    });
    
    return {
      canCreate: true,
      options
    };
    
  } catch (error) {
    return {
      canCreate: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      options: []
    };
  }
};
