import { Request, Response, NextFunction } from 'express';
import * as holidayService from '../services/holiday.service.js';

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
    
    const holidays = await holidayService.getHolidaysForYear(year);
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
    
    const systemManagerId = req.user?.id; // System Manager ID from auth middleware
    
    const holiday = await holidayService.createHoliday({
      date: new Date(date),
      name,
      is_recurring: is_recurring || false,
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
    
    const systemManagerId = req.user?.id;
    
    const result = await holidayService.seedDefaultHolidays(year, systemManagerId);
    
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
    
    const deletedCount = await holidayService.deleteHolidaysForYear(year);
    
    res.status(200).json({ 
      message: `Deleted ${deletedCount} holidays for year ${year}`,
      count: deletedCount 
    });
  } catch (error) {
    next(error);
  }
};
