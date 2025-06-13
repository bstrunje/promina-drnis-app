import express, { Request, Response } from 'express';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Member routes
router.post('/:memberId/messages', authMiddleware, memberMessageController.createMessage);
router.get('/:memberId/messages', authMiddleware, memberMessageController.getMemberMessages);
// Dodajemo rutu za članove da mogu označiti poruke kao pročitane
router.put('/:memberId/messages/:messageId/read', authMiddleware, memberMessageController.markMemberMessageAsRead);
// Dodajemo rutu za dohvaćanje broja nepročitanih poruka
router.get('/unread-count', authMiddleware, memberMessageController.getUnreadMessageCount);

export default router;