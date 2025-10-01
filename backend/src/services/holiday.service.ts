import prisma from '../utils/prisma.js';
import { startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { getDefaultHolidaysForYear } from '../config/defaultHolidays.js';

export interface HolidayData {
  date: Date | string;
  name: string;
  is_recurring: boolean;
  created_by?: number;
}

/**
 * Dohvaća sve praznike
 */
export const getAllHolidays = async () => {
  return prisma.holiday.findMany({
    orderBy: { date: 'asc' }
  });
};

/**
 * Dohvaća praznike za određenu godinu
 */
export const getHolidaysForYear = async (year: number) => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));
  
  return prisma.holiday.findMany({
    where: {
      date: {
        gte: yearStart,
        lte: yearEnd
      }
    },
    orderBy: { date: 'asc' }
  });
};

/**
 * Dohvaća praznik po ID-u
 */
export const getHolidayById = async (id: number) => {
  return prisma.holiday.findUnique({
    where: { id }
  });
};

/**
 * Dohvaća praznik za određeni datum
 */
export const getHolidayForDate = async (date: Date) => {
  const dayStart = startOfDay(date);
  
  return prisma.holiday.findFirst({
    where: {
      date: {
        gte: dayStart,
        lt: endOfDay(date)
      }
    }
  });
};

/**
 * Provjerava je li datum praznik
 */
export const isHoliday = async (date: Date): Promise<boolean> => {
  const holiday = await getHolidayForDate(date);
  return holiday !== null;
};

/**
 * Kreira novi praznik
 */
export const createHoliday = async (data: HolidayData) => {
  const holidayDate = typeof data.date === 'string' 
    ? new Date(data.date) 
    : data.date;
  
  // Provjeri postoji li već praznik za taj datum
  const existing = await getHolidayForDate(holidayDate);
  if (existing) {
    throw new Error(`Holiday already exists for date ${holidayDate.toISOString().split('T')[0]}`);
  }
  
  return prisma.holiday.create({
    data: {
      date: holidayDate,
      name: data.name,
      is_recurring: data.is_recurring,
      created_by: data.created_by
    }
  });
};

/**
 * Ažurira praznik
 */
export const updateHoliday = async (id: number, data: Partial<HolidayData>) => {
  // Ako se mijenja datum, provjeri da novi datum nije zauzet
  if (data.date) {
    const newDate = typeof data.date === 'string' 
      ? new Date(data.date) 
      : data.date;
      
    const existing = await getHolidayForDate(newDate);
    if (existing && existing.id !== id) {
      throw new Error(`Holiday already exists for date ${newDate.toISOString().split('T')[0]}`);
    }
  }
  
  return prisma.holiday.update({
    where: { id },
    data: {
      ...(data.date && { date: typeof data.date === 'string' ? new Date(data.date) : data.date }),
      ...(data.name && { name: data.name }),
      ...(data.is_recurring !== undefined && { is_recurring: data.is_recurring })
    }
  });
};

/**
 * Briše praznik
 */
export const deleteHoliday = async (id: number) => {
  return prisma.holiday.delete({
    where: { id }
  });
};

/**
 * Seeduje default hrvatske praznike za određenu godinu
 * Ova funkcija omogućuje System Manageru da jednim klikom uveze sve službene praznike
 */
export const seedDefaultHolidays = async (year: number, createdBy?: number) => {
  const defaultHolidays = getDefaultHolidaysForYear(year);
  const created: Array<{ id: number; name: string }> = [];
  const skipped: string[] = [];
  
  for (const holiday of defaultHolidays) {
    try {
      const holidayDate = new Date(holiday.date);
      
      // Provjeri postoji li već
      const existing = await getHolidayForDate(holidayDate);
      if (existing) {
        skipped.push(holiday.name);
        continue;
      }
      
      // Kreiraj novi praznik
      const newHoliday = await createHoliday({
        date: holidayDate,
        name: holiday.name,
        is_recurring: holiday.is_recurring,
        created_by: createdBy
      });
      
      created.push(newHoliday);
    } catch (error) {
      console.error(`Error seeding holiday ${holiday.name}:`, error);
      skipped.push(holiday.name);
    }
  }
  
  return {
    created: created.length,
    skipped: skipped.length,
    details: {
      createdHolidays: created.map(h => h.name),
      skippedHolidays: skipped
    }
  };
};

/**
 * Briše sve praznike za određenu godinu
 * Korisno za cleanup ili reset
 */
export const deleteHolidaysForYear = async (year: number) => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));
  
  const result = await prisma.holiday.deleteMany({
    where: {
      date: {
        gte: yearStart,
        lte: yearEnd
      }
    }
  });
  
  return result.count;
};
