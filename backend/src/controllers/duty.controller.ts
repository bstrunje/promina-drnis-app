import { Request, Response, NextFunction } from 'express';
import * as dutyService from '../services/duty.service.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';

/**
 * Kreira novo dežurstvo ili pridružuje člana postojećem
 * POST /api/duty/create
 */
export const createDutyShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.body;
    const memberId = req.user?.id;
    
    if (!memberId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    const dutyDate = new Date(date);
    
    if (isNaN(dutyDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    const duty = await dutyService.createDutyShift(req, memberId, dutyDate);
    
    res.status(201).json(duty);
  } catch (error) {
    if (error instanceof Error) {
      // Validation errors
      if (error.message.includes('disabled') || 
          error.message.includes('popunjeno') ||
          error.message.includes('već ste prijavljeni') ||
          error.message.includes('samo vikendom') ||
          error.message.includes('samo nedjeljom')) {
        return res.status(400).json({ message: error.message });
      }
    }
    next(error);
  }
};

/**
 * Dohvaća kalendar dežurstava za mjesec
 * GET /api/duty/calendar/:year/:month
 */
export const getCalendarForMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ 
        message: 'Invalid year or month. Month must be between 1 and 12.' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const calendar = await dutyService.getCalendarForMonth(organizationId, year, month);
    
    res.status(200).json(calendar);
  } catch (error) {
    next(error);
  }
};

/**
 * Dohvaća samo dežurstva za mjesec (bez holidays i settings)
 * GET /api/duty/duties/:year/:month
 */
export const getDutiesForMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ 
        message: 'Invalid year or month. Month must be between 1 and 12.' 
      });
    }
    
    const organizationId = getOrganizationId(req);
    const duties = await dutyService.getDutiesForMonth(organizationId, year, month);
    
    res.status(200).json(duties);
  } catch (error) {
    next(error);
  }
};

/**
 * Dohvaća duty settings i schedule info
 * GET /api/duty/settings
 */
export const getDutySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = getOrganizationId(req);
    const settings = await dutyService.getDutySettingsPublic(organizationId);
    
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Ažurira duty settings (System Manager only)
 * PUT /api/duty/settings
 */
export const updateDutySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dutyCalendarEnabled, dutyMaxParticipants, dutyAutoCreateEnabled } = req.body;
    
    const updateData: {
      dutyCalendarEnabled?: boolean;
      dutyMaxParticipants?: number;
      dutyAutoCreateEnabled?: boolean;
    } = {};
    
    if (dutyCalendarEnabled !== undefined) {
      updateData.dutyCalendarEnabled = Boolean(dutyCalendarEnabled);
    }
    
    if (dutyMaxParticipants !== undefined) {
      const max = parseInt(dutyMaxParticipants, 10);
      if (isNaN(max) || max < 1 || max > 10) {
        return res.status(400).json({ 
          message: 'dutyMaxParticipants must be between 1 and 10' 
        });
      }
      updateData.dutyMaxParticipants = max;
    }
    
    if (dutyAutoCreateEnabled !== undefined) {
      updateData.dutyAutoCreateEnabled = Boolean(dutyAutoCreateEnabled);
    }
    
    const organizationId = getOrganizationId(req);
    const settings = await dutyService.updateDutySettings(organizationId, updateData);
    
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};
