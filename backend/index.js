// Vercel serverless entry point - direktno koristi Express app
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';

// Import postojećih ruta iz dist direktorija
import authRoutes from './dist/routes/auth.js';
import userRoutes from './dist/routes/users.js';
import memberRoutes from './dist/routes/members.js';
import documentRoutes from './dist/routes/documents.js';
import skillRoutes from './dist/routes/skillRoutes.js';
import trainingRoutes from './dist/routes/trainings.js';
import eventRoutes from './dist/routes/events.js';
import reportRoutes from './dist/routes/reports.js';
import dashboardRoutes from './dist/routes/dashboard.js';
import uploadRoutes from './dist/routes/upload.js';
import notificationRoutes from './dist/routes/notifications.js';

// Kreiraj novu Express aplikaciju za serverless
const app = express();

// Middleware za serverless okruženje
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS za Vercel
const corsOptions = {
  origin: [
    'https://promina-drnis-app.vercel.app',
    'https://promina-drnis-app-git-main-bstrunje.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Health check ruta za testiranje
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// API rute
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Root ruta za testiranje
app.get('/', (req, res) => {
  res.json({ message: 'Promina Drnis Backend - Serverless' });
});

// Vercel serverless handler
export default app;
