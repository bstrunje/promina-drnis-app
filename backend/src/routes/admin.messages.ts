import express, { Request, Response, NextFunction } from 'express';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin/Superuser routes za pregled poruka članova
router.get('/admin', authMiddleware, roles.requireAdmin, memberMessageController.getAdminMessages);
router.put('/:messageId/read', authMiddleware, roles.requireAdmin, memberMessageController.markAsRead);
router.put('/:messageId/archive', authMiddleware, roles.requireAdmin, memberMessageController.archiveMessage);
router.delete('/:messageId', authMiddleware, roles.requireSuperUser, memberMessageController.deleteMessage);
router.delete('/', authMiddleware, roles.requireSuperUser, memberMessageController.deleteAllMessages);

// Nove rute za slanje poruka od strane admina prema članovima
router.post('/member/:memberId', authMiddleware, roles.requireAdmin, memberMessageController.sendMessageToMember);
router.post('/group', authMiddleware, roles.requireAdmin, memberMessageController.sendMessageToMembers);
router.post('/all', authMiddleware, roles.requireAdmin, memberMessageController.sendMessageToAll);

// Pregled poruka koje je admin poslao
router.get('/sent', authMiddleware, roles.requireAdmin, memberMessageController.getMessagesSentByAdmin);

export default router;
