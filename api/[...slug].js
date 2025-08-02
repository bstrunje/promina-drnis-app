// OPTIMIZIRANI Vercel serverless handler za sve API rute
// ESM stil s timeout handling-om za serverless okruženje

let app;
let appInitialized = false;

export default async function handler(req, res) {
  try {
    // Timeout za cjelokupni zahtjev (8 sekundi, ostavljamo 2s buffer za Vercel)
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`[TIMEOUT] Zahtjev ${req.method} ${req.url} timeout nakon 8 sekundi`);
        res.status(504).json({ 
          error: 'Request timeout', 
          message: 'Zahtjev je prekoračio vremensko ograničenje' 
        });
      }
    }, 8000);

    // Inicijalizacija Express app-a samo jednom
    if (!appInitialized) {
      console.log('[HANDLER] Inicijalizacija Express app-a...');
      const startTime = Date.now();
      
      // Dynamic import za ES Module
      const appModule = await import('../backend/dist/app.js');
      app = appModule.default;
      appInitialized = true;
      
      const duration = Date.now() - startTime;
      console.log(`[HANDLER] Express app inicijaliziran u ${duration}ms`);
    }

    // Preusmjeri na Express app
    const result = await app(req, res);
    
    // Očisti timeout ako je zahtjev završen
    clearTimeout(timeoutId);
    
    return result;
    
  } catch (error) {
    console.error('[HANDLER] Greška u serverless handler-u:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Greška u obradi zahtjeva'
      });
    }
  }
}
