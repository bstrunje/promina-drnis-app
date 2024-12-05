// backend/src/routes/auth.ts
import express from 'express';
import { validateRegistration, validateLogin } from '../middleware/validators.js';
import authController from '../controllers/auth.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, authController.registerMember);
router.post('/login', validateLogin, authController.login);
router.get('/search-members', authController.searchMembers);

// Protected admin route for setting member passwords
router.post(
    '/set-password',
    authMiddleware,  // Verify JWT token
    roles.requireAdmin,  // Ensure user is admin
    authController.setMemberPassword
);

export default router;