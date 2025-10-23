import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { localeMiddleware } from './middleware/locale.js';
import path from 'path';
import fs from 'fs/promises';
import { getUploadsDir, ensureBaseUploadDirs } from './utils/uploads.js';
import _config from './config/config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initScheduledTasks } from './utils/scheduledTasks.js';
import { getCurrentDate, formatDate } from './utils/dateUtils.js';
import permissionsRouter from './routes/permissions.js';
import genericMessagesRouter from './routes/generic.messages.js';

// Import routes
import memberRoutes from './routes/members.js';
import membershipRoutes from './routes/membership.routes.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { performanceMonitor } from './middleware/performanceMonitor.js';
import { sanitizationMiddleware } from './middleware/sanitization.middleware.js';
import auditRoutes from './routes/audit.js';
import adminMessagesRouter from './routes/admin.messages.js';

import stampRoutes from './routes/stamp.js';
import settingsRouter from './routes/settings.js';
import adminRoutes from './routes/admin.routes.js';
import activityRoutes from './routes/activity.routes.js'; // KONAČNI ISPRAVAK
import cardNumberRoutes from './routes/cardnumber.js';
import debugRoutes from './routes/debug.routes.js';
import systemManagerRoutes from './routes/systemManager.js';
import dutyRoutes from './routes/duty.routes.js';
import supportTicketRoutes from './routes/supportTicket.routes.js';

import skillRoutes from './routes/skillRoutes.js';
import devRoutes from './routes/dev.routes.js'; // Dodano za podršku razvojnim rutama
import orgConfigRoutes from './routes/org-config.routes.js'; // Multi-tenant org config
import pwaRoutes from './routes/pwa.routes.js'; // PWA dynamic manifest
import { tenantMiddleware } from './middleware/tenant.middleware.js'; // Multi-tenant support

// (prepareDirectories, migrateExistingFiles) se više ne koriste



// Dev flag za kontrolu verbose logiranja
const isDev = process.env.NODE_ENV === 'development';

// U produkciji nije potrebno koristiti testModeMiddleware
// U razvoju ga uvjetno uključujemo zbog simulacije testnog načina rada
let testModeMiddleware: ((req: Request, res: Response, next: NextFunction) => void) | undefined = undefined;

const app: Express = express();

// Dinamički ESM-safe import middleware-a u development/test okruženju
if (process.env.NODE_ENV !== 'production') {
  (async () => {
    // Ovdje koristimo poboljšanu tipizaciju i fallback
    type MiddlewareModule = {
      testModeMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
      default?: { testModeMiddleware?: (req: Request, res: Response, next: NextFunction) => void };
    };
    const mod = (await import('./middleware/test-mode.middleware.js')) as MiddlewareModule;
    // Logiramo rezultat importa za lakši debug u developmentu
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('test-mode.middleware.js dynamic import result:', mod);
    }
    // Fallback: koristi named export, a ako ne postoji koristi default.testModeMiddleware
    testModeMiddleware = mod.testModeMiddleware || mod.default?.testModeMiddleware;
    if (typeof testModeMiddleware === 'function') {
      app.use(testModeMiddleware);
    } else if (isDev) {
      console.warn('testModeMiddleware nije pronađen ni kao named ni kao default export.');
    }
  })();
}

// Postavka za ispravno prepoznavanje IP adresa iza proxyja (npr. Vercel)
app.set('trust proxy', 1); // Vjeruj samo prvom (najbližem) proxy poslužitelju

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Basic middleware setup
app.use(helmet());
app.use(compression());
app.use(performanceMonitor); // Performance monitoring za analizu sporih API poziva
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Dodano za podršku refresh tokena

// Set up static file serving (centralizirano)
const uploadsDir = getUploadsDir();
void ensureBaseUploadDirs(); // kreiraj potrebne direktorije ako ne postoje
if (isDev) console.log(`Serving static files from: ${uploadsDir}`);

// Replace the static file middleware with a more comprehensive version
app.use('/uploads', (req, res, next) => {
  // Set CORS headers - allow from all origins for images
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  
  // Log CORS headers for debugging
  if (isDev) console.log(`[CORS] Setting headers for ${req.url}`);
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// The rest of the static file middleware can remain the same
app.use('/uploads', async (req, res, next) => {
  const fullPath = path.join(uploadsDir, req.url.split('?')[0]); // Remove query parameters
  if (isDev) console.log(`Static file request: ${req.method} ${req.url}`);
  if (isDev) console.log(`Looking for file at: ${fullPath}`);
  
  try {
    await fs.access(fullPath, fs.constants.F_OK);
    if (isDev) console.log(`File exists: ${fullPath}`);
    next();
  } catch (err) {
    console.error(`File not found: ${fullPath}`, err);
    res.status(404).send('File not found');
  }
}, express.static(uploadsDir));

// CORS configuration
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://promina-drnis-app.vercel.app',  // Production frontend
      'http://localhost:5173',                 // Development frontend
      'http://localhost:3000',                 // Development backend
      'http://localhost:3001',                 // Development API
    ];
    
    // Allow all Vercel preview deployments
    if (
      allowedOrigins.includes(origin) || 
      origin.match(/https:\/\/promina-drnis.*\.vercel\.app/) ||
      origin.endsWith('vercel.app')
    ) {
      if (isDev) console.log(`Origin ${origin} allowed by CORS`);
      callback(null, true);
    } else {
      if (isDev) console.log(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',    
    'Pragma',           
    'Expires',          
    'X-Test-Mode',      // Dodano za podršku testnog načina rada
    'Cookie'            // Eksplicitno dozvoljavamo Cookie zaglavlje
  ],
  exposedHeaders: ['Set-Cookie'] // Eksplicitno izlažemo Set-Cookie zaglavlje
};

app.use(cors(corsOptions));


// Express middleware za parsanje JSON-a s UTF-8 kodiranjem
app.use(express.json({ 
  limit: '10mb',
  verify: (_req, _res, buf, _encoding) => {
    // Provjera UTF-8 kompatibilnosti
    if (buf && buf.length) {
      try {
        const text = buf.toString('utf8');
        JSON.parse(text);
      } catch (e) {
        console.error('JSON parsing error - potential encoding issue:', e);
      }
    }
  }
}));

// Eksplicitno postavljamo standard za parsiranje URL-encoded podataka s UTF-8 kodiranjem
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 50000
}));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = getCurrentDate().toLocaleString('en-US', { 
    timeZone: 'Europe/Zagreb',
    hour12: false 
  });
  if (isDev) console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Osiguravanje ispravnog kodiranja za ulazne i izlazne podatke
app.use((req, res, next) => {
  // Postaviti charset za ulazne podatke
  if (req.headers['content-type']) {
    if (!req.headers['content-type'].includes('charset=utf-8')) {
      req.headers['content-type'] = req.headers['content-type'] + '; charset=utf-8';
    }
  }
  
  // Postaviti charset za izlazne podatke
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Postaviti Collation za ispravno sortiranje hrvatskih znakova
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: formatDate(getCurrentDate(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
      services: {
        api: 'running'
      },
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      status: 'unhealthy',
      timestamp: formatDate(getCurrentDate(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''),
      services: {
        api: 'error'
      },
      error: err.message,
      environment: process.env.NODE_ENV
    });
  }
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Promina Drnis API',
    documentation: '/api',
    health: '/health'
  });
});

// Debug middleware za /api/messages
app.use('/api/messages', (req, res, next) => {
  if (isDev) console.log(`🔍 [DEBUG] Messages route: ${req.method} ${req.path}`);
  if (isDev) console.log(`🔍 [DEBUG] Full URL: ${req.originalUrl}`);
  next();
});

// API Routes - KLJUČNO: /api/messages MORA biti PRIJE /api/members
// TENANT MIDDLEWARE - Mora biti PRIJE svih API ruta za multi-tenant support

// 🔧 SYSTEM MANAGER rute definiramo PRIJE tenant middleware-a
// jer Global System Manager ne treba tenant context (može kreirati organizacije)
app.use('/api/system-manager', systemManagerRoutes);

// 🔧 SUPPORT rute također PRIJE tenant middleware-a
// jer GSM (Global System Manager) ne treba tenant context za support tickete
app.use('/api/support', supportTicketRoutes); // Support & Feedback system

// TENANT MIDDLEWARE - Globalni tenant context za sve API pozive
app.use('/api', tenantMiddleware); // Globalni tenant context za sve API pozive

// LOCALE MIDDLEWARE - Mora biti NAKON tenantMiddleware jer koristi req.organization.default_language
app.use('/api', localeMiddleware); // Multi-tenant language detection

// SANITIZATION MIDDLEWARE - Automatski sanitizira member podatke u svim response-ovima
// Mora biti NAKON locale/tenant middleware, ali PRIJE routes
app.use(sanitizationMiddleware);

// Public routes (bez authMiddleware)
app.use('/api', orgConfigRoutes); // Public org config endpoints
app.use('/api', pwaRoutes); // PWA dynamic manifest (needs tenant context)

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/messages', authMiddleware, adminMessagesRouter);
app.use('/api/activities', authMiddleware, activityRoutes); // KONAČNI ISPRAVAK
app.use('/api/duty', dutyRoutes); // Duty Calendar routes
app.use('/api/audit', authMiddleware, auditRoutes);
// ISPRAVAK REDOSLIJEDA: Specifične rute moraju ići prije općenitih
app.use('/api/members/permissions', permissionsRouter);
app.use('/api/members', authMiddleware, memberRoutes);
app.use('/api/members/:memberId', authMiddleware, membershipRoutes);
app.use('/api/stamps', stampRoutes);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/card-numbers', cardNumberRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/generic-messages', authMiddleware, genericMessagesRouter);
app.use('/api/skills', skillRoutes);

// Mount dev routes only in development or when explicitly enabled
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_ROUTES === 'true') {
  if (isDev) console.log('Mounting /api/dev (development dev routes enabled)');
  app.use('/api/dev', devRoutes);
}

// API root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Promina Drnis API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    endpoints: {
      auth: '/api/auth',
      members: '/api/members',
      activities: '/api/activities',
      audit: '/api/audit',
      messages: {
        member: '/api/members/:memberId/messages',
        admin: '/api/messages'
      },
      settings: '/api/settings',
      'system-manager': '/api/system-manager',
      debug: '/api/debug'
    }
  });
});

// Error handling middleware
app.use((_err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error occurred:', _err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? _err.message : 'An unexpected error occurred',
    environment: process.env.NODE_ENV,
    stack: process.env.NODE_ENV === 'development' ? _err.stack : undefined
  });
});

// Inicijalizacijske skripte (prepareDirectories, migrateExistingFiles, timezoneService.initializeTimezone)
// su premještene u Docker entrypoint ili se više ne koriste.
// Server sada samo pokreće aplikaciju.

// Initialize scheduled tasks in production
if (process.env.NODE_ENV === 'production') {
  initScheduledTasks();
  if (isDev) console.log('Scheduled tasks initialized for production environment.');
}

export default app;