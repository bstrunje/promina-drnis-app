// backend/src/routes/hours.ts
import express from 'express';
import hoursController from '../controllers/hours.controller.js';
import { authMiddleware as authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, hoursController.getAllHours);

export default router;