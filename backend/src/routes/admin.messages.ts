import express from 'express';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin/Superuser routes
router.get('/admin', authMiddleware, roles.requireAdmin, memberMessageController.getAdminMessages);
router.put('/:messageId/read', authMiddleware, roles.requireAdmin, memberMessageController.markAsRead);
router.put('/:messageId/archive', authMiddleware, roles.requireAdmin, memberMessageController.archiveMessage);

export default router;
