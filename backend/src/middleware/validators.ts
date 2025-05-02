import { Request, Response, NextFunction } from 'express';

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
        return res.status(400).json({ message: 'OIB must be exactly 11 digits' });
    }

    if (!date_of_birth) {
        return res.status(400).json({ message: 'Date of birth is required' });
    }

    if (!cell_phone) {
        return res.status(400).json({ message: 'Cell phone is required' });
    }

    if (!city || !street_address) {
        return res.status(400).json({ message: 'Address information is required' });
    }

    if (!gender || !['male', 'female'].includes(gender)) {
        return res.status(400).json({ message: 'Valid gender is required' });
    }

    if (!life_status || !['employed/unemployed', 'child/pupil/student', 'pensioner'].includes(life_status)) {
        return res.status(400).json({ message: 'Valid life status is required' });
    }

    if (!tshirt_size || !shell_jacket_size) {
        return res.status(400).json({ message: 'Size information is required' });
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
        return res.status(400).json({ message: 'Password is required' });
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
        return res.status(400).json({ message: 'Valid title is required' });
    }

    if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const startDateTime = new Date(start_date);
    const endDateTime = new Date(end_date);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return res.status(400).json({ message: 'Valid date format is required' });
    }

    if (startDateTime > endDateTime) {
        return res.status(400).json({ message: 'End date must be after start date' });
    }

    next();
};