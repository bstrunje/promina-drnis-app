import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import config from './config/config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import routes
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import auditRoutes from './routes/audit.js';
import memberMessagesRouter from './routes/member.messages.js';
import adminMessagesRouter from './routes/admin.messages.js';
import sequelize from './types/database.js';  // dodaj .js ekstenziju
import hoursRoutes from './routes/hours.js';
import stampRoutes from './routes/stamp.js';
import settingsRouter from './routes/settings.routes.js';

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

// Konfiguracija za CORS
const corsOptions = {
    origin: [
      'https://promina-drnis-app.vercel.app',    // Production frontend
      'http://localhost:5173',                    // Development frontend
      'http://localhost:3000'                     // Development backend
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
            settings: '/api/settings'
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

export default app;