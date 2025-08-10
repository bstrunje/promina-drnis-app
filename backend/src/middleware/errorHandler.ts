// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { DatabaseError } from '../utils/errors.js';
import { detectLocale, tBackend } from '../utils/i18n.js';

export const errorHandler = (
    err: Error | DatabaseError,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    // Minimalno logiranje pogreške u backendu (interno na ENG)
    console.error('Error occurred:', err);

    if (err instanceof DatabaseError) {
        return res.status(err.statusCode).json({
            error: err.name,
            code: err.name, // ne-breaking: dodan code
            message: err.message
        });
    }

    const locale = detectLocale(req.headers['accept-language']);
    res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : tBackend('errors.unexpected', locale)
    });
};