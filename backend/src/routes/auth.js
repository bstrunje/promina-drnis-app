// backend/src/routes/auth.js
import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateToken, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.post('/register', authenticateToken, roles.requireAdmin, authController.register);
router.get('/me', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

export default router;