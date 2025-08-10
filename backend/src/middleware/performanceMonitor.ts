import { Request, Response, NextFunction } from 'express';

export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const isDev = process.env.NODE_ENV === 'development';
  
  // Log početak zahtjeva
  if (isDev) console.log(`[PERF] START ${req.method} ${req.path} - ${new Date().toISOString()}`);
  
  // Presretni završetak odgovora
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    
    // Log završetak zahtjeva s performansama
    if (isDev) console.log(`[PERF] END ${req.method} ${req.path} - ${duration}ms - Status: ${status}`);
    
    // Upozorenje za spore zahtjeve (>2s)
    if (duration > 2000) {
      if (isDev) console.warn(`[PERF] SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Kritično upozorenje za vrlo spore zahtjeve (>5s)
    if (duration > 5000) {
      console.error(`[PERF] CRITICAL SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};
