import { Request, Response, NextFunction } from 'express';

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Valid username is required' });
    }

    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'First and last name are required' });
    }

    next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { full_name, password } = req.body;

    if (!full_name || typeof full_name !== 'string') {
        return res.status(400).json({ message: 'Full name is required' });
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