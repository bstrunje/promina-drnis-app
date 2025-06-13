import { Request, Response, NextFunction } from 'express';

/**
 * Type declarations for test-mode.middleware
 */
declare module './test-mode.middleware' {
  export function testModeMiddleware(req: Request, res: Response, next: NextFunction): void;
}
