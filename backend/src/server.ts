// src/server.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import app from './app.js';
import { setupDatabase } from './setupDatabase.js';
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

// Server instance
let server: Server;

// Server management functions
async function startServer(): Promise<void> {
    try {
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            throw new Error('Unable to connect to database');
        }

        // Provjeri i arhiviraj stanje markica ako je zadnji dan u godini
        await scheduledService.checkAndArchiveStamps();
        
        // Periodička provjera za arhiviranje markica (svakih 12 sati)
        // Ovo osigurava da će se arhiviranje izvršiti čak i ako server nije radio točno na kraju godine
        setInterval(async () => {
            await scheduledService.checkAndArchiveStamps();
        }, 12 * 60 * 60 * 1000); // 12 sati u milisekundama

        // Inicijaliziraj periodičke zadatke (uključujući ažuriranje statusa članstva)
        console.log('\n🔔 Pokrećem inicijalizaciju periodičkih zadataka...');
        try {
            // Koristimo setTimeout kako bismo osigurali da se logovi pravilno prikazuju nakon inicijalizacije servera
            setTimeout(() => {
                initScheduledTasks();
                console.log('✅ Periodički zadaci uspješno pokrenuti');
            }, 1000);
        } catch (error) {
            console.error('❌ Greška prilikom inicijalizacije periodičkih zadataka:', error);
        }
        
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
                    console.error(`   2. Close any application using port ${port}`);
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

startPasswordUpdateJob();

// Register routes
app.use('/api/debug', debugRoutes);

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

// Initialize database and start server
async function initialize() {
    try {
        prepareDirectories();

        // Inicijalizacija baze podataka i početnih podataka
        await setupDatabase();

        // Pokreni server
        await startServer();
    } catch (error) {
        console.error('❌ Application startup failed:', error);
        process.exit(1);
    }
}

initialize();

export { app, startServer, stopServer };