import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import config from './config/config.js';

// Import routes
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import auditRoutes from './routes/audit.js';
import memberMessagesRouter from './routes/member.messages.js';
import adminMessagesRouter from './routes/admin.messages.js';
import sequelize from './types/database';
import hoursRoutes from './routes/hours';
import stampRoutes from './routes/stamp.js';
import settingsRouter from './routes/settings.routes.js';

const app: Express = express();

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
const allowedOrigins = [
  'http://localhost:5173', 
  'https://frontend-xi-six-19.vercel.app', 
  'https://promina-drnis-backend.herokuapp.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Europe/Zagreb',
        hour12: false 
    });
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Serve static files from the React frontend app
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));
}

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
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

// Catch-all route za serviranje React app-a u produkciji
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
}

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