// Vercel serverless entry point - koristi postojeći backend kod
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import postojećih ruta
import authRoutes from './dist/routes/auth.js';
import userRoutes from './dist/routes/users.js';
import memberRoutes from './dist/routes/members.js';
import documentRoutes from './dist/routes/documents.js';
import skillRoutes from './dist/routes/skills.js';
import trainingRoutes from './dist/routes/trainings.js';
import eventRoutes from './dist/routes/events.js';
import reportRoutes from './dist/routes/reports.js';
import dashboardRoutes from './dist/routes/dashboard.js';
import uploadRoutes from './dist/routes/upload.js';
import notificationRoutes from './dist/routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware (koristi postojeće)
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS konfiguracija za Vercel
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://promina-drnis-app.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Health check ruta
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Postojeće API rute
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

// Vercel serverless handler
export default app;
