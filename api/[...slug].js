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
      
      // Debug: Ispišemo strukturu direktorija
      const fs = await import('fs');
      const path = await import('path');
      
      console.log('[DEBUG] Current working directory:', process.cwd());
      console.log('[DEBUG] __dirname equivalent:', import.meta.url);
      
      try {
        const currentDir = process.cwd();
        const files = fs.default.readdirSync(currentDir);
        console.log('[DEBUG] Files in current directory:', files);
        
        // Provjeri postoji li backend direktorij
        if (files.includes('backend')) {
          const backendFiles = fs.default.readdirSync(path.default.join(currentDir, 'backend'));
          console.log('[DEBUG] Files in backend directory:', backendFiles);
          
          if (backendFiles.includes('dist')) {
            const distFiles = fs.default.readdirSync(path.default.join(currentDir, 'backend', 'dist'));
            console.log('[DEBUG] Files in backend/dist directory:', distFiles);
          }
        }
      } catch (debugError) {
        console.log('[DEBUG] Error reading directory structure:', debugError.message);
      }
      
      // Dynamic import za ES Module - ispravka putanje za Vercel
      // Pokušaj s različitim putanjama ovisno o Vercel strukturi
      let appModule;
      try {
        // Prvo pokušaj s relativnom putanjom
        appModule = await import('./backend/dist/app.js');
      } catch (error1) {
        console.log('[HANDLER] Pokušavam alternativnu putanju...');
        try {
          // Alternativna putanja
          appModule = await import('../backend/dist/app.js');
        } catch (error2) {
          console.log('[HANDLER] Pokušavam direktnu putanju...');
          try {
            // Direktna putanja ako je app.js u root-u
            appModule = await import('./app.js');
          } catch (error3) {
            console.log('[HANDLER] Pokušavam backend/dist/src/app.js...');
            // Možda je u src poddirektoriju
            appModule = await import('./backend/dist/src/app.js');
          }
        }
      }
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
