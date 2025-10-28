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

/**
 * Dohvaća ID tipa aktivnosti "DEŽURSTVA"
 */
const getDutyActivityTypeId = async (organizationId: number): Promise<number> => {
  const dutyType = await prisma.activityType.findUnique({
    where: { 
      organization_id_key: {
        organization_id: organizationId,
        key: 'dezurstva'
      }
    }
  });
  
  if (!dutyType) {
    throw new Error('Duty activity type (dezurstva) not found in database. Please run seed.');
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
  organizationId: number, 
  date: Date, 
  memberId: number
): Promise<{
  memberOwnDuties: unknown[];
  availableGroupDuties: unknown[];
}> => {
  const dutyTypeId = await getDutyActivityTypeId(organizationId);
  
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
const generateSmartActivityName = async (dates: Date[]): Promise<string> => {
  if (dates.length === 0) return 'Dežurstvo';
  
  // Sortiraj datume
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  
  // Provjeri ima li blagdana u rasponu
  const holidays = await Promise.all(
    sortedDates.map(date => holidayService.getHolidayForDate(date))
  );
  const hasHoliday = holidays.some(h => h !== null);
  
  if (sortedDates.length === 1) {
    const holiday = holidays[0];
    const formattedDate = format(firstDate, 'dd.MM.yyyy');
    return holiday 
      ? `Dežurstvo - ${holiday.name} (${formattedDate})`
      : `Dežurstvo ${formattedDate}`;
  }
  
  // Više datuma - generiraj raspon
  const startFormatted = format(firstDate, 'dd.MM');
  const endFormatted = format(lastDate, 'dd.MM.yyyy');
  
  if (hasHoliday) {
    const holidayNames = holidays.filter(h => h).map(h => h!.name).join(', ');
    return `Dežurstvo - ${holidayNames} (${startFormatted}-${endFormatted})`;
  }
  
  return `Dežurstvo ${startFormatted}-${endFormatted}`;
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
const validateDutySlot = async (organizationId: number, date: Date, memberId: number) => {
  // 1. Provjeri System Settings - je li kalendar omogućen
  const settings = await getDutySettings(organizationId);
  if (!settings.dutyCalendarEnabled) {
    throw new Error('Duty calendar is currently disabled by System Manager');
  }
  
  // 2. Check if date is allowed (weekend or specific logic per month)
  if (!isDutyDateAllowed(date)) {
    throw new Error('Duty shifts are not available on this date');
  }
  
  // 3. Dohvati postojeće dežurstvo za taj datum
  const dutyTypeId = await getDutyActivityTypeId(organizationId);
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
  
  // 5. Check participant count (from settings)
  const maxParticipants = settings.dutyMaxParticipants || 2;
  if (existingDuty.participants.length >= maxParticipants) {
    throw new Error(`Duty shift is full (maximum ${maxParticipants} members)`);
  }
  
  // 6. Check if member is already registered
  const alreadyJoined = existingDuty.participants.some(p => p.member_id === memberId);
  if (alreadyJoined) {
    throw new Error('You are already registered for this duty shift');
  }
  
  return { canCreate: false, existingDuty };
};

/**
 * Creates a new duty shift or adds member to existing one with Smart Grouping
 */
export const createDutyShift = async (req: Request, memberId: number, date: Date) => {
  const organizationId = await getOrganizationId(req);
  const validation = await validateDutySlot(organizationId, date, memberId);
  
  // If duty shift already exists for this exact date, add member to it
  if (validation.existingDuty) {
    await prisma.activityParticipation.create({
      data: {
        activity_id: validation.existingDuty.activity_id,
        member_id: memberId,
        start_time: validation.existingDuty.actual_start_time || null,
        end_time: validation.existingDuty.actual_end_time || null
      }
    });
    
    // Return updated duty
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
  const relatedDuties = await findRelatedDutyActivities(organizationId, date, memberId);
  
  // Prioritet 1: Dodaj u vlastito postojeće dežurstvo (grupiranje)
  if (relatedDuties.memberOwnDuties.length > 0) {
    const targetDuty = relatedDuties.memberOwnDuties[0] as { activity_id: number; actual_start_time?: Date; actual_end_time?: Date; participants: { member_id: number }[] }; // Uzmi prvo pronađeno
    
    // Provjeri je li član već u aktivnosti
    const alreadyParticipating = targetDuty.participants?.some(p => p.member_id === memberId);
    
    if (!alreadyParticipating) {
      // Dodaj člana u postojeću aktivnost
      await prisma.activityParticipation.create({
        data: {
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
    const newName = await generateSmartActivityName(allDates);
    
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
  const activityName = await generateSmartActivityName([date]);
  const dutyTypeId = await getDutyActivityTypeId(organizationId);
  
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
 * Dohvaća sve dužurstva za određeni mjesec
 */
export const getDutiesForMonth = async (organizationId: number, year: number, month: number) => {
  // Pravilno filtriranje po godini i mjesecu
  const monthStart = new Date(year, month - 1, 1); // Prvi dan mjeseca
  const monthEnd = new Date(year, month, 1); // Prvi dan sljedećeg mjeseca
  
  const dutyTypeId = await getDutyActivityTypeId(organizationId);
  
  const duties = await prisma.activity.findMany({
    where: {
      organization_id: organizationId, // MULTI-TENANCY: Filter by organization
      type_id: dutyTypeId,
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
export const getCalendarForMonth = async (organizationId: number, year: number, month: number) => {
  const [duties, holidays, settings] = await Promise.all([
    getDutiesForMonth(organizationId, year, month),
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
  
  try {
    // Provjeri osnovne uvjete
    const validation = await validateDutySlot(organizationId, date, memberId);
    
    // Ako već postoji dežurstvo za taj datum
    if (validation.existingDuty) {
      return {
        canCreate: true,
        options: [{
          type: 'join_existing',
          activity: validation.existingDuty,
          message: 'Join existing duty shift for this date'
        }]
      };
    }
    
    // Smart Grouping opcije
    const relatedDuties = await findRelatedDutyActivities(organizationId, date, memberId);
    const options: unknown[] = [];
    
    // Opcija 1: Dodaj u vlastito dežurstvo
    if (relatedDuties.memberOwnDuties.length > 0) {
      const targetDuty = relatedDuties.memberOwnDuties[0] as { activity_id: number; name: string };
      const existingDates = extractDatesFromActivity(targetDuty);
      const allDates = [...existingDates, date];
      const newName = await generateSmartActivityName(allDates);
      
      options.push({
        type: 'extend_own',
        activity: targetDuty,
        newName,
        message: `Extend your existing duty shift to include ${format(date, 'dd.MM.yyyy')}`
      });
    }
    
    // Opcija 2: Pridruži se tuđem dežurstvu
    if (relatedDuties.availableGroupDuties.length > 0) {
      const targetDuty = relatedDuties.availableGroupDuties[0] as { activity_id: number; name: string };
      options.push({
        type: 'join_group',
        activity: targetDuty,
        message: `Join existing duty shift: ${targetDuty.name}`
      });
    }
    
    // Opcija 3: Kreiraj novo
    const newActivityName = await generateSmartActivityName([date]);
    options.push({
      type: 'create_new',
      newName: newActivityName,
      message: `Create new duty shift: ${newActivityName}`
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
