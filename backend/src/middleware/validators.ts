import { Request, Response, NextFunction } from 'express';
import { parseDate } from '../utils/dateUtils.js';
import { tBackend } from '../utils/i18n.js';

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
    const { 
        first_name, 
        last_name, 
        email, 
        oib, 
        date_of_birth,
        cell_phone,
        city,
        street_address,
        gender,
        life_status,
        tshirt_size,
        shell_jacket_size
    } = req.body;

    if (!first_name || !last_name) {
        return res.status(400).json({ message: 'First and last name are required' });
    }

    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!oib || !/^\d{11}$/.test(oib)) {
        return res.status(400).json({ 
          code: 'INVALID_OIB',
          message: tBackend('validations.invalid_oib', req.locale)
        });
    }

    if (!date_of_birth) {
        return res.status(400).json({ 
          code: 'MISSING_DOB',
          message: tBackend('validations.missing_dob', req.locale)
        });
    }

    if (!cell_phone) {
        return res.status(400).json({ 
          code: 'MISSING_PHONE',
          message: tBackend('validations.missing_phone', req.locale)
        });
    }

    if (!city || !street_address) {
        return res.status(400).json({ 
          code: 'MISSING_ADDRESS',
          message: tBackend('validations.missing_address', req.locale)
        });
    }

    if (!gender || !['male', 'female'].includes(gender)) {
        return res.status(400).json({ 
          code: 'INVALID_GENDER',
          message: tBackend('validations.invalid_gender', req.locale)
        });
    }

    if (!life_status || !['employed/unemployed', 'child/pupil/student', 'pensioner'].includes(life_status)) {
        return res.status(400).json({ 
          code: 'INVALID_LIFE_STATUS',
          message: tBackend('validations.invalid_life_status', req.locale)
        });
    }

    if (!tshirt_size || !shell_jacket_size) {
        return res.status(400).json({ 
          code: 'MISSING_SIZES',
          message: tBackend('validations.missing_sizes', req.locale)
        });
    }

    next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    // Promijenjeno: očekuje se email umjesto full_name
    const { email, password } = req.body;

    // Promijenjeno: validacija za email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!password || typeof password !== 'string') {
        return res.status(400).json({ 
          code: 'MISSING_PASSWORD',
          message: tBackend('validations.missing_password', req.locale)
        });
    }

    next();
};

export const validateMemberCreate = (req: Request, res: Response, next: NextFunction) => {
    const { first_name, last_name, email, oib } = req.body;

    if (!first_name || !last_name) {
        return res.status(400).json({ message: 'First and last name are required' });
    }

    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!oib || !/^\d{11}$/.test(oib)) {
        return res.status(400).json({ message: 'Valid OIB (11 digits) is required' });
    }

    next();
};

export const validateActivityCreate = (req: Request, res: Response, next: NextFunction) => {
    const { title, start_date, end_date } = req.body;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ 
          code: 'INVALID_TITLE',
          message: tBackend('validations.invalid_title', req.locale)
        });
    }

    if (!start_date || !end_date) {
        return res.status(400).json({ 
          code: 'MISSING_DATES',
          message: tBackend('validations.missing_dates', req.locale)
        });
    }

    const startDateTime = parseDate(start_date);
    const endDateTime = parseDate(end_date);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return res.status(400).json({ 
          code: 'INVALID_DATE_FORMAT',
          message: tBackend('validations.invalid_date_format', req.locale)
        });
    }

    if (startDateTime > endDateTime) {
        return res.status(400).json({ 
          code: 'INVALID_DATE_RANGE',
          message: tBackend('validations.invalid_date_range', req.locale)
        });
    }

    next();
};