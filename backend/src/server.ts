// src/server.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import app from './app.js';
import config from './config/config.js';
import { prepareDirectories } from './init/prepareDirectories.js';
import { startPasswordUpdateJob } from './jobs/passwordUpdateJob.js';
import debugRoutes from './routes/debug.js';

// import { runAllMigrations } from './runMigrations.js';
import scheduledService from './services/scheduled.service.js';
import { initScheduledTasks } from './utils/scheduledTasks.js';
import prisma from './utils/prisma.js';

// Windows-friendly path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - Windows path style
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Constants
const DEFAULT_PORT = 3000;

// Port configuration with validation
let port = parseInt(process.env.PORT || '3000');

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
    // Diagnostic log for Vercel
    PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL ? 
        `Set (Host: ${process.env.PRISMA_DATABASE_URL.split('@')[1]?.split(':')[0]}, SSL: ${new URL(process.env.PRISMA_DATABASE_URL).searchParams.get('sslmode')})` : 
        'Not set',
    JWT_SECRET: process.env.JWT_SECRET ? 'Set (Hidden for security)' : 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'development'
});

// Environment validation with Windows-friendly error messages
if (!process.env.DATABASE_URL && !process.env.PRISMA_DATABASE_URL) {
    console.error('❌ ERROR: A database connection string is not defined.');
    console.error('📝 Tip: Please set either DATABASE_URL or PRISMA_DATABASE_URL in your environment variables.');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('❌ ERROR: JWT_SECRET is not defined in environment variables.');
    console.error('📝 Tip: Please set JWT_SECRET in your environment variables.');
    process.exit(1);
}

const JWT_SECRET: string = process.env.JWT_SECRET;
export { JWT_SECRET };

// Database connection check
async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error);
        return false;
    }
}

// Register routes
app.use('/api/debug', debugRoutes);

// Inicijalizacija periodičkih zadataka
startPasswordUpdateJob();
initScheduledTasks();

// Pokretanje servera
const server = app.listen(port, () => {
    console.log(`\n🚀 Server is running on port ${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Health Check: http://localhost:${port}/health`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    console.log(`\n📥 ${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('👋 Server stopped.');
        prisma.$disconnect().then(() => {
            console.log('🔗 Database connection closed.');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

export { app };