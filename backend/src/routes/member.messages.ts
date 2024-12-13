import express from 'express';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Member routes
router.post('/:memberId/messages', authMiddleware, memberMessageController.createMessage);
router.get('/:memberId/messages', authMiddleware, memberMessageController.getMemberMessages);

// Admin/Superuser routes
router.get('/messages/admin', authMiddleware, roles.requireAdmin, memberMessageController.getAdminMessages);
router.put('/messages/:messageId/read', authMiddleware, roles.requireAdmin, memberMessageController.markAsRead);
router.put('/messages/:messageId/archive', authMiddleware, roles.requireAdmin, memberMessageController.archiveMessage);

export default router;