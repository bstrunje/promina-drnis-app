/**
 * @fileOverview This file contains the main server setup and configuration.
 */

/**
 * Module dependencies.
 * @private
 */
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import authRoutes from './routes/auth.js';
import authMiddleware from './middleware/authMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocs from './config/swagger.js';
import { setupDatabase } from './setupDatabase.js';
import db from './utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * Create Express server.
 */
const app = express();

/**
 * Express configuration.
 * Ensure we're using a proper port for the web server (not the database port)
 */
const DEFAULT_PORT = 3000;
const port = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;

// Validate port
if (port === 5432) {
  console.warn('Warning: Port 5432 is typically used by PostgreSQL. Using default port 3000 instead.');
  port = DEFAULT_PORT;
}

// Debugging logs with enhanced validation
console.log('Current directory:', __dirname);
console.log('Loading .env from:', resolve(__dirname, '../.env'));
console.log('Environment configuration:', {
  PORT: `${port} (Web Server)`,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set (Hidden for security)' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set (Hidden for security)' : 'Not set'
});

// Environment validation
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not defined. Please check your .env file');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not defined. Please check your .env file');
  process.exit(1);
}

/**
 * Middleware to parse JSON bodies and enable CORS.
 */
app.use(express.json());
app.use(cors());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint - moved outside of error handler
 */
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'connected',
        api: 'running'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      services: {
        database: 'disconnected',
        api: 'running'
      },
      error: error.message
    });
  }
});

/**
 * Primary app routes.
 */
app.use('/api/auth', authRoutes);
app.use('/api/members', authMiddleware, memberRoutes);
app.use('/api/activities', authMiddleware, activityRoutes);

/**
 * Swagger UI setup.
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * API root endpoint
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Promina Drnis API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      members: '/api/members',
      activities: '/api/activities'
    }
  });
});

/**
 * Application root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Mountaineering Association API',
    documentation: '/api-docs',
    apiRoot: '/api'
  });
});

/**
 * Enhanced error handling middleware.
 */
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  console.error('Stack trace:', err.stack);
  
  const response = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  };
  
  res.status(500).json(response);
});

let server;

/**
 * Start Express server.
 */
async function startServer() {
  try {
    await setupDatabase();
    return new Promise((resolve, reject) => {
      server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        console.log(`API Documentation available at http://localhost:${port}/api-docs`);
        resolve();
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use. Please choose a different port.`);
        } else {
          console.error('Failed to start server:', error);
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error('Failed to set up database:', error);
    throw error;
  }
}

/**
 * Stop Express server.
 */
async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await stopServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await stopServer();
  process.exit(0);
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  stopServer().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer()
  .catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });

export { app, startServer, stopServer };