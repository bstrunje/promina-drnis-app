

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs/promises';
import _config from './config/config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initScheduledTasks } from './utils/scheduledTasks.js';
import { getCurrentDate, formatDate } from './utils/dateUtils.js';
import timezoneService from './services/timezone.service.js';
import permissionsRouter from './routes/permissions.js';
import genericMessagesRouter from './routes/generic.messages.js';

// Import routes
import memberRoutes from './routes/members.js';
import membershipRoutes from './routes/membership.routes.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import auditRoutes from './routes/audit.js';
import adminMessagesRouter from './routes/admin.messages.js';

import stampRoutes from './routes/stamp.js';
import settingsRouter from './routes/settings.js';
import adminRoutes from './routes/admin.routes.js';
import activityRoutes from './routes/activity.routes.js'; // KONAČNI ISPRAVAK
import cardNumberRoutes from './routes/cardnumber.js';
import debugRoutes from './routes/debug.routes.js';
import systemManagerRoutes from './routes/systemManager.js';

import skillRoutes from './routes/skillRoutes.js';

// Import the directory preparation functions
import { prepareDirectories, migrateExistingFiles } from './init/prepareDirectories.js';



// U produkciji nije potrebno koristiti testModeMiddleware
// U razvoju ga uvjetno uključujemo zbog simulacije testnog načina rada
let testModeMiddleware: ((req: Request, res: Response, next: NextFunction) => void) | undefined = undefined;

const app: Express = express();

// Dinamički ESM-safe import middleware-a u development/test okruženju
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    // Ovdje koristimo poboljšanu tipizaciju i fallback
    type MiddlewareModule = {
      testModeMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
      default?: { testModeMiddleware?: (req: Request, res: Response, next: NextFunction) => void };
    };
    const mod = (await import('./middleware/test-mode.middleware.js')) as MiddlewareModule;
    // Logiramo rezultat importa za lakši debug u developmentu
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('test-mode.middleware.js dynamic import result:', mod);
    }
    // Fallback: koristi named export, a ako ne postoji koristi default.testModeMiddleware
    testModeMiddleware = mod.testModeMiddleware || mod.default?.testModeMiddleware;
    if (typeof testModeMiddleware === 'function') {
      app.use(testModeMiddleware);
    } else if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('testModeMiddleware nije pronađen ni kao named ni kao default export.');
    }
  })();
}

// Postavka za ispravno prepoznavanje IP adresa iza proxyja (npr. Vercel, Render)
app.set('trust proxy', 1); // Vjeruj samo prvom (najbližem) proxy poslužitelju

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Basic middleware setup
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Dodano za podršku refresh tokena

// Set up static file serving with better error handling
// Set up static file serving with better error handling
// Prioritize UPLOADS_DIR for persistent storage (e.g., Render Disks)
const uploadsDir = process.env.UPLOADS_DIR || (process.env.NODE_ENV === 'production'
  ? '/app/uploads' // Fallback for legacy or non-disk setups
  : path.resolve(__dirname, '..', 'uploads'));
  
console.log(`Serving static files from: ${uploadsDir}`);

// Replace the static file middleware with a more comprehensive version
app.use('/uploads', (req, res, next) => {
  // Set CORS headers - allow from all origins for images
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  
  // Log CORS headers for debugging
  console.log(`[CORS] Setting headers for ${req.url}`);
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// The rest of the static file middleware can remain the same
app.use('/uploads', async (req, res, next) => {
  const fullPath = path.join(uploadsDir, req.url.split('?')[0]); // Remove query parameters
  console.log(`Static file request: ${req.method} ${req.url}`);
  console.log(`Looking for file at: ${fullPath}`);
  
  try {
    await fs.access(fullPath, fs.constants.F_OK);
    console.log(`File exists: ${fullPath}`);
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
      'https://promina-drnis-api.onrender.com' // Production backend
    ];
    
    // Allow all Vercel preview deployments
    if (
      allowedOrigins.includes(origin) || 
      origin.match(/https:\/\/promina-drnis.*\.vercel\.app/) ||
      origin.endsWith('vercel.app')
    ) {
      console.log(`Origin ${origin} allowed by CORS`);
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
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
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
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
  console.log(`🔍 [DEBUG] Messages route: ${req.method} ${req.path}`);
  console.log(`🔍 [DEBUG] Full URL: ${req.originalUrl}`);
  next();
});

// API Routes - KLJUČNO: /api/messages MORA biti PRIJE /api/members
app.use('/api/auth', authRoutes);
app.use('/api/system-manager', systemManagerRoutes);
app.use('/api/skills', skillRoutes);

// Učitaj dev rute samo u ne-produkcijskom okruženju
if (process.env.NODE_ENV !== 'production') {
  import('./routes/dev.routes.js')
    .then(devRoutesModule => {
      app.use('/dev', devRoutesModule.default);
      console.log('Development routes loaded.');
    })
    .catch(err => {
      console.error('Failed to load development routes:', err);
    });
}

console.log('🔥 REGISTERING /api/messages with adminMessagesRouter');
app.use('/api/messages', authMiddleware, adminMessagesRouter);
app.use('/api/activities', authMiddleware, activityRoutes); // KONAČNI ISPRAVAK
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

// Initialize directories
prepareDirectories();

// Migrate existing files (keep this commented unless needed)
migrateExistingFiles()
  .then(() => console.log('File migration completed'))
  .catch((err: unknown) => console.error('Error during file migration:', err));

// Inicijalizacija vremenske zone iz postavki sustava
timezoneService.initializeTimezone()
  .then(() => console.log('🌐 Vremenska zona uspješno inicijalizirana iz postavki sustava'))
  .catch((err: unknown) => console.error('Greška pri inicijalizaciji vremenske zone:', err));

// Initialize scheduled tasks in production
if (process.env.NODE_ENV === 'production') {
  initScheduledTasks();
  console.log('Scheduled tasks initialized for production environment.');
}

export default app;