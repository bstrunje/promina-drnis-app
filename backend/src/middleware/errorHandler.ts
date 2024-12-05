// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { DatabaseError } from '../utils/errors.js';

export const errorHandler = (
    err: Error | DatabaseError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error occurred:', err);

    if (err instanceof DatabaseError) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
};