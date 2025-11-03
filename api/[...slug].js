// OPTIMIZIRANI Vercel serverless handler za sve API rute
// CommonJS stil kompatibilan s Vercel build procesom

let app;
let appInitialized = false;
const isProd = process.env.NODE_ENV === 'production';

module.exports = async function handler(req, res) {
  try {
    // Timeout za cjelokupni zahtjev (10 sekundi, ostavljamo buffer za Vercel)
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`[TIMEOUT] Zahtjev ${req.method} ${req.url} timeout nakon 10 sekundi`);
        res.status(504).json({ 
          error: 'Request timeout', 
          message: 'Zahtjev je trajao predugo. Molimo pokušajte ponovo.',
          suggestion: 'Pokušajte smanjiti količinu podataka ili osvježite stranicu.',
          timeout: '10s'
        });
      }
    }, 10000);

    // Inicijalizacija Express app-a samo jednom
    if (!appInitialized) {
      if (!isProd) console.log('[HANDLER] Inicijalizacija Express app-a...');
      const startTime = Date.now();
      
      // Debug: Ispišemo strukturu direktorija
      const fs = require('fs');
      const path = require('path');
      
      if (!isProd) console.log('[DEBUG] Current working directory:', process.cwd());
      if (!isProd) console.log('[DEBUG] __dirname equivalent:', __dirname);
      
      try {
        const currentDir = process.cwd();
        const files = fs.readdirSync(currentDir);
        if (!isProd) console.log('[DEBUG] Files in current directory:', files);
        
        // Provjeri postoji li backend direktorij
        if (files.includes('backend')) {
          const backendFiles = fs.readdirSync(path.join(currentDir, 'backend'));
          if (!isProd) console.log('[DEBUG] Files in backend directory:', backendFiles);
          
          if (backendFiles.includes('dist')) {
            const distFiles = fs.readdirSync(path.join(currentDir, 'backend', 'dist'));
            if (!isProd) console.log('[DEBUG] Files in backend/dist directory:', distFiles);
          }
        }
      } catch (debugError) {
        if (!isProd) console.log('[DEBUG] Error reading directory structure:', debugError.message);
      }
      
      // Dynamic import za ES Module - ispravka putanje za Vercel
      // Pokušaj s različitim putanjama ovisno o Vercel strukturi
      let appModule;
      try {
        // Prvo pokušaj s ispravnom putanjom (src poddirektorij)
        appModule = await import('./backend/dist/src/app.js');
        if (!isProd) console.log('[HANDLER] Uspješno učitan app.js iz ./backend/dist/src/app.js');
      } catch (error1) {
        if (!isProd) console.log('[HANDLER] Pokušavam alternativnu putanju ../backend/dist/src/app.js...');
        try {
          // Alternativna putanja s src
          appModule = await import('../backend/dist/src/app.js');
          if (!isProd) console.log('[HANDLER] Uspješno učitan app.js iz ../backend/dist/src/app.js');
        } catch (error2) {
          if (!isProd) console.log('[HANDLER] Pokušavam staru putanju ./backend/dist/app.js...');
          try {
            // Stara putanja bez src
            appModule = await import('./backend/dist/app.js');
            if (!isProd) console.log('[HANDLER] Uspješno učitan app.js iz ./backend/dist/app.js');
          } catch (error3) {
            if (!isProd) console.log('[HANDLER] Pokušavam direktnu putanju ./app.js...');
            // Direktna putanja ako je app.js u root-u
            appModule = await import('./app.js');
            if (!isProd) console.log('[HANDLER] Uspješno učitan app.js iz ./app.js');
          }
        }
      }
      app = appModule.default;
      appInitialized = true;
      
      const duration = Date.now() - startTime;
      if (!isProd) console.log(`[HANDLER] Express app inicijaliziran u ${duration}ms`);
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
