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
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Username is required' });
    }

    if (!password || typeof password !== 'string') {
        return res.status(400).json({ message: 'Password is required' });
    }

    next();
};