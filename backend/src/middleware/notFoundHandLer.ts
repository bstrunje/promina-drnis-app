// src/middleware/notFoundHandler.ts

import { Request, Response, NextFunction } from 'express';
import { getCurrentDate } from '../utils/dateUtils.js';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: getCurrentDate().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
};

export default notFoundHandler;