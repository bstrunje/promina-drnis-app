import prisma from '../utils/prisma.js';
import { createActivityService } from './activities.service.js';
import * as holidayService from './holiday.service.js';
import { 
  isDutyDateAllowed,
  createDutyStartTime,
  getAllScheduleInfo
} from '../config/dutySchedule.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
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
 * Creates a new duty shift or adds member to existing one
 */
export const createDutyShift = async (req: Request, memberId: number, date: Date) => {
  const organizationId = await getOrganizationId(req);
  const validation = await validateDutySlot(organizationId, date, memberId);
  
  // If duty shift already exists, add member to it
  if (validation.existingDuty) {
    await prisma.activityParticipation.create({
      data: {
        activity_id: validation.existingDuty.activity_id,
        member_id: memberId,
        // start_time and end_time are set only if actual times are already recorded
        // For PLANNED activities, leave as null
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
        activity_type: true
      }
    });
  }
  
  // Otherwise create new duty shift
  const startTime = createDutyStartTime(date);
  // const endTime = createDutyEndTime(date); // We don't need end time for PLANNED activity
  
  // Check if it's a holiday
  const holiday = await holidayService.getHolidayForDate(date);
  
  // Generate activity name
  const formattedDate = format(date, 'dd.MM.yyyy');
  const activityName = holiday 
    ? `Duty Shift - ${holiday.name} (${formattedDate})`
    : `Duty Shift ${formattedDate}`;
  
  // Create activity through existing service
  const dutyTypeId = await getDutyActivityTypeId(organizationId);
  
  // Activity is created with PLANNED status
  // start_date is set to planned duty shift start time
  // actual_start_time and actual_end_time remain null until admin completes the activity
  // Status will automatically be 'PLANNED' because actual_start_time and actual_end_time are not set
  const activity = await createActivityService(req, {
    name: activityName,
    activity_type_id: dutyTypeId,
    start_date: startTime, // Set to planned start time (e.g. 07:00)
    // actual_start_time: DON'T send - leave as null
    // actual_end_time: DON'T send - leave as null
    participant_ids: [memberId],
    recognition_percentage: 100
  }, memberId);
  
  return activity;
};

/**
 * Dohvaća sve dužurstva za određeni mjesec
 */
export const getDutiesForMonth = async (organizationId: number, year: number, month: number) => {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  
  const dutyTypeId = await getDutyActivityTypeId(organizationId);
  
  const duties = await prisma.activity.findMany({
    where: {
      organization_id: organizationId, // MULTI-TENANCY: Filter by organization
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
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  
  const holidays = await prisma.holiday.findMany({
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
