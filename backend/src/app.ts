import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import config from './config/config.js';

// Import routes
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';

const app: Express = express();

// Basic middleware setup
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: config.cors.origin || 'http://localhost:5173',
    credentials: true,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders
}));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
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
app.use('/api/members', authMiddleware, memberRoutes);
app.use('/api/activities', authMiddleware, activityRoutes);

// API root endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Promina Drnis API',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        endpoints: {
            auth: '/api/auth',
            members: '/api/members',
            activities: '/api/activities'
        }
    });
});

export default app;