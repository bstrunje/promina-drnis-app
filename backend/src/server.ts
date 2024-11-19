// src/server.ts

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

// Route imports
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import swaggerDocs from './config/swagger.js';
import { setupDatabase } from './setupDatabase.js';
import db from './utils/db.js';

// Windows-friendly path resolution
const __dirname = path.resolve();

// Environment types
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            PORT: string;
            DATABASE_URL: string;
            JWT_SECRET: string;
            FRONTEND_URL?: string;
            // Windows-specific path variables
            USERPROFILE: string;
            APPDATA: string;
        }
    }
}

// Load environment variables - Windows path style
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Constants
const DEFAULT_PORT = 3000;

// Express app creation and configuration
const app = express();

// Port configuration with validation
let port = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

// Validate port (avoid PostgreSQL default port)
if (port === 5432) {
    console.warn('⚠️  Warning: Port 5432 is typically used by PostgreSQL. Using default port 3000 instead.');
    port = DEFAULT_PORT;
}

// Windows-style environment logging
console.log('🏃 Current directory:', path.resolve(__dirname));
console.log('📁 Loading .env from:', path.resolve(__dirname, '.env'));
console.log('⚙️  Environment configuration:', {
    PORT: `${port} (Web Server)`,
    DATABASE_URL: process.env.DATABASE_URL ? 'Set (Hidden for security)' : 'Not set',
    JWT_SECRET: process.env.JWT_SECRET ? 'Set (Hidden for security)' : 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'development'
});

// Environment validation with Windows-friendly error messages
if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL is not defined in your .env file');
    console.error('📝 Tip: Make sure your .env file exists in:', path.resolve(__dirname, '.env'));
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('❌ ERROR: JWT_SECRET is not defined in your .env file');
    console.error('📝 Tip: Make sure your .env file exists in:', path.resolve(__dirname, '.env'));
    process.exit(1);
}

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Request logging middleware with formatted timestamps for Windows
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Europe/Zagreb',
        hour12: false 
    });
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Database connection check
async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await db.query('SELECT 1');
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error);
        return false;
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
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
                database: 'disconnected',
                api: 'running'
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

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API root endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Promina Drnis API',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        endpoints: {
            auth: '/api/auth',
            members: '/api/members',
            activities: '/api/activities',
            docs: '/api-docs'
        }
    });
});

// Application root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Mountaineering Association API',
        documentation: '/api-docs',
        apiRoot: '/api',
        environment: process.env.NODE_ENV
    });
});

// Error handling middleware
interface ErrorWithStatus extends Error {
    status?: number;
}

app.use((err: ErrorWithStatus, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Error occurred:', err);
    console.error('📜 Stack trace:', err.stack);
    
    const response = {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
        environment: process.env.NODE_ENV
    };
    
    res.status(err.status || 500).json(response);
});

// Server instance
let server: ReturnType<typeof app.listen>;

// Server management functions
async function startServer(): Promise<void> {
    try {
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            throw new Error('Unable to connect to database');
        }

        await setupDatabase();

        return new Promise((resolve, reject) => {
            server = app.listen(port, () => {
                console.log('\n🚀 Server is running:');
                console.log(`   Local:            http://localhost:${port}`);
                console.log(`   Documentation:    http://localhost:${port}/api-docs`);
                console.log(`   Health Check:     http://localhost:${port}/health`);
                console.log(`   Environment:      ${process.env.NODE_ENV}\n`);
                resolve();
            });

            server.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${port} is already in use. Please try these steps:`);
                    console.error('   1. Check if another instance is running');
                    console.error('   2. Close any application using port ${port}');
                    console.error('   3. Or change the port in your .env file');
                } else {
                    console.error('❌ Failed to start server:', error);
                }
                reject(error);
            });
        });
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        throw error;
    }
}

async function stopServer(): Promise<void> {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                console.log('👋 Server stopped gracefully');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Process handlers with Windows-specific considerations
process.on('SIGTERM', async () => {
    console.log('\n📥 SIGTERM received. Shutting down gracefully...');
    await stopServer();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n📥 SIGINT received. Shutting down gracefully...');
    await stopServer();
    process.exit(0);
});

// Windows-specific error handling
process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error);
    stopServer().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer()
    .catch(error => {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    });

export { app, startServer, stopServer };