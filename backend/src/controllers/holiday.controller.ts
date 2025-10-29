import { Request, Response, NextFunction } from 'express';
import * as holidayService from '../services/holiday.service.js';
import * as nagerDateService from '../services/nagerDate.service.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';

/**
 * Dohvaća sve praznike
 */
export const getAllHolidays = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const holidays = await holidayService.getAllHolidays();
    res.status(200).json(holidays);
  } catch (error) {
    next(error);
  }
};

/**
 * Dohvaća praznike za određenu godinu
 */
export const getHolidaysForYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.params.year, 10);
    
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ 
        message: 'Invalid year. Must be between 2000 and 2100.' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const holidays = await holidayService.getHolidaysForYear(year, organizationId);
    res.status(200).json(holidays);
  } catch (error) {
    next(error);
  }
};

/**
 * Dohvaća praznik po ID-u
 */
export const getHolidayById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid holiday ID' });
    }
    
    const holiday = await holidayService.getHolidayById(id);
    
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    
    res.status(200).json(holiday);
  } catch (error) {
    next(error);
  }
};

/**
 * Kreira novi praznik (System Manager only)
 */
export const createHoliday = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, name, is_recurring } = req.body;
    
    if (!date || !name) {
      return res.status(400).json({ 
        message: 'Date and name are required' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const systemManagerId = req.user?.id; // System Manager ID from auth middleware
    
    const holiday = await holidayService.createHoliday({
      date: new Date(date),
      name,
      is_recurring: is_recurring || false,
      organization_id: organizationId,
      created_by: systemManagerId
    });
    
    res.status(201).json(holiday);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Ažurira praznik (System Manager only)
 */
export const updateHoliday = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid holiday ID' });
    }
    
    const { date, name, is_recurring } = req.body;
    
    const updateData: {
      date?: Date;
      name?: string;
      is_recurring?: boolean;
    } = {};
    if (date) updateData.date = new Date(date);
    if (name) updateData.name = name;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    
    const holiday = await holidayService.updateHoliday(id, updateData);
    
    res.status(200).json(holiday);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Briše praznik (System Manager only)
 */
export const deleteHoliday = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid holiday ID' });
    }
    
    await holidayService.deleteHoliday(id);
    
    res.status(200).json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Seeduje default hrvatske praznike za određenu godinu (System Manager only)
 */
export const seedDefaultHolidays = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.body.year, 10);
    
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ 
        message: 'Invalid year. Must be between 2000 and 2100.' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const systemManagerId = req.user?.id;
    
    const result = await holidayService.seedDefaultHolidays(year, organizationId, systemManagerId);
    
    res.status(200).json({
      message: `Seeded ${result.created} holidays, skipped ${result.skipped} (already exist)`,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Briše sve praznike za određenu godinu (System Manager only)
 */
export const deleteHolidaysForYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.params.year, 10);
    
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ 
        message: 'Invalid year. Must be between 2000 and 2100.' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const deletedCount = await holidayService.deleteHolidaysForYear(year, organizationId);
    
    res.status(200).json({ 
      message: `Deleted ${deletedCount} holidays for year ${year}`,
      count: deletedCount 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dohvaća dostupne države iz Nager.Date API-ja
 */
export const getAvailableCountries = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const countries = await nagerDateService.getAvailableCountries();
    res.status(200).json(countries);
  } catch (error) {
    next(error);
  }
};

/**
 * Sinkronizira praznike s Nager.Date API-jem za određenu državu i godinu (System Manager only)
 */
export const syncHolidaysFromNagerDate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, countryCode } = req.body;
    
    if (!year || !countryCode) {
      return res.status(400).json({ 
        message: 'Year and countryCode are required' 
      });
    }
    
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ 
        message: 'Invalid year. Must be between 2000 and 2100.' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const systemManagerId = req.user?.id;
    
    // Dohvati praznike iz Nager.Date API-ja
    const nagerHolidays = await nagerDateService.getPublicHolidays(year, countryCode);
    
    // Konvertiraj i spremi u bazu
    let created = 0;
    let skipped = 0;
    
    for (const nagerHoliday of nagerHolidays) {
      try {
        const appHoliday = nagerDateService.convertNagerHolidayToAppFormat(nagerHoliday);
        await holidayService.createHoliday({
          date: new Date(appHoliday.date),
          name: appHoliday.name,
          is_recurring: appHoliday.is_recurring,
          organization_id: organizationId,
          created_by: systemManagerId
        });
        created++;
      } catch (error) {
        // Ako praznik već postoji, preskači
        if (error instanceof Error && error.message.includes('already exists')) {
          skipped++;
        } else {
          throw error;
        }
      }
    }
    
    res.status(200).json({
      message: `Synced ${created} holidays from Nager.Date API, skipped ${skipped} (already exist)`,
      created,
      skipped,
      total: nagerHolidays.length,
      countryCode,
      year
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Nager.Date API error')) {
      return res.status(502).json({ 
        message: 'Failed to fetch holidays from Nager.Date API. Please try again later.' 
      });
    }
    next(error);
  }
};
