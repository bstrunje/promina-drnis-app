import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs/promises';
import config from './config/config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initScheduledTasks } from './utils/scheduledTasks.js';

// Import routes
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import auditRoutes from './routes/audit.js';
import memberMessagesRouter from './routes/member.messages.js';
import adminMessagesRouter from './routes/admin.messages.js';
import sequelize from './types/database.js';
import hoursRoutes from './routes/hours.js';
import stampRoutes from './routes/stamp.js';
import settingsRouter from './routes/settings.js';
import adminRoutes from './routes/admin.routes.js';
import cardNumberRoutes from './routes/cardnumber.js';
import debugRoutes from './routes/debug.routes.js';

// Import the directory preparation functions
import { prepareDirectories, migrateExistingFiles } from './init/prepareDirectories.js';

const app: Express = express();

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connected...'))
  .catch((err: any) => console.log('Error: ' + err));

// Sync database
sequelize.sync()
  .then(() => console.log('Database synced...'))
  .catch((err: any) => console.log('Error: ' + err));

// Basic middleware setup
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up static file serving with better error handling
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/app/uploads'
  : path.resolve(__dirname, '..', 'uploads');
  
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
      'http://localhost:3000'                  // Development backend
    ];
    
    // Allow all Vercel preview deployments
    if (
      allowedOrigins.includes(origin) || 
      origin.match(/https:\/\/promina-drnis.*\.vercel\.app/) ||
      origin.endsWith('vercel.app')
    ) {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',    // Add this
    'Pragma',           // Add this
    'Expires'           // Add this
  ]
};

app.use(cors(corsOptions));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'Europe/Zagreb',
    hour12: false 
  });
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running'
      },
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', authMiddleware, activityRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/members', authMiddleware, memberMessagesRouter); // Register member messages routes
app.use('/api/messages', authMiddleware, adminMessagesRouter); // Register admin messages routes
app.use('/api/hours', hoursRoutes);
app.use('/api/stamps', stampRoutes);
app.use('/api/members', authMiddleware, memberRoutes);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/card-numbers', cardNumberRoutes);
app.use('/api/debug', debugRoutes); // Register debug routes

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
      settings: '/api/settings',
      debug: '/api/debug'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error occurred:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    environment: process.env.NODE_ENV,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Initialize directories
prepareDirectories();

// Migrate existing files (keep this commented unless needed)
migrateExistingFiles()
  .then(() => console.log('File migration completed'))
  .catch(err => console.error('Error during file migration:', err));

// Initialize scheduled tasks in production
if (process.env.NODE_ENV === 'production') {
  initScheduledTasks();
  console.log('Scheduled tasks initialized for production environment.');
}

export default app;