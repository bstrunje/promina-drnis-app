import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';

export const createRateLimit = (options?: Partial<RateLimitOptions>) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    ...options
  });
};